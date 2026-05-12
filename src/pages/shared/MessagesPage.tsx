import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { messagingApi, usersApi } from '@/services/api';
import { Message } from '@/types';
import { Spinner, Empty, Avatar } from '@/components/shared/index';
import { useAuth } from '@/context/AuthContext';

export default function MessagesPage() {
  const { partnerId } = useParams<{ partnerId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activePartnerId = partnerId ? Number(partnerId) : null;

  // Load conversations
  useEffect(() => {
    messagingApi.conversations()
      .then(r => setConversations(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  // Load messages when partner changes
  useEffect(() => {
    if (!activePartnerId) return;
    setMsgLoading(true);
    messagingApi.getConversation(activePartnerId)
      .then(r => setMessages(r.data || []))
      .finally(() => setMsgLoading(false));

    // Poll for new messages
    pollRef.current = setInterval(() => {
      messagingApi.getConversation(activePartnerId)
        .then(r => setMessages(r.data || []));
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activePartnerId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activePartnerId) return;
    setSending(true);
    try {
      const res = await messagingApi.sendMessage({ recipient_id: activePartnerId, body: newMessage.trim() });
      setMessages(prev => [...prev, { ...res.data, mine: true }]);
      setNewMessage('');
      // Refresh conversations
      messagingApi.conversations().then(r => setConversations(r.data || []));
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); }
  };

  const handleSearchUser = async (q: string) => {
    setSearchUser(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await usersApi.listUsers({ search: q, per_page: 5 });
    setSearchResults((res.data.items || []).filter((u: any) => u.id !== user?.id));
  };

  const activeConversation = conversations.find(c => c.partner?.id === activePartnerId);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', height: 'calc(100vh - var(--nav-height) - 2rem)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--card-bg)' }}>

        {/* Conversation list */}
        <div style={{ width: 300, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h6 className="fw-700 mb-2">Messages</h6>
            <div className="position-relative">
              <i className="bi bi-search position-absolute" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2, fontSize: '0.8rem' }} />
              <input
                type="text" className="form-control form-control-sm" placeholder="Search users…"
                style={{ paddingLeft: '2rem' }} value={searchUser} onChange={e => handleSearchUser(e.target.value)}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-2 mt-1" style={{ background: 'var(--card-bg)', position: 'absolute', zIndex: 10, width: 268, boxShadow: 'var(--shadow-lg)' }}>
                {searchResults.map((u: any) => (
                  <div key={u.id} className="d-flex align-items-center gap-2 p-2 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setSearchUser(''); setSearchResults([]); navigate(`/messages/${u.id}`); }}>
                    <Avatar image={u.image} name={u.name || u.username} size={28} />
                    <div>
                      <div className="fw-600" style={{ fontSize: '0.8rem' }}>{u.name || u.username}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{u.primary_role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div className="p-3"><Spinner size="sm" /></div> :
              conversations.length === 0 ? <Empty icon="bi-chat" title="No conversations" subtitle="Search for a user to start chatting" /> :
              conversations.map(conv => (
                <div
                  key={conv.partner?.id}
                  className={`d-flex align-items-center gap-3 p-3 cursor-pointer ${activePartnerId === conv.partner?.id ? 'bg-primary-light' : ''}`}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }}
                  onClick={() => navigate(`/messages/${conv.partner?.id}`)}
                >
                  <div className="position-relative">
                    <Avatar image={conv.partner?.image} name={conv.partner?.name} size={40} />
                    {conv.unread_count > 0 && (
                      <span className="position-absolute" style={{ top: -2, right: -2, background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="fw-600 truncate-2" style={{ fontSize: '0.875rem' }}>{conv.partner?.name || conv.partner?.username}</div>
                    {conv.last_message && (
                      <div className="text-muted truncate-2" style={{ fontSize: '0.72rem' }}>{conv.last_message.body?.slice(0, 50)}</div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!activePartnerId ? (
            <div className="d-flex align-items-center justify-content-center h-100 text-center text-muted">
              <div>
                <i className="bi bi-chat-square-dots d-block mb-3" style={{ fontSize: '3rem' }} />
                <h6>Select a conversation</h6>
                <p style={{ fontSize: '0.875rem' }}>Choose from the list or search for a user to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Avatar image={activeConversation?.partner?.image} name={activeConversation?.partner?.name} size={36} />
                <div>
                  <div className="fw-700">{activeConversation?.partner?.name || activeConversation?.partner?.username || `User ${activePartnerId}`}</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Active recently</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {msgLoading ? <Spinner size="sm" /> :
                  messages.length === 0 ? (
                    <div className="text-center text-muted py-5" style={{ fontSize: '0.875rem' }}>
                      <i className="bi bi-chat d-block mb-2" style={{ fontSize: '2rem' }} />
                      No messages yet. Say hello!
                    </div>
                  ) : messages.map(msg => (
                    <div key={msg.id} className={`d-flex ${msg.mine ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div style={{
                        maxWidth: '70%', padding: '0.625rem 0.875rem', borderRadius: msg.mine ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                        background: msg.mine ? 'var(--primary)' : 'var(--bg)',
                        color: msg.mine ? '#fff' : 'var(--text)',
                        border: msg.mine ? 'none' : '1px solid var(--border)',
                        fontSize: '0.875rem', lineHeight: 1.5,
                      }}>
                        {msg.body}
                        <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '0.25rem', textAlign: msg.mine ? 'right' : 'left' }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          {msg.mine && <i className={`bi ${msg.is_seen ? 'bi-check2-all' : 'bi-check2'} ms-1`} />}
                        </div>
                      </div>
                    </div>
                  ))
                }
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <textarea
                  className="form-control"
                  rows={1}
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  style={{ resize: 'none', borderRadius: 999 }}
                />
                <button
                  className="btn btn-primary"
                  style={{ borderRadius: '50%', width: 42, height: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-send-fill" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
