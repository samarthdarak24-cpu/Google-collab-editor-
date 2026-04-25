import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import PublicViewer from './components/PublicViewer';
import Notifications from './components/Notifications';
import api from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (u, t) => {
    setUser(u);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setCurrentDoc(null);
  };

  const openDoc = async (doc) => {
    try {
      const { data } = await api.get(`/documents/${doc._id}`);
      // Preserve any local state (like _pendingTemplate) passed to openDoc
      setCurrentDoc({ ...data.doc, _pendingTemplate: doc._pendingTemplate });
    } catch {
      setCurrentDoc(doc);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#888' }}>
      Loading...
    </div>
  );

  // Req 10.3: Public share link — /public/:token — no auth required
  const publicMatch = window.location.pathname.match(/^\/public\/([a-zA-Z0-9]+)$/);
  if (publicMatch) {
    return (
      <>
        <Notifications />
        <PublicViewer token={publicMatch[1]} />
      </>
    );
  }

  return (
    <>
      <Notifications />
      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : currentDoc ? (
        <Editor
          doc={currentDoc}
          user={user}
          token={token}
          onBack={() => setCurrentDoc(null)}
        />
      ) : (
        <Dashboard
          user={user}
          onOpenDoc={openDoc}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
