import React, { useState } from 'react';
import api from '../services/api';
import { toast } from './Notifications';

export default function ShareModal({ docId, collaborators, onUpdate, onClose, darkMode }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/documents/${docId}/share`, { email, role });
      toast(data.message, 'success');
      setEmail('');
      onUpdate(data.collaborators);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to share', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (userId) => {
    try {
      const { data } = await api.delete(`/documents/${docId}/collaborators/${userId}`);
      toast('Collaborator removed', 'success');
      onUpdate(data.collaborators);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to remove', 'error');
    }
  };

  const bg = darkMode ? '#1e1e2e' : '#ffffff';
  const text = darkMode ? '#cdd6f4' : '#1a1a2e';
  const border = darkMode ? '#45475a' : '#e0e0e0';
  const surface = darkMode ? '#313244' : '#f8f9fa';
  const muted = darkMode ? '#a6adc8' : '#666';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: bg, borderRadius: 16, padding: 32, width: 480, boxShadow: '0 24px 80px rgba(0,0,0,.4)', border: `1px solid ${border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, letterSpacing: '-0.5px' }}>Share with Collaborators</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 24, color: muted }}>✕</button>
        </div>

        <form onSubmit={handleShare} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              type="email" 
              placeholder="Enter collaborator's email..." 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${border}`, background: surface, color: text, fontSize: 14, outline: 'none' }}
            />
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)}
              style={{ padding: '0 12px', borderRadius: 10, border: `1px solid ${border}`, background: surface, color: text, fontSize: 13, fontWeight: 600, outline: 'none' }}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '0 20px', background: '#1a5fb4', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#164f96'}
              onMouseLeave={e => e.currentTarget.style.background = '#1a5fb4'}
            >
              {loading ? '...' : 'Add'}
            </button>
          </div>
        </form>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Current Collaborators</h3>
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {collaborators.map(c => (
              <div key={c.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: surface, borderRadius: 12, border: `1px solid ${border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {c.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: text }}>{c.username}</div>
                  <div style={{ fontSize: 12, color: muted }}>{c.role}</div>
                </div>
                {c.role !== 'owner' && (
                  <button 
                    onClick={() => removeCollaborator(c.userId)}
                    style={{ border: 'none', background: 'none', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${border}`, textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', background: surface, color: text, border: `1px solid ${border}`, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
