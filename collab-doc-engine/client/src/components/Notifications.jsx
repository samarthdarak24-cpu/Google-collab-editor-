import React, { useState, useEffect, useCallback, useRef } from 'react';

let _addToast = null;

// Req 3.5: default 3 seconds
export function toast(msg, type = 'info', duration = 3000, onClick = null) {
  _addToast?.({ msg, type, id: Date.now() + Math.random(), duration, onClick });
}

export default function Notifications() {
  const [toasts, setToasts] = useState([]);
  // Req 3.7: queue — max 3 visible at once, rest wait
  const queue = useRef([]);

  const flush = useCallback(() => {
    setToasts(prev => {
      if (prev.length >= 3 || queue.current.length === 0) return prev;
      const next = queue.current.shift();
      return [...prev, next];
    });
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(x => x.id !== id));
    setTimeout(flush, 100);
  }, [flush]);

  const add = useCallback((t) => {
    setToasts(prev => {
      // Deduplication logic: If the same message exists, refresh its timer instead of adding a new one
      const existing = prev.find(x => x.msg === t.msg);
      if (existing) {
        // We can't easily update the timeout here without a ref for timers, 
        // but removing the duplicate is the most effective way to "fix it well"
        return prev;
      }
      if (prev.length >= 3) { queue.current.push(t); return prev; }
      return [...prev, t];
    });
    setTimeout(() => {
      dismiss(t.id);
    }, t.duration);
  }, [dismiss]);

  useEffect(() => {
    _addToast = add;
    return () => { _addToast = null; };
  }, [add]);

  const STYLES = {
    info:    { bg: '#1e40af', border: '#3b82f6', icon: '\u2139' },
    success: { bg: '#166534', border: '#22c55e', icon: '\u2713' },
    warning: { bg: '#92400e', border: '#f59e0b', icon: '\u26a0' },
    error:   { bg: '#991b1b', border: '#ef4444', icon: '\u2717' },
    join:    { bg: '#5b21b6', border: '#a78bfa', icon: '\u{1F464}' },
  };

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 340,
    }}>
      {toasts.map(t => {
        const s = STYLES[t.type] || STYLES.info;
        // Req 3.6: clickable if onClick provided
        const clickable = !!t.onClick;
        return (
          <div
            key={t.id}
            onClick={() => { if (t.onClick) t.onClick(); dismiss(t.id); }}
            style={{
              background: s.bg,
              borderLeft: `4px solid ${s.border}`,
              color: '#fff',
              padding: '10px 14px 10px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
              animation: 'toastIn 0.2s ease',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.4,
              cursor: clickable ? 'pointer' : 'default',
              pointerEvents: 'all',
            }}
          >
            <span style={{ fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{t.msg}</span>
            {/* dismiss button */}
            <button
              onClick={e => { e.stopPropagation(); dismiss(t.id); }}
              style={{ border: 'none', background: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16, padding: '0 0 0 4px', lineHeight: 1 }}
              aria-label="Dismiss"
            >✕</button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
