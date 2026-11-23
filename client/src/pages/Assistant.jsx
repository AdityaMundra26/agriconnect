import { Fragment, useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, RotateCcw, Info } from 'lucide-react';
import { askAssistant } from '../api/assistant.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Avatar, Badge } from '../components/ui.jsx';
import { errorMessage } from '../utils/format.js';

const SUGGESTIONS = {
  farmer: ['How are my sales doing?', 'What crops should I sow this season?', 'Which field issues are still open?', 'Summarise my farm and plots'],
  buyer: ['How much have I spent so far?', 'Which of my orders are still in progress?', 'Summarise my recent orders'],
};

// Minimal, safe formatting: **bold** and "- " bullet lists. No HTML injection.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
  );
}

function FormattedText({ text }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((line) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) {
      if (!list) {
        list = [];
        blocks.push({ type: 'ul', items: list });
      }
      list.push(bullet[1]);
    } else {
      list = null;
      if (line.trim()) blocks.push({ type: 'p', text: line });
    }
  });
  return blocks.map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>
    ) : (
      <p key={i}>{renderInline(b.text)}</p>
    )
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiMode, setAiMode] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, asking]);

  async function ask(text) {
    const q = text.trim();
    if (!q || asking) return;
    const history = messages.filter((m) => !m.error).map(({ role, text: t }) => ({ role, text: t }));
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setAsking(true);
    try {
      const { answer, aiPowered } = await askAssistant(q, history);
      setAiMode(aiPowered);
      setMessages((m) => [...m, { role: 'assistant', text: answer, aiPowered }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: errorMessage(err, 'The assistant is unavailable right now.'), error: true }]);
    } finally {
      setAsking(false);
    }
  }

  const suggestions = SUGGESTIONS[user.role] || [];

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Ask about your farm, listings, orders and reports. Answers come only from your own account data."
        actions={
          messages.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setMessages([])}>
              <RotateCcw size={16} /> New chat
            </button>
          )
        }
      />
      <div className="card chat">
        <div className="chat-log" ref={logRef}>
          {messages.length === 0 ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <div className="empty-icon"><Sparkles size={26} /></div>
              <h3>How can I help, {user.name.split(' ')[0]}?</h3>
              <p>Try one of these to get started:</p>
              <div className="chips" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
                {suggestions.map((s) => (
                  <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === 'user' ? (
                  <Avatar name={user.name} size="sm" />
                ) : (
                  <div className="avatar avatar-sm tone-green"><Bot size={16} /></div>
                )}
                <div className="msg-bubble" style={m.error ? { background: 'var(--red-bg)', color: 'var(--red)', borderColor: 'transparent' } : undefined}>
                  {m.role === 'user' ? m.text : <FormattedText text={m.text} />}
                </div>
              </div>
            ))
          )}
          {asking && (
            <div className="msg assistant">
              <div className="avatar avatar-sm tone-green"><Bot size={16} /></div>
              <div className="msg-bubble typing"><span /><span /><span /></div>
            </div>
          )}
        </div>
        {aiMode === false && (
          <div className="row subtle" style={{ padding: '0 1rem 0.5rem', gap: 6 }}>
            <Info size={14} /> Offline mode: answers are generated from your data by rules. Add an ANTHROPIC_API_KEY on the server for free-form AI answers.
          </div>
        )}
        {aiMode === true && (
          <div style={{ padding: '0 1rem 0.5rem' }}><Badge tone="violet"><Sparkles size={12} /> Powered by Claude</Badge></div>
        )}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <textarea
            className="textarea"
            rows={1}
            maxLength={1000}
            value={question}
            placeholder="Ask a question…"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(question);
              }
            }}
          />
          <button className="btn btn-icon" style={{ height: 44, width: 44 }} disabled={asking || !question.trim()} aria-label="Send">
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
