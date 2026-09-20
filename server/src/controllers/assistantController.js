import { answerFarmQuery, isAiAvailable } from '../services/aiService.js';
import { buildAssistantContext } from '../services/assistantContextService.js';

export async function query(req, res, next) {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const contextText = await buildAssistantContext(req.user);

    if (!isAiAvailable()) {
      return res.status(200).json({
        answer:
          "The AI assistant needs ANTHROPIC_API_KEY configured to answer free-form questions. " +
          "Here's your raw account data instead:\n\n" + contextText,
        aiPowered: false,
      });
    }

    const answer = await answerFarmQuery(question, contextText);
    res.json({ answer, aiPowered: true });
  } catch (err) {
    next(err);
  }
}
