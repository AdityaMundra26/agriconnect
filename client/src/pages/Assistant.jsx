import { useState } from 'react';
import { askAssistant } from '../api/assistant.js';

export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setError('');
    setAsking(true);
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setQuestion('');

    try {
      const { answer, aiPowered } = await askAssistant(q);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer, aiPowered }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reach the assistant');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="page">
      <h1>AI Assistant</h1>
      <p className="hint">Ask a question about your own farm, listings, orders, or reports.</p>
      {error && <p className="error">{error}</p>}

      <div className="card chat-log">
        {messages.length === 0 ? (
          <p className="hint">No messages yet — try "What issues have I reported?" or "How is my marketplace activity?"</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              <strong>{m.role === 'user' ? 'You' : 'Assistant'}</strong>
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
              {m.role === 'assistant' && m.aiPowered === false && (
                <p className="hint">(fallback mode — no AI key configured)</p>
              )}
            </div>
          ))
        )}
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <label>
          Your question
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Is my North Field under-watered?"
          />
        </label>
        <button type="submit" disabled={asking || !question.trim()}>
          {asking ? 'Asking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
