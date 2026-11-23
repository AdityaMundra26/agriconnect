import { answerFarmQuery, isAiAvailable } from '../services/aiService.js';
import { loadAssistantData, buildContextText, offlineAnswer } from '../services/assistantContextService.js';
import { findUserById } from '../models/userModel.js';

const MAX_QUESTION = 1000;
const MAX_HISTORY = 8;

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));
}

export async function query(req, res, next) {
  try {
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'question is required' });
    if (question.length > MAX_QUESTION) {
      return res.status(400).json({ error: `question must be under ${MAX_QUESTION} characters` });
    }

    const user = (await findUserById(req.user.id)) || req.user;
    const data = await loadAssistantData(user);

    if (isAiAvailable()) {
      try {
        // The API requires the conversation to start with a user turn.
        let history = sanitizeHistory(req.body.history);
        while (history.length && history[0].role !== 'user') history = history.slice(1);
        const answer = await answerFarmQuery(question, buildContextText(data), history);
        return res.json({ answer, aiPowered: true });
      } catch (err) {
        console.error('AI assistant failed, using offline answer:', err.message);
      }
    }

    res.json({ answer: offlineAnswer(question, data), aiPowered: false });
  } catch (err) {
    next(err);
  }
}
