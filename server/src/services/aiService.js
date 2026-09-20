import Anthropic from '@anthropic-ai/sdk';

export const REPORT_CATEGORIES = [
  'irrigation',
  'pest',
  'disease',
  'equipment',
  'weather_damage',
  'soil',
  'other',
];
export const REPORT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export function isAiAvailable() {
  return client !== null;
}

const CLASSIFY_SYSTEM_PROMPT = `You triage field issue reports for a farm management app.
Given a farmer's free-text report, classify it and respond with ONLY a JSON object
(no markdown, no prose) matching this exact shape:

{
  "category": one of ${JSON.stringify(REPORT_CATEGORIES)},
  "severity": one of ${JSON.stringify(REPORT_SEVERITIES)},
  "location": a short location phrase extracted from the text, or null if none is mentioned
}

Severity guidance: "critical" means immediate crop/life-safety risk (e.g. major flooding,
structural collapse), "high" means urgent action needed within a day, "medium" means
should be addressed this week, "low" means minor/cosmetic.`;

// Simple keyword fallback used when no API key is configured or the API call fails,
// so report submission still works offline / without billing.
function ruleBasedClassify(description) {
  const text = description.toLowerCase();

  let category = 'other';
  if (/(pipe|drip|sprinkler|borewell|canal|irrigat|water\s?log|flood)/.test(text)) category = 'irrigation';
  else if (/(pest|insect|locust|rodent|worm)/.test(text)) category = 'pest';
  else if (/(disease|fungus|blight|rot|wilt|infect)/.test(text)) category = 'disease';
  else if (/(tractor|pump|machine|equipment|tool|fence)/.test(text)) category = 'equipment';
  else if (/(storm|hail|drought|frost|heatwave|cyclone|rain damage)/.test(text)) category = 'weather_damage';
  else if (/(soil|erosion|salin|nutrient|ph level)/.test(text)) category = 'soil';

  let severity = 'medium';
  if (/(urgent|emergency|critical|collapsed|severe|major|dying|dead crop)/.test(text)) severity = 'critical';
  else if (/(broken|damaged|flooding|spreading|worsening)/.test(text)) severity = 'high';
  else if (/(minor|small|slight|cosmetic)/.test(text)) severity = 'low';

  const locationMatch = text.match(/(?:near|at|in)\s+([a-z0-9 ,]+?)(?:\.|,|$)/i);

  return {
    category,
    severity,
    location: locationMatch ? locationMatch[1].trim() : null,
  };
}

export async function classifyFieldReport(description) {
  if (!client) {
    return ruleBasedClassify(description);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 256,
      output_config: { effort: 'low' },
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: description }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return ruleBasedClassify(description);

    const parsed = JSON.parse(textBlock.text);
    if (!REPORT_CATEGORIES.includes(parsed.category) || !REPORT_SEVERITIES.includes(parsed.severity)) {
      return ruleBasedClassify(description);
    }

    return {
      category: parsed.category,
      severity: parsed.severity,
      location: parsed.location || null,
    };
  } catch (err) {
    console.error('AI classification failed, falling back to rule-based classifier:', err.message);
    return ruleBasedClassify(description);
  }
}

const ASSISTANT_SYSTEM_PROMPT = `You are a farm assistant answering a user's question about their own
AgriConnect account. You are given their farm data as context below. Answer ONLY using that data -
if the data doesn't contain the answer, say so plainly instead of guessing or inventing numbers.
Keep answers concise (a few sentences, or a short list). Do not repeat the raw data verbatim; interpret it.`;

export async function answerFarmQuery(question, contextText) {
  if (!client) {
    throw new Error('AI assistant unavailable: ANTHROPIC_API_KEY is not configured');
  }

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: `${ASSISTANT_SYSTEM_PROMPT}\n\n--- Account data ---\n${contextText}`,
    messages: [{ role: 'user', content: question }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock ? textBlock.text : "I couldn't generate an answer for that.";
}
