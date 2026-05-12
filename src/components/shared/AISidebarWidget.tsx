import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { aiApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AISidebarWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi ${user?.name?.split(' ')[0] || user?.username}! 👋 I'm your Intellect AI assistant. Ask me anything about your courses, topics, or learning goals!`,
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

    // Only show for authenticated users, not on auth pages
  if (!user || location.pathname.startsWith('/auth')) return null;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiApi.chat({ message: userMsg.content, history: messages.slice(-8) });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'AI is unavailable right now.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            border: 'none', color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(74,144,217,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', zIndex: 900, transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          title="Ask Intellect AI"
        >
          <i className="bi bi-robot" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          width: 360, zIndex: 900,
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          display: 'flex', flexDirection: 'column',
          maxHeight: minimized ? 52 : 520,
          transition: 'max-height 0.25s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              cursor: 'pointer', flexShrink: 0,
            }}
            onClick={() => setMinimized(p => !p)}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-robot text-white" style={{ fontSize: '0.875rem' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="fw-700 text-white" style={{ fontSize: '0.875rem', lineHeight: 1 }}>Intellect AI</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1, marginTop: 2 }}>
                {loading ? 'Thinking…' : 'Online · Ask me anything'}
              </div>
            </div>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm p-0"
                style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={e => { e.stopPropagation(); setMinimized(p => !p); }}
              >
                <i className={`bi bi-chevron-${minimized ? 'up' : 'down'}`} />
              </button>
              <button
                className="btn btn-sm p-0"
                style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={e => { e.stopPropagation(); setOpen(false); setMinimized(false); }}
              >
                <i className="bi bi-x" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
                        <i className="bi bi-robot text-primary" style={{ fontSize: '0.65rem' }} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '80%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                      background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      fontSize: '0.8rem', lineHeight: 1.5,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="bi bi-robot text-primary" style={{ fontSize: '0.65rem' }} />
                    </div>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '1rem 1rem 1rem 0.25rem', padding: '0.5rem 0.875rem' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)',
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts */}
              {messages.length <= 1 && (
                <div style={{ padding: '0 0.875rem', display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {[
                    'Explain a concept',
                    'Help me study',
                    'Quiz me on a topic',
                    'Summarize my course',
                  ].map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); }}
                      style={{
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        border: '1px solid var(--primary-light)', borderRadius: 999,
                        padding: '0.2rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.background = 'var(--primary)'); (e.currentTarget.style.color = '#fff'); }}
                      onMouseLeave={e => { (e.currentTarget.style.background = 'var(--primary-light)'); (e.currentTarget.style.color = 'var(--primary)'); }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ padding: '0.625rem 0.875rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <textarea
                  rows={1}
                  placeholder="Ask anything…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  style={{
                    flex: 1, resize: 'none', border: '1px solid var(--border)',
                    borderRadius: 999, padding: '0.4rem 0.875rem',
                    fontSize: '0.8rem', outline: 'none', background: 'var(--bg)', color: 'var(--text)',
                    fontFamily: 'var(--font-body)', lineHeight: 1.4,
                    maxHeight: 80,
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: loading || !input.trim() ? 'var(--border)' : 'var(--primary)',
                    border: 'none', color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'var(--transition)', fontSize: '0.875rem',
                  }}
                >
                  {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : <i className="bi bi-send-fill" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
