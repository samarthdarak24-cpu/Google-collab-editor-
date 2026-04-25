import React, { useEffect, useRef, useState, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { connectSocket, disconnectSocket } from '../services/socket';
import api from '../services/api';
import Chat from './Chat';
import TemplateModal from './Templates';
import { CommentPopover, CommentsSidebar } from './Comments';
import { toast } from './Notifications';
import ShareModal from './ShareModal';
import HistorySidebar from './HistorySidebar';
import { highlightPlaceholders } from '../utils/highlightPlaceholders';

// ── Register custom fonts with Quill ─────────────────────────────────────────
// Use simple class-safe names (no hyphens in the whitelist key)
const Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'calibri', 'georgia', 'verdana', 'tahoma', 'trebuchet', 'times', 'courier', 'serif', 'monospace'];
Quill.register(Font, true);

// Use the STYLE-based size attributor so arbitrary sizes work
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = null; // null = allow any value
Quill.register(SizeStyle, true);

function upsertCursor(quill, sid, username, color, range) {
  document.getElementById(`cur-${sid}`)?.remove();
  if (!range || range.index == null) return;
  try {
    const b = quill.getBounds(range.index, 0);
    if (!b) return;
    const wrap = quill.root.parentElement;
    const el = document.createElement('div');
    el.id = `cur-${sid}`;
    el.style.cssText = `position:absolute;left:${b.left}px;top:${b.top}px;height:${b.height||18}px;width:2px;background:${color};pointer-events:none;z-index:50;`;
    const lbl = document.createElement('div');
    lbl.style.cssText = `position:absolute;top:-20px;left:0;background:${color};color:#fff;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap;`;
    lbl.textContent = username;
    el.appendChild(lbl);
    wrap.appendChild(el);
  } catch {}
}

function removeCursor(sid) {
  document.getElementById(`cur-${sid}`)?.remove();
}

function calcStats(quill, range) {
  if (!quill) return { words: 0, chars: 0, readTime: '< 1 min', selection: false };
  let text;
  let selection = false;
  if (range && range.length > 0) {
    text = quill.getText(range.index, range.length).trim();
    selection = true;
  } else {
    text = quill.getText().trim();
  }
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  const mins = Math.ceil(words / 200);
  return { words, chars, readTime: mins < 1 ? '< 1 min' : `${mins} min`, selection };
}

