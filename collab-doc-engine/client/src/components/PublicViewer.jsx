import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import api from '../services/api';

/**
 * PublicViewer — Req 10.3/10.4
 * Read-only document view for public share links.
 * No authentication required. No editing, commenting, or chat.
 */
export default function PublicViewer({ token }) {
  const editorDivRef = useRef(null);
  const quillRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/documents/public/${token}`)
      .then(({ data }) => {
        setDoc(data.doc);
        setLoading(false);
      })
      .catch(err => {
        // Req 10.6: show "Link Expired" for revoked/missing links
        const msg = err.response?.status === 404
          ? 'This link has expired or been revoked.'
          : 'Failed to load document.';
        setError(msg);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!doc || quillRef.current) return;
    const q = new Quill(editorDivRef.current, {
      theme: 'snow',
      readOnly: true,          // Req 10.4: strictly read-only
      modules: { toolbar: false },
    });
    q.setContents(doc.content?.ops ? doc.content : { ops: [] });
    quillRef.current = q;
  }, [doc]);

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: '#888', marginTop: 16 }}>Loading document…</p>
    </div>
  );

  if (error) return (
    <div style={s.center}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔗</div>
      <h2 style={{ color: '#1a1a2e', margin: '0 0 8px' }}>Link Expired</h2>
      <p style={{ color: '#888', fontSize: 14 }}>{error}</p>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Public banner */}
      <div style={s.banner}>
        🌐 Public View — Read Only
      </div>

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>📝</div>
        <div>
          <h1 style={s.title}>{doc.title}</h1>
          <p style={s.meta}>Version {doc.version} · Shared publicly · Read-only</p>
        </div>
      </div>

      {/* Editor (read-only) */}
      <div style={s.editorWrap}>
        <div ref={editorDivRef} style={s.editor} />
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span>Powered by CollabDocs</span>
        <a href="/" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
          Sign in to collaborate →
        </a>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#f8f9fa',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  banner: {
    background: '#16a34a',
    color: '#fff',
    textAlign: 'center',
    padding: '6px 0',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  header: {
    maxWidth: 860,
    margin: '32px auto 0',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    boxSizing: 'border-box',
  },
  logo: { fontSize: 40 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' },
  meta: { margin: '4px 0 0', fontSize: 13, color: '#888' },
  editorWrap: {
    flex: 1,
    maxWidth: 860,
    margin: '24px auto',
    padding: '0 24px',
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  editor: {
    minHeight: 500,
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0 32px',
    fontSize: 13,
    color: '#aaa',
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e0e0e0',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
