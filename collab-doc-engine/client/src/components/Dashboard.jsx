import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TemplateModal, { TEMPLATES } from './Templates';

const ROLE_COLORS = { owner: '#667eea', editor: '#2ecc71', viewer: '#f39c12' };

export default function Dashboard({ user, onOpenDoc, onLogout }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [shareDoc, setShareDoc] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('editor');
  const [shareMsg, setShareMsg] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocs(data.docs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createDoc = async () => {
    // Req 9.1: show template picker before creating
    setShowTemplateModal(true);
  };

  const createFromTemplate = async (tpl) => {
    setShowTemplateModal(false);
    setCreating(true);
    try {
      // Req 9.8: track template usage
      const usage = JSON.parse(localStorage.getItem('templateUsage') || '{}');
      usage[tpl.id] = (usage[tpl.id] || 0) + 1;
      localStorage.setItem('templateUsage', JSON.stringify(usage));

      const { data } = await api.post('/documents', { title: 'Untitled Document' });
      // Pass pending template so Editor can apply it immediately on open (Req 9.2/9.4)
      onOpenDoc({ ...data.doc, _pendingTemplate: tpl.id !== 'blank' ? tpl : null });
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document?')) return;
    await api.delete(`/documents/${id}`);
    setDocs(docs.filter(d => d._id !== id));
  };

  const openShareModal = async (doc, e) => {
    e.stopPropagation();
    try {
      const { data } = await api.get(`/documents/${doc._id}`);
      setShareDoc(data.doc);
    } catch { setShareDoc(doc); }
    setShareEmail(''); setShareRole('editor'); setShareMsg(null);
  };

  const doShare = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setShareLoading(true); setShareMsg(null);
    try {
      const { data } = await api.post(`/documents/${shareDoc._id}/share`, {
        email: shareEmail.trim(), role: shareRole,
      });
      setShareMsg({ ok: true, text: `Shared with ${shareEmail}` });
      setShareEmail('');
      setShareDoc(prev => ({ ...prev, collaborators: data.collaborators }));
      fetchDocs();
    } catch (err) {
      setShareMsg({ ok: false, text: err.response?.data?.error || 'Failed to share' });
    } finally { setShareLoading(false); }
  };

  const removeCollab = async (userId) => {
    try {
      await api.delete(`/documents/${shareDoc._id}/collaborators/${userId}`);
      setShareDoc(prev => ({
        ...prev,
        collaborators: prev.collaborators.filter(c => c.userId?.toString() !== userId),
      }));
      fetchDocs();
    } catch (err) {
      setShareMsg({ ok: false, text: err.response?.data?.error || 'Failed to remove' });
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const myRole = (doc) => doc.collaborators?.find(c => c.userId?.toString() === user._id?.toString())?.role || 'editor';

  return (
    <>
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: 24 }}>📝</span>
          <span style={s.brand}>CollabDocs</span>
        </div>
        <div style={s.headerRight}>
          <div style={{ ...s.avatar, background: user.color }}>{user.username[0].toUpperCase()}</div>
          <div>
            <div style={s.username}>{user.username}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{user.email}</div>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.topBar}>
          <div>
            <h2 style={s.heading}>My Documents</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.newBtn} onClick={createDoc} disabled={creating}>
              {creating ? '...' : '+ New Document'}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#aaa', marginTop: 60 }}>Loading...</p>
        ) : docs.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📄</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>No documents yet</p>
            <p style={{ color: '#aaa', fontSize: 13 }}>Create one or ask someone to share a document with you.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {docs.map(doc => {
              const role = myRole(doc);
              const others = (doc.collaborators?.length || 1) - 1;
              return (
                <div key={doc._id} style={s.card} onClick={() => onOpenDoc(doc)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 32 }}>📄</span>
                    <span style={{ ...s.rolePill, background: ROLE_COLORS[role] + '22', color: ROLE_COLORS[role] }}>{role}</span>
                  </div>
                  <div style={s.cardTitle}>{doc.title}</div>
                  <div style={s.cardMeta}>
                    <span>v{doc.version}</span>
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                  {others > 0 && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                      👥 {others} collaborator{others > 1 ? 's' : ''}
                    </div>
                  )}
                  <div style={s.cardActions}>
                    <button style={s.shareBtn} onClick={(e) => openShareModal(doc, e)}>🔗 Share</button>
                    {role === 'owner' && (
                      <button style={s.deleteBtn} onClick={(e) => deleteDoc(doc._id, e)}>🗑</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Share Modal ── */}
      {shareDoc && (
        <div style={s.overlay} onClick={() => setShareDoc(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Share Document</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>"{shareDoc.title}"</p>
              </div>
              <button style={s.closeBtn} onClick={() => setShareDoc(null)}>✕</button>
            </div>

            {/* Add collaborator */}
            <form onSubmit={doShare}>
              <label style={s.label}>Invite by email</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="email"
                  placeholder="colleague@email.com"
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  style={{ ...s.input, flex: 1 }}
                  required
                />
                <select value={shareRole} onChange={e => setShareRole(e.target.value)} style={s.select}>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              {shareMsg && (
                <p style={{ margin: '0 0 8px', fontSize: 13, color: shareMsg.ok ? '#2e7d32' : '#c62828' }}>
                  {shareMsg.ok ? '✓' : '✗'} {shareMsg.text}
                </p>
              )}
              <button type="submit" style={{ ...s.newBtn, width: '100%', marginBottom: 20 }} disabled={shareLoading}>
                {shareLoading ? 'Sharing...' : '🔗 Share Access'}
              </button>
            </form>

            {/* Current collaborators */}
            <div>
              <label style={s.label}>People with access ({shareDoc.collaborators?.length || 0})</label>
              <div style={s.collabList}>
                {(shareDoc.collaborators || []).map((c, i) => {
                  const isMe = c.userId?.toString() === user._id?.toString();
                  const isOwner = c.role === 'owner';
                  return (
                    <div key={i} style={s.collabRow}>
                      <div style={{ ...s.collabAvatar, background: ROLE_COLORS[c.role] }}>
                        {(c.username || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>
                          {c.username} {isMe && <span style={{ color: '#aaa', fontWeight: 400 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{c.email || ''}</div>
                      </div>
                      <span style={{ ...s.rolePill, background: ROLE_COLORS[c.role] + '22', color: ROLE_COLORS[c.role], marginRight: 8 }}>
                        {c.role}
                      </span>
                      {!isMe && !isOwner && myRole(shareDoc) === 'owner' && (
                        <button
                          style={s.removeBtn}
                          onClick={() => removeCollab(c.userId?.toString())}
                          title="Remove access"
                        >✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Copy link hint */}
            <div style={s.linkHint}>
              <span style={{ fontSize: 12, color: '#888' }}>
                💡 Share the document ID <strong>{shareDoc._id}</strong> — collaborators can open it from their dashboard after you share.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Req 9.1: Template picker when creating a new document */}
    {showTemplateModal && (
      <TemplateModal
        onSelect={createFromTemplate}
        onClose={() => setShowTemplateModal(false)}
        darkMode={false}
      />
    )}
    </>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Inter, sans-serif' },
  header: { background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  brand: { fontSize: 20, fontWeight: 700, color: '#1a1a2e' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 },
  username: { fontSize: 14, fontWeight: 600, color: '#333' },
  logoutBtn: { padding: '6px 14px', border: '1px solid #e0e0e0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#666' },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  heading: { margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  newBtn: { padding: '10px 22px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', color: '#888', marginTop: 80 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 20, cursor: 'pointer', border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s' },
  cardTitle: { fontWeight: 600, fontSize: 15, color: '#1a1a2e', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#bbb', marginBottom: 10 },
  cardActions: { display: 'flex', gap: 8 },
  shareBtn: { flex: 1, padding: '7px 0', background: '#f0f4ff', color: '#667eea', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  deleteBtn: { padding: '7px 12px', background: '#fff0f0', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  rolePill: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.3px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 14, padding: 28, width: 420, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  closeBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1, padding: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '10px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' },
  collabList: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 220, overflowY: 'auto' },
  collabRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#fafafa' },
  collabAvatar: { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 },
  removeBtn: { border: 'none', background: '#fff0f0', color: '#e74c3c', borderRadius: 4, cursor: 'pointer', fontSize: 12, padding: '3px 7px', fontWeight: 700 },
  linkHint: { marginTop: 16, padding: '10px 12px', background: '#f8f9fa', borderRadius: 8, lineHeight: 1.5 },
};
