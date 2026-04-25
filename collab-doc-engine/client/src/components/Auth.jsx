import React, { useState } from 'react';
import api from '../services/api';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>📝</div>
        <h1 style={s.title}>CollabDocs</h1>
        <p style={s.sub}>Real-time collaborative editing</p>

        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(mode === 'login' ? s.activeTab : {}) }} onClick={() => setMode('login')}>Login</button>
          <button style={{ ...s.tab, ...(mode === 'register' ? s.activeTab : {}) }} onClick={() => setMode('register')}>Register</button>
        </div>

        <form onSubmit={submit} style={s.form}>
          {mode === 'register' && (
            <input name="username" placeholder="Username" value={form.username} onChange={handle} style={s.input} required />
          )}
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handle} style={s.input} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handle} style={s.input} required />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { textAlign: 'center', margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  sub: { textAlign: 'center', color: '#888', margin: '0 0 24px', fontSize: 14 },
  tabs: { display: 'flex', marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' },
  tab: { flex: 1, padding: '10px 0', border: 'none', background: '#f5f5f5', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#666' },
  activeTab: { background: '#667eea', color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' },
  error: { color: '#e74c3c', fontSize: 13, margin: 0 },
  btn: { padding: '13px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
};
