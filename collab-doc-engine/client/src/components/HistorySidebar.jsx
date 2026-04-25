import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from './Notifications';

export default function HistorySidebar({ docId, socket, onClose, onRestore, darkMode }) {
  const [history, setHistory] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live'); // 'live' | 'snapshots'

  const bg      = darkMode ? '#1e1e2e' : '#fff';
  const surface = darkMode ? '#313244' : '#f8f9fa';
  const border  = darkMode ? '#45475a' : '#e0e0e0';
  const color   = darkMode ? '#cdd6f4' : '#1a1a2e';
  const muted   = darkMode ? '#6c7086' : '#888';

  useEffect(() => {
    fetchHistory();

    if (socket) {
      const handler = (newEntry) => {
        setHistory(prev => [newEntry, ...prev.slice(0, 99)]);
      };
      const onSnapshotCreated = ({ snapshot, createdBy }) => {
        // Add the new snapshot to the list immediately without refetching
        if (snapshot) {
          setSnapshots(prev => [...prev, {
            version: snapshot.version,
            timestamp: snapshot.timestamp,
            savedBy: snapshot.savedBy,
            label: snapshot.label,
            changeDescription: snapshot.changeDescription,
          }]);
        }
        // Auto-switch ALL collaborators to snapshots tab
        setTab('snapshots');
        // Show notification about who created it
        if (createdBy) {
          toast(`${createdBy} saved a new version`, 'info');
        }
      };
      socket.on('history-updated', handler);
      socket.on('snapshot-created', onSnapshotCreated);
      return () => {
        socket.off('history-updated', handler);
        socket.off('snapshot-created', onSnapshotCreated);
      };
    }
  }, [docId, socket]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      console.log('Fetching history for docId:', docId);
      const [hRes, sRes] = await Promise.all([
        api.get(`/documents/${docId}/history`),
        api.get(`/documents/${docId}/snapshots`)
      ]);
      console.log('History fetched:', hRes.data.history?.length || 0, 'entries');
      console.log('Snapshots fetched:', sRes.data.snapshots?.length || 0, 'snapshots');
      setHistory(hRes.data.history || []);
      setSnapshots(sRes.data.snapshots || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      toast(`Failed to load history: ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async () => {
    const label = window.prompt('Enter a name for this version:', `Version ${new Date().toLocaleTimeString()}`);
    if (!label) return;
    
    try {
      console.log('Creating snapshot for docId:', docId, 'with label:', label);
      const { data } = await api.post(`/documents/${docId}/snapshot`, { label });
      console.log('Snapshot created successfully:', data);
      
      toast('Snapshot created', 'success');
      
      // Notify ALL collaborators (including self) via socket with the snapshot data
      if (socket) {
        socket.emit('broadcast-snapshot-created', { 
          docId,
          snapshot: data.snapshot 
        });
      } else {
        console.warn('Socket not available, manually updating local state');
        // If socket is not available, update local state directly
        if (data.snapshot) {
          setSnapshots(prev => [...prev, {
            version: data.snapshot.version,
            timestamp: data.snapshot.timestamp,
            savedBy: data.snapshot.savedBy,
            label: data.snapshot.label,
            changeDescription: data.snapshot.changeDescription,
          }]);
        }
      }
    } catch (err) {
      console.error('Failed to create snapshot:', err);
      toast(`Failed to save snapshot: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  const restoreSnapshot = async (version) => {
    if (!window.confirm(`Are you sure you want to restore to version ${version}? Current unsaved changes might be lost.`)) return;
    try {
      const { data } = await api.get(`/documents/${docId}/snapshots/${version}`);
      onRestore(data.content, version);
      toast(`Restored to version ${version}`, 'success');
      onClose();
    } catch {
      toast('Failed to restore', 'error');
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
      zIndex: 100,
    }}>
      <div style={{ padding: '16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, color }}>🕒 History</h3>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: muted }}>✕</button>
      </div>

      <div style={{ display: 'flex', background: surface, padding: '4px' }}>
        <button 
          onClick={() => setTab('live')}
          style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'live' ? bg : 'transparent', borderRadius: 6, fontSize: 12, fontWeight: 600, color: tab === 'live' ? '#667eea' : muted, cursor: 'pointer' }}
        >
          Recent Edits
        </button>
        <button 
          onClick={() => setTab('snapshots')}
          style={{ flex: 1, padding: '8px', border: 'none', background: tab === 'snapshots' ? bg : 'transparent', borderRadius: 6, fontSize: 12, fontWeight: 600, color: tab === 'snapshots' ? '#667eea' : muted, cursor: 'pointer' }}
        >
          Snapshots
        </button>
      </div>

      {tab === 'live' && (
        <div style={{ padding: '8px 12px', background: 'rgba(102, 126, 234, 0.1)', borderBottom: `1px solid ${border}`, fontSize: 10, color: '#667eea', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⏱️</span>
          <span>Changes are saved to history after 30 seconds of inactivity</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: muted }}>Loading...</div>
        ) : tab === 'live' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: muted, fontSize: 12, marginTop: 20 }}>No edits recorded yet.</div>
            ) : (
              history.map((item, i) => {
                // Consolidate summary into readable inline format
                const changes = [];
                if (Array.isArray(item.summary)) {
                  let insertedText = [];
                  let deletedChars = 0;
                  let formattedAttrs = [];

                  item.summary.forEach(s => {
                    if (s.type === 'insert' && s.text) {
                      insertedText.push(s.text);
                    } else if (s.type === 'delete') {
                      deletedChars += s.len || 0;
                    } else if (s.type === 'format' && s.attrs) {
                      formattedAttrs.push(...s.attrs);
                    }
                  });

                  if (insertedText.length > 0) {
                    const fullText = insertedText.join('');
                    changes.push({
                      type: 'insert',
                      text: fullText.length > 100 ? fullText.slice(0, 100) + '…' : fullText,
                      color: '#2ecc71'
                    });
                  }
                  if (deletedChars > 0) {
                    changes.push({
                      type: 'delete',
                      text: `${deletedChars} character${deletedChars > 1 ? 's' : ''}`,
                      color: '#e74c3c'
                    });
                  }
                  if (formattedAttrs.length > 0) {
                    changes.push({
                      type: 'format',
                      text: [...new Set(formattedAttrs)].join(', '),
                      color: '#667eea'
                    });
                  }
                }

                return (
                  <div key={i} style={{ padding: '10px', borderRadius: 8, background: surface, border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.userColor || '#667eea' }}>{item.username}</span>
                      <span style={{ fontSize: 10, color: muted }}>{formatTime(item.timestamp)}</span>
                    </div>
                    {changes.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {changes.map((change, ci) => (
                          <div key={ci} style={{ fontSize: 11, color: change.color, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ fontWeight: 700, minWidth: 50 }}>
                              {change.type === 'insert' ? '+ Added:' : change.type === 'delete' ? '- Deleted:' : '✎ Format:'}
                            </span>
                            <span style={{ flex: 1, wordBreak: 'break-word', fontFamily: change.type === 'insert' ? 'monospace' : 'inherit' }}>
                              {change.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: muted, fontStyle: 'italic' }}>Formatting change</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={createSnapshot} style={{ width: '100%', padding: '10px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
              + Save Current Version
            </button>
            {snapshots.length === 0 ? (
              <div style={{ textAlign: 'center', color: muted, fontSize: 12, marginTop: 20 }}>No snapshots saved.</div>
            ) : (
              [...snapshots].reverse().map((s, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: 8, background: surface, border: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: muted }}>{new Date(s.timestamp).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#667eea', marginBottom: 4 }}>By {s.savedBy}</div>
                    {s.changeDescription && (
                      <div style={{ fontSize: 10, fontStyle: 'italic', color: '#2ecc71', background: 'rgba(46, 204, 113, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                        📝 {s.changeDescription}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => restoreSnapshot(s.version)}
                    style={{ padding: '6px 10px', background: 'transparent', border: `1px solid #667eea`, color: '#667eea', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
