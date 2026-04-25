import React, { useState, useRef, useEffect } from 'react';

// ─── CommentPopover ───────────────────────────────────────────────────────────
// Floating input that appears near selected text when user clicks 💬 Comment
export function CommentPopover({ position, selectedText, onSubmit, onCancel, darkMode }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const bg     = darkMode ? '#313244' : '#fff';
  const border = darkMode ? '#45475a' : '#e0e0e0';
  const color  = darkMode ? '#cdd6f4' : '#1a1a2e';
  const muted  = darkMode ? '#6c7086' : '#888';

  // Auto-focus input when popover opens
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  // Clamp position so popover stays inside viewport
  const top  = Math.min(position.top,  window.innerHeight - 200);
  const left = Math.min(Math.max(position.left, 8), window.innerWidth - 320);

  return (
    <>
      {/* Backdrop — click outside to cancel */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, zIndex: 1998 }}
      />
      <div style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1999,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 16,
        width: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Selected text preview */}
        {selectedText && (
          <div style={{
            background: darkMode ? '#1e1e2e' : '#f8f9fa',
            border: `1px solid ${border}`,
            borderLeft: '3px solid #667eea',
            borderRadius: 6,
            padding: '6px 10px',
            marginBottom: 10,
            fontSize: 12,
            color: muted,
            maxHeight: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            "{selectedText.length > 80 ? selectedText.slice(0, 80) + '…' : selectedText}"
          </div>
        )}

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder="Add a comment… (Ctrl+Enter to submit)"
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: `1px solid ${border}`,
            borderRadius: 8,
            background: darkMode ? '#1e1e2e' : '#f8f9fa',
            color,
            fontSize: 13,
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{
              flex: 1,
              padding: '8px 0',
              background: text.trim() ? '#667eea' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            💬 Comment
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: muted,
              border: `1px solid ${border}`,
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── CommentsSidebar ──────────────────────────────────────────────────────────
// Full sidebar showing all comments with resolve, delete, filter tabs
export function CommentsSidebar({
  comments,
  onResolve,
  onDelete,
  onClose,
  onJumpTo,
  darkMode,
}) {
  const [tab, setTab] = useState('open'); // 'open' | 'resolved' | 'all'

  const bg      = darkMode ? '#1e1e2e' : '#fff';
  const surface = darkMode ? '#313244' : '#f8f9fa';
  const border  = darkMode ? '#45475a' : '#e0e0e0';
  const color   = darkMode ? '#cdd6f4' : '#1a1a2e';
  const muted   = darkMode ? '#6c7086' : '#888';

  const filtered = comments.filter(c => {
    if (tab === 'open')     return !c.resolved;
    if (tab === 'resolved') return c.resolved;
    return true;
  });

  const openCount     = comments.filter(c => !c.resolved).length;
  const resolvedCount = comments.filter(c =>  c.resolved).length;

  const formatTime = ts => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
           ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      width: 320,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: `1px solid ${border}`,
      background: bg,
      fontFamily: 'Inter, sans-serif',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: `1px solid ${border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>
          📌 Comments
          {openCount > 0 && (
            <span style={{
              marginLeft: 8,
              background: '#667eea',
              color: '#fff',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 7px',
            }}>
              {openCount}
            </span>
          )}
        </span>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: muted, lineHeight: 1 }}
        >✕</button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${border}`,
        background: surface,
      }}>
        {[
          { key: 'open',     label: `Open (${openCount})` },
          { key: 'resolved', label: `Resolved (${resolvedCount})` },
          { key: 'all',      label: `All (${comments.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #667eea' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.key ? '#667eea' : muted,
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {tab === 'resolved' ? '✅' : '💬'}
            </div>
            <p style={{ color: muted, fontSize: 13 }}>
              {tab === 'resolved' ? 'No resolved comments' :
               tab === 'open'     ? 'No open comments.\nSelect text and click 💬 Comment' :
               'No comments yet'}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              onResolve={onResolve}
              onDelete={onDelete}
              onJumpTo={onJumpTo}
              darkMode={darkMode}
              bg={bg}
              surface={surface}
              border={border}
              color={color}
              muted={muted}
              formatTime={formatTime}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── CommentCard ──────────────────────────────────────────────────────────────
function CommentCard({ comment: c, onResolve, onDelete, onJumpTo, darkMode, bg, surface, border, color, muted, formatTime }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 12,
        background: surface,
        borderRadius: 10,
        border: `1px solid ${c.resolved ? border : '#667eea44'}`,
        opacity: c.resolved ? 0.6 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
        position: 'relative',
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: c.color || '#667eea',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {(c.username || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.color || '#667eea' }}>
            {c.username}
          </span>
          {c.resolved && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#2ecc71', fontWeight: 600 }}>
              ✓ Resolved
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>
          {formatTime(c.timestamp)}
        </span>
      </div>

      {/* Quoted text */}
      {c.selectedText && (
        <div style={{
          background: darkMode ? '#1e1e2e' : '#f0f4ff',
          borderLeft: `3px solid ${c.color || '#667eea'}`,
          borderRadius: '0 4px 4px 0',
          padding: '4px 8px',
          marginBottom: 6,
          fontSize: 11,
          color: muted,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: onJumpTo ? 'pointer' : 'default',
        }}
          onClick={() => onJumpTo && onJumpTo(c)}
          title={onJumpTo ? 'Click to jump to text' : ''}
        >
          "{c.selectedText.length > 60 ? c.selectedText.slice(0, 60) + '…' : c.selectedText}"
        </div>
      )}

      {/* Comment text */}
      <p style={{ margin: 0, fontSize: 13, color, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {c.text}
      </p>

      {/* Action buttons — show on hover */}
      {(hovered || c.resolved) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {!c.resolved && onResolve && (
            <button
              onClick={() => onResolve(c.id)}
              style={{
                padding: '4px 10px',
                background: '#dcfce7',
                color: '#16a34a',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ✓ Resolve
            </button>
          )}
          {onJumpTo && c.range && (
            <button
              onClick={() => onJumpTo(c)}
              style={{
                padding: '4px 10px',
                background: darkMode ? '#313244' : '#f0f4ff',
                color: '#667eea',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ↗ Jump
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(c.id)}
              style={{
                padding: '4px 10px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                marginLeft: 'auto',
              }}
            >
              🗑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