const TOOLBAR = [
  // Row 1: font family + size
  [
    { font: ['', 'arial', 'calibri', 'georgia', 'verdana', 'tahoma', 'trebuchet', 'times', 'courier', 'serif', 'monospace'] },
    { size: ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'] },
  ],
  // Row 2: heading + text formatting
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  // Row 3: paragraph
  [{ align: [] }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  // Row 4: insert + clean
  ['blockquote', 'code-block'],
  ['link', 'image', 'video'],
  ['clean'],
];

export default function Editor({ doc, user, token, onBack }) {
  const editorDivRef = useRef(null);
  const quillRef = useRef(null);
  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const typingTimer = useRef(null);
  const versionRef = useRef(doc.version || 0);
  const lockedRef = useRef(doc.locked || false);
  const myRoleRef = useRef('editor');

  const [title, setTitle] = useState(doc.title || 'Untitled');
  const [version, setVersion] = useState(doc.version || 0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [myRole, setMyRole] = useState('editor');
  const [locked, setLocked] = useState(doc.locked || false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [showChat, setShowChat] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [statsMinimized, setStatsMinimized] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: '< 1 min', selection: false });
  const [typingUsers, setTypingUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [publicLink, setPublicLink] = useState(null);
  const [isPublic, setIsPublic] = useState(doc.isPublic || false);
  const [collaborators, setCollaborators] = useState(doc.collaborators || []);
  const [unreadChat, setUnreadChat] = useState(0);
  // Comment popover state
  const [commentPopover, setCommentPopover] = useState(null); // { position, selectedText, range }

  useEffect(() => {
    if (quillRef.current) return;
    const q = new Quill(editorDivRef.current, {
      theme: 'snow',
      modules: {
        toolbar: TOOLBAR,
        history: { delay: 1000, maxStack: 200, userOnly: true },
      },
      placeholder: 'Start typing your document…',
    });
    // Req 9.2/9.4: apply pending template immediately if doc was created from one
    const initialContent = doc._pendingTemplate
      ? doc._pendingTemplate.content
      : (doc.content?.ops ? doc.content : { ops: [] });
    q.setContents(initialContent);
    quillRef.current = q;
    setStats(calcStats(q));
    // Req 9.5: highlight placeholders if template was applied
    if (doc._pendingTemplate) {
      setTimeout(() => highlightPlaceholders(q), 50);
    }
  }, []);

  useEffect(() => {
    const socket = connectSocket(token);
    socketRef.current = socket;
    socket.emit('join-document', { docId: doc._id });

    api.get(`/documents/${doc._id}/comments`)
      .then(r => setComments(r.data.comments || []))
      .catch(() => {});

    const onDocLoaded = d => {
      setActiveUsers(d.activeUsers || []);
      const role = d.myRole || 'editor';
      setMyRole(role);
      myRoleRef.current = role;
      const lk = d.locked || false;
      setLocked(lk);
      lockedRef.current = lk;
      if (d.title) setTitle(d.title);
    };
    const onActiveUsers = u => setActiveUsers(u);
    const onUserJoined = u => {
      setActiveUsers(p => [...p, u]);
    };
    const onUserLeft = u => {
      setActiveUsers(p => p.filter(x => x.socketId !== u.socketId));
      removeCursor(u.socketId);
    };
    const onReceiveChanges = ({ delta, username }) => {
      quillRef.current?.updateContents(delta, 'silent');
      setStats(calcStats(quillRef.current));
    };
    const onCursorUpdate = ({ socketId, username, color, range }) => {
      if (quillRef.current) upsertCursor(quillRef.current, socketId, username, color, range);
    };
    const onTitleUpdated = ({ title: t }) => setTitle(t);
    const onDocLocked = ({ locked: l, by }) => {
      setLocked(l);
      lockedRef.current = l;
      toast(l ? `Locked by ${by}` : `Unlocked by ${by}`, 'warning');
    };
    const onUserTyping = ({ socketId, username }) => {
      setTypingUsers(p => {
        if (p.find(x => x.socketId === socketId)) return p;
        return [...p, { socketId, username }];
      });
      setTimeout(() => setTypingUsers(p => p.filter(x => x.socketId !== socketId)), 3500);
    };
    const onUserStoppedTyping = ({ socketId }) => {
      setTypingUsers(p => p.filter(x => x.socketId !== socketId));
    };
    const onCommentAdded = c => {
      setComments(p => [...p, c]);
      toast(`Comment from ${c.username}`, 'info');
    };
    const onCommentResolved = ({ commentId }) => {
      setComments(p => p.map(c => c.id === commentId ? { ...c, resolved: true } : c));
    };

    socket.on('document-loaded', onDocLoaded);
    socket.on('active-users', onActiveUsers);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('receive-changes', onReceiveChanges);
    socket.on('cursor-update', onCursorUpdate);
    socket.on('title-updated', onTitleUpdated);
    socket.on('document-locked', onDocLocked);
    socket.on('user-typing', onUserTyping);
    socket.on('user-stopped-typing', onUserStoppedTyping);
    socket.on('comment-added', onCommentAdded);
    socket.on('comment-resolved', onCommentResolved);
    socket.on('rollback-applied', ({ content, version, requestedBy }) => {
      quillRef.current?.setContents(content);
      versionRef.current = version;
      setVersion(version);
      toast(`Rolled back to v${version} by ${requestedBy}`, 'warning');
    });

    // Req 1: unread chat badge — count incoming messages when sidebar is closed
    const onChatMsg = () => setUnreadChat(n => n + 1);
    socket.on('chat-message', onChatMsg);

    // Req 10: check if doc already has a public link
    if (doc.isPublic && doc.publicToken) {
      setPublicLink(`${window.location.origin}/public/${doc.publicToken}`);
      setIsPublic(true);
    }

    // Load bookmarks from localStorage (per-doc)
    const saved = localStorage.getItem(`bookmarks-${doc._id}`);
    if (saved) { try { setBookmarks(JSON.parse(saved)); } catch {} }

    return () => {
      clearTimeout(saveTimer.current);
      clearTimeout(typingTimer.current);
      socket.off('document-loaded', onDocLoaded);
      socket.off('active-users', onActiveUsers);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('receive-changes', onReceiveChanges);
      socket.off('cursor-update', onCursorUpdate);
      socket.off('title-updated', onTitleUpdated);
      socket.off('document-locked', onDocLocked);
      socket.off('user-typing', onUserTyping);
      socket.off('user-stopped-typing', onUserStoppedTyping);
      socket.off('comment-added', onCommentAdded);
      socket.off('comment-resolved', onCommentResolved);
      socket.off('chat-message', onChatMsg);
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;
    const handler = (delta, _old, source) => {
      if (source !== 'user') return;
      if (lockedRef.current && myRoleRef.current !== 'owner') {
        toast('Document is locked', 'error');
        q.history.undo();
        return;
      }
      setStats(calcStats(q));
      versionRef.current += 1;
      setVersion(versionRef.current);
      socketRef.current?.emit('send-changes', { delta, docId: doc._id, version: versionRef.current });

      socketRef.current?.emit('typing-start', { docId: doc._id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('typing-stop', { docId: doc._id });
      }, 3000);

      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const content = q.getContents();
        socketRef.current?.emit('save-document', { content, docId: doc._id });
      }, 3000);
    };
    q.on('text-change', handler);
    return () => q.off('text-change', handler);
  }, [doc._id]);

  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;
    const handler = () => {
      const range = q.getSelection();
      if (range) socketRef.current?.emit('cursor-move', { range, docId: doc._id });
      // Req 2: update stats for selection
      setStats(calcStats(q, range));
    };
    q.on('selection-change', handler);
    return () => q.off('selection-change', handler);
  }, [doc._id]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.body.style.background = darkMode ? '#1e1e2e' : '#f0f2f5';
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Req 5.6: offer to sync with system theme preference on first load
  useEffect(() => {
    const hasExplicitPref = localStorage.getItem('darkMode') !== null;
    if (!hasExplicitPref) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const systemDark = mq.matches;
    if (systemDark !== darkMode) {
      const accept = window.confirm(
        `Your system is using ${systemDark ? 'dark' : 'light'} mode. Switch CollabDocs to match?`
      );
      if (accept) setDarkMode(systemDark);
    }
    // Only offer once per session
  }, []);

  const handleTitleChange = async e => {
    const t = e.target.value;
    setTitle(t);
    socketRef.current?.emit('title-change', { title: t, docId: doc._id });
    try { await api.patch(`/documents/${doc._id}/title`, { title: t }); } catch {}
  };

  const toggleLock = async () => {
    if (myRoleRef.current !== 'owner') { toast('Only owner can lock/unlock', 'error'); return; }
    const next = !locked;
    setLocked(next);
    lockedRef.current = next;
    socketRef.current?.emit('lock-document', { locked: next, docId: doc._id });
    try { await api.patch(`/documents/${doc._id}/lock`, { locked: next }); } catch {}
  };

  const handleManualSave = () => {
    const q = quillRef.current;
    if (!q) return;
    const content = q.getContents();
    socketRef.current?.emit('save-document', { content, docId: doc._id });
    toast('Document saved', 'success');
  };

  const handleExport = async fmt => {
    try {
      const res = await api.get(`/documents/${doc._id}/export?format=${fmt}`, {
        responseType: fmt === 'json' ? 'json' : 'blob',
      });
      const blob = fmt === 'json'
        ? new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        : res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Req 4: include timestamp in filename
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `${title}_${ts}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported as ${fmt.toUpperCase()}`, 'success');
      setShowExport(false);
    } catch { toast('Export failed', 'error'); }
  };

  const addComment = () => {
    const q = quillRef.current;
    if (!q) return;
    const range = q.getSelection();
    if (!range || range.length === 0) { toast('Select text first', 'warning'); return; }
    const selectedText = q.getText(range.index, range.length);
    // Calculate popover position from Quill bounds
    let position = { top: 200, left: window.innerWidth / 2 - 150 };
    try {
      const bounds = q.getBounds(range.index, range.length);
      const editorRect = q.root.getBoundingClientRect();
      position = {
        top: editorRect.top + bounds.bottom + 8,
        left: editorRect.left + bounds.left,
      };
    } catch {}
    setCommentPopover({ position, selectedText, range });
  };

  const submitComment = async (text) => {
    if (!commentPopover) return;
    const { range, selectedText } = commentPopover;
    setCommentPopover(null);
    try {
      const { data } = await api.post(`/documents/${doc._id}/comments`, {
        text,
        range,
        selectedText,
      });
      socketRef.current?.emit('add-comment', { comment: data.comment, docId: doc._id });
      setComments(p => [...p, data.comment]);
      setShowComments(true); // auto-open sidebar
      toast('Comment added', 'success');
    } catch { toast('Failed to add comment', 'error'); }
  };

  const resolveComment = async id => {
    try {
      await api.patch(`/documents/${doc._id}/comments/${id}/resolve`);
      socketRef.current?.emit('resolve-comment', { commentId: id, docId: doc._id });
      setComments(p => p.map(c => c.id === id ? { ...c, resolved: true } : c));
    } catch { toast('Failed to resolve', 'error'); }
  };

  const deleteComment = async id => {
    try {
      await api.delete(`/documents/${doc._id}/comments/${id}`);
      setComments(p => p.filter(c => c.id !== id));
      toast('Comment deleted', 'info');
    } catch { toast('Failed to delete', 'error'); }
  };

  const applyTemplate = tpl => {
    quillRef.current?.setContents(tpl.content);
    setStats(calcStats(quillRef.current));
    // Req 9.5: highlight placeholders after applying template
    highlightPlaceholders(quillRef.current);
    toast(`Template applied: ${tpl.name}`, 'success');
    setShowTemplates(false);
  };

  // Req 9: Save current document as a personal template (stored in localStorage)
  const saveAsTemplate = useCallback(() => {
    const q = quillRef.current;
    if (!q) return;
    const name = window.prompt('Template name:', title);
    if (!name?.trim()) return;
    const content = q.getContents();
    const custom = { id: `custom-${Date.now()}`, name: name.trim(), icon: '⭐', desc: 'My template', content };
    const existing = JSON.parse(localStorage.getItem('customTemplates') || '[]');
    existing.push(custom);
    localStorage.setItem('customTemplates', JSON.stringify(existing));
    toast(`Saved as template: ${name}`, 'success');
    setShowTemplates(false);
  }, [title]);

  const generatePublicLink = async () => {
    try {
      const { data } = await api.post(`/documents/${doc._id}/public-link`);
      setPublicLink(data.link);
      setIsPublic(true);
      setShowPublicModal(true);
      toast('Public link generated', 'success');
    } catch { toast('Failed to generate link', 'error'); }
  };

  const revokePublicLink = async () => {
    try {
      await api.delete(`/documents/${doc._id}/public-link`);
      setPublicLink(null);
      setIsPublic(false);
      setShowPublicModal(false);
      toast('Public link revoked', 'success');
    } catch { toast('Failed to revoke', 'error'); }
  };

  // Req 6: Bookmarks
  const addBookmark = useCallback(() => {
    const q = quillRef.current;
    if (!q) return;
    const range = q.getSelection();
    const index = range ? range.index : 0;
    const text = q.getText(Math.max(0, index - 10), 40).replace(/\n/g, ' ').trim();
    // Approximate line number
    const before = q.getText(0, index);
    const line = before.split('\n').length;
    const bm = { id: Date.now(), index, line, preview: text || '(empty)', createdAt: new Date().toLocaleTimeString() };
    setBookmarks(prev => {
      const next = [...prev, bm];
      localStorage.setItem(`bookmarks-${doc._id}`, JSON.stringify(next));
      return next;
    });
    toast('Bookmark added', 'success');
  }, [doc._id]);

  const jumpToBookmark = useCallback((bm) => {
    const q = quillRef.current;
    if (!q) return;
    q.setSelection(bm.index, 0);
    q.focus();
    setShowBookmarks(false);
  }, []);

  const removeBookmark = useCallback((id) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      localStorage.setItem(`bookmarks-${doc._id}`, JSON.stringify(next));
      return next;
    });
  }, [doc._id]);

  const bg      = darkMode ? '#1e1e2e' : '#ffffff';
  const surface = darkMode ? '#313244' : '#f8f9fa';
  const border  = darkMode ? '#45475a' : '#e0e0e0';
  const text    = darkMode ? '#cdd6f4' : '#1a1a2e';
  const muted   = darkMode ? '#6c7086' : '#888';
  const unresolved = comments.filter(c => !c.resolved).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: darkMode ? '#1a1a2e' : '#f0f2f5', color: text, fontFamily: 'Inter, sans-serif' }}>
      {/* Req 10: Public indicator banner */}
      {isPublic && (
        <div style={{ background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '3px 0', letterSpacing: '0.5px' }}>
          🌐 PUBLIC — Anyone with the link can view this document
        </div>
      )}
      {/* ── Word-style title bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: darkMode ? '#1f3a6e' : '#1a5fb4',
        color: '#fff',
        flexWrap: 'wrap',
        minHeight: 44,
      }}>
        <button onClick={onBack} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>←</button>
        {/* Document title */}
        <input
          value={title}
          onChange={handleTitleChange}
          style={{ flex: 1, minWidth: 140, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#fff', outline: 'none', textAlign: 'center' }}
        />
        {/* Active users */}
        <div style={{ display: 'flex', gap: 3 }}>
          {activeUsers.slice(0, 5).map((u, i) => (
            <div key={i} title={u.username} style={{ width: 26, height: 26, borderRadius: '50%', background: u.color || '#667eea', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
              {u.username[0].toUpperCase()}
            </div>
          ))}
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { label: '📋', title: 'Templates', action: () => setShowTemplates(true) },
            { label: '📌', title: `Comments${unresolved > 0 ? ` (${unresolved})` : ''}`, action: () => setShowComments(v => !v) },
            { label: '💬', title: 'Add Comment', action: addComment },
            { label: '🔖', title: 'Add Bookmark', action: addBookmark },
            { label: '📑', title: `Bookmarks${bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}`, action: () => setShowBookmarks(v => !v) },
            { label: '💾', title: 'Save Now', action: handleManualSave },
            { label: '🕒', title: 'Edit History', action: () => setShowHistory(v => !v) },
            { label: '👥', title: 'Collaborators', action: () => setShowShareModal(true) },
            { label: locked ? '🔒' : '🔓', title: locked ? 'Locked' : 'Lock', action: toggleLock },
          ].map(b => (
            <button key={b.label} title={b.title} onClick={b.action} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
              {b.label}
            </button>
          ))}
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button title="Export" onClick={() => setShowExport(v => !v)} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
              📤 Export
            </button>
            {showExport && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid #d0d0d0', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 300, minWidth: 140 }}>
                {[['txt','📄 Plain Text (.txt)'],['html','🌐 Web Page (.html)'],['json','📊 JSON Data (.json)']].map(([fmt, label]) => (
                  <button key={fmt} onClick={() => handleExport(fmt)} style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', color: '#333', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e8f0fe'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Chat with badge */}
          <button title="Chat" style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13, position: 'relative' }}
            onClick={() => { setShowChat(v => !v); setUnreadChat(0); }}>
            💬 Chat
            {unreadChat > 0 && !showChat && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#e74c3c', color: '#fff', borderRadius: '50%', fontSize: 9, fontWeight: 700, width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </button>
          <button title="Toggle dark/light mode" onClick={() => setDarkMode(v => !v)} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          {myRole === 'owner' && (
            <button style={{ padding: '4px 10px', background: publicLink ? '#16a34a' : 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              onClick={publicLink ? () => setShowPublicModal(true) : generatePublicLink}>
              🔗 {publicLink ? 'Public' : 'Share'}
            </button>
          )}
        </div>
      </div>

      {typingUsers.length > 0 && (
        <div style={{ padding: '4px 20px', background: darkMode ? '#2a2a3e' : '#f3f3f3', borderBottom: `1px solid ${border}`, fontSize: 12, color: muted, fontStyle: 'italic' }}>
          ✏️ {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={editorDivRef} style={{ flex: 1, overflow: 'auto', background: darkMode ? '#1a1a2e' : '#f0f2f5' }} />
          {/* Word-style status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '4px 20px',
            background: darkMode ? '#1f3a6e' : '#1a5fb4',
            color: '#fff',
            fontSize: 11,
            userSelect: 'none',
          }}>
            {stats.selection && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 3 }}>Selection</span>}
            <span>Words: {stats.words}</span>
            <span>Characters: {stats.chars}</span>
            <span>Reading time: {stats.readTime}</span>
            <span style={{ marginLeft: 4, opacity: 0.7 }}>|</span>
            <span>Version {version}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setStatsMinimized(v => !v)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 11, padding: '0 4px' }}
                title={statsMinimized ? 'Show full stats' : 'Minimize stats'}
              >
                {statsMinimized ? '▲' : '▼'}
              </button>
              {/* Zoom indicator */}
              <span style={{ opacity: 0.8 }}>100%</span>
            </div>
          </div>
        </div>

        {showComments && (
          <CommentsSidebar
            comments={comments}
            onResolve={resolveComment}
            onDelete={deleteComment}
            onClose={() => setShowComments(false)}
            onJumpTo={c => {
              if (!c.range || !quillRef.current) return;
              quillRef.current.setSelection(c.range.index, c.range.length);
              quillRef.current.focus();
            }}
            darkMode={darkMode}
          />
        )}

        {/* Req 6: Bookmarks sidebar */}
        {showBookmarks && (
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${border}`, background: bg }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', color: text }}>
              <span>📑 Bookmarks</span>
              <button onClick={() => setShowBookmarks(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: muted }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookmarks.length === 0 ? (
                <p style={{ color: muted, fontSize: 12, textAlign: 'center', marginTop: 24 }}>No bookmarks yet.<br />Place cursor and click 🔖</p>
              ) : (
                bookmarks.map(bm => (
                  <div key={bm.id} style={{ padding: '8px 10px', background: surface, borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                    onClick={() => jumpToBookmark(bm)}>
                    <div>
                      <div style={{ fontSize: 11, color: '#1a5fb4', fontWeight: 700, marginBottom: 2 }}>Line {bm.line} · {bm.createdAt}</div>
                      <div style={{ fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {bm.preview}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeBookmark(bm.id); }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 14, padding: '0 2px' }}>✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {showChat && (
          <div style={{ width: 320, borderLeft: `1px solid ${border}` }}>
            <Chat docId={doc._id} user={user} socket={socketRef.current} darkMode={darkMode} />
          </div>
        )}

        {showHistory && (
          <HistorySidebar 
            docId={doc._id} 
            socket={socketRef.current}
            onClose={() => setShowHistory(false)} 
            onRestore={(content, version) => {
              // Emit rollback so EVERYONE gets the update
              socketRef.current?.emit('rollback', { targetVersion: version, docId: doc._id });
            }}
            darkMode={darkMode} 
          />
        )}
      </div>

      {showTemplates && (
        <TemplateModal onSelect={applyTemplate} onClose={() => setShowTemplates(false)} darkMode={darkMode} onSaveAsTemplate={saveAsTemplate} />
      )}

      {/* 💬 Comment popover — appears near selected text */}
      {commentPopover && (
        <CommentPopover
          position={commentPopover.position}
          selectedText={commentPopover.selectedText}
          onSubmit={submitComment}
          onCancel={() => setCommentPopover(null)}
          darkMode={darkMode}
        />
      )}

      {showPublicModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowPublicModal(false)}>
          <div style={{ background: bg, borderRadius: 14, padding: 28, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: text }}>🔗 Public Share Link</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: muted }}>Anyone with this link can view (read-only)</p>
            <input readOnly value={publicLink || ''} style={{ width: '100%', padding: '9px 11px', border: `1px solid ${border}`, borderRadius: 7, fontSize: 12, background: surface, color: text, marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { navigator.clipboard.writeText(publicLink); toast('Copied!', 'success'); }} style={{ flex: 1, padding: 9, background: '#667eea', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                📋 Copy
              </button>
              <button onClick={revokePublicLink} style={{ flex: 1, padding: 9, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                🗑 Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal 
          docId={doc._id} 
          collaborators={collaborators} 
          onUpdate={setCollaborators} 
          onClose={() => setShowShareModal(false)} 
          darkMode={darkMode} 
        />
      )}
    </div>
  );
}
