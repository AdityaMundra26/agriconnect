import Anthropic from '@anthropic-ai/sdk';

export const REPORT_CATEGORIES = ['irrigation', 'pest', 'disease', 'equipment', 'weather_damage', 'soil', 'other'];
export const REPORT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const MODEL = 'claude-opus-5-5';
// Server-side refusal fallback: if the model declines, the API re-runs the
// request on a fallback model inside the same call.
const FALLBACK_OPTIONS = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export function isAiAvailable() {
  return client !== null;
}

function firstText(response) {
  if (response.stop_reason === 'refusal') return null;
  const block = response.content.find((b) => b.type === 'text');
  return block ? block.text : null;
}

// ---------------------------------------------------------------------------
// Field report classification
// ---------------------------------------------------------------------------

const CLASSIFY_SYSTEM_PROMPT = `You triage field issue reports for a farm management app used by Indian farmers.
Classify the farmer's free-text report.

Severity guidance: "critical" means immediate crop/life-safety risk (e.g. major flooding,
structural collapse, a fast-spreading outbreak), "high" means urgent action needed within a day,
"medium" means it should be addressed this week, "low" means minor/cosmetic.
For location, extract a short phrase naming where the issue is (e.g. "near plot 2", "east field"),
or null if none is mentioned.`;

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: REPORT_CATEGORIES },
    severity: { type: 'string', enum: REPORT_SEVERITIES },
    location: { type: ['string', 'null'] },
  },
  required: ['category', 'severity', 'location'],
  additionalProperties: false,
};

// Keyword fallback used when no API key is configured or the API call fails,
// so report submission still works offline / without billing.
export function ruleBasedClassify(description) {
  const text = description.toLowerCase();

  let category = 'other';
  if (/(pipe|drip|sprinkler|borewell|canal|irrigat|water\s?log|flood|leak)/.test(text)) category = 'irrigation';
  else if (/(pest|insect|locust|rodent|worm|aphid|caterpillar|bug|termite)/.test(text)) category = 'pest';
  else if (/(disease|fungus|fungal|blight|rot|wilt|infect|mildew|rust|yellow(ing)? leaves|spots)/.test(text)) category = 'disease';
  else if (/(tractor|pump|motor|machine|equipment|tool|fence|harvester)/.test(text)) category = 'equipment';
  else if (/(storm|hail|drought|frost|heatwave|heat wave|cyclone|rain damage|lightning|wind)/.test(text)) category = 'weather_damage';
  else if (/(soil|erosion|salin|nutrient|ph level|compaction)/.test(text)) category = 'soil';

  let severity = 'medium';
  if (/(urgent|emergency|critical|collapsed|severe|major|dying|dead crop|entire|whole field)/.test(text)) severity = 'critical';
  else if (/(broken|damaged|flooding|spreading|worsening|burst|not working)/.test(text)) severity = 'high';
  else if (/(minor|small|slight|cosmetic|little)/.test(text)) severity = 'low';

  // Prefer the most location-like preposition ("near the gate" over "on the crop").
  let location = null;
  // "on" only counts with "the" ("on the slope" is a place; "on tomato leaves" isn't).
  for (const prep of ['near', 'at', 'in', 'on']) {
    const article = prep === 'on' ? 'the\\s+' : '(?:the\\s+)?';
    const re = new RegExp(`\\b${prep}\\s+(${article}[a-z0-9 -]{2,40}?)(?=[.,;!]|\\s+(?:and|is|are|has|was|near|at|looks)\\b|$)`, 'i');
    const m = description.match(re);
    if (m) { location = m[1].trim(); break; }
  }

  return {
    category,
    severity,
    location,
    aiClassified: false,
  };
}

export async function classifyFieldReport(description) {
  if (!client) return ruleBasedClassify(description);

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: description }],
      ...FALLBACK_OPTIONS,
    });

    const text = firstText(response);
    if (!text) return ruleBasedClassify(description);

    const parsed = JSON.parse(text);
    if (!REPORT_CATEGORIES.includes(parsed.category) || !REPORT_SEVERITIES.includes(parsed.severity)) {
      return ruleBasedClassify(description);
    }
    return {
      category: parsed.category,
      severity: parsed.severity,
      location: parsed.location || null,
      aiClassified: true,
    };
  } catch (err) {
    console.error('AI classification failed, falling back to rule-based classifier:', err.message);
    return ruleBasedClassify(description);
  }
}

// ---------------------------------------------------------------------------
// Grounded assistant
// ---------------------------------------------------------------------------

const ASSISTANT_SYSTEM_PROMPT = `You are AgriConnect's farm assistant. You answer a user's questions about their own
AgriConnect account using ONLY the account data given below. If the data doesn't contain the answer,
say so plainly instead of guessing or inventing numbers. You may add brief, practical, general farming
advice when the user asks for it, but clearly separate it from facts about their account.
Keep answers concise: a few sentences or a short bulleted list. Use ₹ for money.`;

// history: [{ role: 'user' | 'assistant', text }] from earlier in the chat
export async function answerFarmQuery(question, contextText, history = []) {
  if (!client) throw new Error('AI assistant unavailable: ANTHROPIC_API_KEY is not configured');

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: question },
  ];

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low' },
    system: `${ASSISTANT_SYSTEM_PROMPT}\n\n--- Account data ---\n${contextText}`,
    messages,
    ...FALLBACK_OPTIONS,
  });

  if (response.stop_reason === 'refusal') {
    return "Sorry, I can't help with that request. Try asking about your farm, orders, listings or reports.";
  }
  return firstText(response) || "I couldn't generate an answer for that.";
}
