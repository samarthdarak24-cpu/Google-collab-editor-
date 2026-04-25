import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function Chat({ docId, user, socket, darkMode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Load history
  useEffect(() => {
    setLoading(true);
    api.get(`/documents/${docId}/chat`)
      .then(({ data }) => {
        setMessages(data.messages || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load chat:', err);
        setLoading(false);
      });
  }, [docId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    
    const handler = (msg) => {
      console.log('Received chat message:', msg);
      setMessages(prev => [...prev, msg]);
    };
    
    socket.on('chat-message', handler);
    return () => socket.off('chat-message', handler);
  }, [socket]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    console.log('Sending chat message:', input);
    socket?.emit('chat-message', { text: input, docId });
    setInput('');
  };

  const bg = darkMode ? '#1e1e2e' : '#fff';
  const border = darkMode ? '#313244' : '#e0e0e0';
  const textColor = darkMode ? '#cdd6f4' : '#222';
  const inputBg = darkMode ? '#313244' : '#f5f5f5';

  const formatTime = (ts) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg, borderLeft: `1px solid ${border}` }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, fontWeight: 700, fontSize: 13, color: textColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>💬 Chat</span>
        <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && (
          <p style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Loading messages...</p>
        )}
        {!loading && messages.length === 0 && (
          <p style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 20 }}>No messages yet. Say hi! 👋</p>
        )}
        {!loading && messages.map((m, i) => {
          const messageColor = m.color || '#667eea';
          return (
            <div key={`${m.timestamp}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                <div style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  background: messageColor, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#fff', 
                  fontSize: 10, 
                  fontWeight: 700 
                }}>
                  {m.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontSize: 11, color: messageColor, fontWeight: 700 }}>{m.username || 'Unknown'}</span>
                <span style={{ fontSize: 9, color: '#aaa' }}>{formatTime(m.timestamp)}</span>
              </div>
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: darkMode ? '#313244' : '#f5f5f5',
                color: textColor,
                fontSize: 13,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                marginLeft: 30,
                border: `1px solid ${border}`,
              }}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ padding: '10px 12px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          style={{ 
            flex: 1, 
            padding: '8px 10px', 
            borderRadius: 8, 
            border: `1px solid ${border}`, 
            background: inputBg, 
            color: textColor, 
            fontSize: 13, 
            outline: 'none' 
          }}
        />
        <button 
          type="submit" 
          disabled={!input.trim()}
          style={{ 
            padding: '8px 12px', 
            background: input.trim() ? '#667eea' : '#ccc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 8, 
            cursor: input.trim() ? 'pointer' : 'not-allowed', 
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ➤
        </button>
      </form>
    </div>
  );
}
