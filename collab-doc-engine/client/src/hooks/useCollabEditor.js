/**
 * useCollabEditor - React hook for collaborative editing
 * Manages Socket.IO events, conflict detection, and version control
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { connectSocket } from '../services/socket';

export function useCollabEditor(docId, userId, token) {
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [cursors, setCursors] = useState({});       // other users' cursors
  const [conflicts, setConflicts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);

  const socketRef = useRef(null);
  const pendingOps = useRef([]);  // local ops not yet confirmed

  useEffect(() => {
    if (!docId || !userId) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-document', { docId, userId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('document-loaded', ({ content, version, stats }) => {
      setContent(content);
      setVersion(version);
      setStats(stats);
    });

    socket.on('edit-applied', ({ op, version, conflicts }) => {
      // Only apply remote edits (not our own echoed back)
      if (op.userId !== userId) {
        setContent(prev => applyOpToContent(prev, op));
      }
      setVersion(version);
      if (conflicts?.length > 0) setConflicts(conflicts);
    });

    socket.on('conflict-detected', ({ conflicts }) => {
      setConflicts(conflicts);
    });

    socket.on('cursor-update', ({ userId: uid, position, selection }) => {
      setCursors(prev => ({ ...prev, [uid]: { position, selection } }));
    });

    socket.on('autocomplete-results', ({ results }) => {
      setSuggestions(results);
    });

    socket.on('search-results', ({ results }) => {
      setSearchResults(results);
    });

    socket.on('stats', (s) => setStats(s));

    socket.on('user-joined', ({ userId: uid }) => {
      setActiveUsers(prev => [...new Set([...prev, uid])]);
    });

    socket.on('user-left', ({ userId: uid }) => {
      setActiveUsers(prev => prev.filter(u => u !== uid));
      setCursors(prev => { const n = { ...prev }; delete n[uid]; return n; });
    });

    socket.on('rollback-applied', ({ newVersion }) => {
      setVersion(newVersion);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('document-loaded');
      socket.off('edit-applied');
      socket.off('conflict-detected');
      socket.off('cursor-update');
      socket.off('autocomplete-results');
      socket.off('search-results');
      socket.off('stats');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('rollback-applied');
      // Don't call disconnectSocket here — Editor.jsx manages the shared socket lifecycle
    };
  }, [docId, userId, token]);

  // Send an edit operation
  const sendEdit = useCallback((op) => {
    if (!socketRef.current?.connected) return;
    const fullOp = { ...op, docId, userId, timestamp: Date.now() };
    socketRef.current.emit('edit', fullOp);
    // Optimistic update
    setContent(prev => applyOpToContent(prev, fullOp));
  }, [docId, userId]);

  // Send cursor position
  const sendCursor = useCallback((position, selection = null) => {
    socketRef.current?.emit('cursor-move', { position, selection });
  }, []);

  // Autocomplete
  const requestAutocomplete = useCallback((prefix) => {
    socketRef.current?.emit('search', { query: prefix, type: 'autocomplete' });
  }, []);

  // Full-text search
  const searchDocument = useCallback((query) => {
    socketRef.current?.emit('search', { query, type: 'fulltext' });
  }, []);

  // Rollback to version
  const rollback = useCallback((targetVersion) => {
    socketRef.current?.emit('rollback', { targetVersion });
  }, []);

  // Get stats — server emits 'stats' after save-document; this is a no-op client-side trigger
  const refreshStats = useCallback(() => {
    // Stats are pushed by the server after save-document events; nothing to emit
  }, []);

  return {
    content,
    version,
    cursors,
    conflicts,
    suggestions,
    searchResults,
    stats,
    connected,
    activeUsers,
    sendEdit,
    sendCursor,
    requestAutocomplete,
    searchDocument,
    rollback,
    refreshStats,
  };
}

// Pure function: apply an operation to content string
function applyOpToContent(content, op) {
  const { type, start, end, text } = op;
  if (type === 'insert') return content.slice(0, start) + text + content.slice(start);
  if (type === 'delete') return content.slice(0, start) + content.slice(end);
  if (type === 'replace') return content.slice(0, start) + text + content.slice(end);
  return content;
}
