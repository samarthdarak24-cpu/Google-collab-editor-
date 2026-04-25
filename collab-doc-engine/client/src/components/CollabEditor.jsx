import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useCollabEditor } from '../hooks/useCollabEditor';

const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c'];

export default function CollabEditor({ docId, userId, token }) {
  const editorRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const debounceRef = useRef(null);

  const {
    content, version, cursors, conflicts, suggestions,
    searchResults, stats, connected, activeUsers,
    sendEdit, sendCursor, requestAutocomplete,
    searchDocument, rollback, refreshStats,
  } = useCollabEditor(docId, userId);

  // Handle text changes in the editor
  const handleInput = useCallback((e) => {
    const newContent = e.target.value;
    const selStart = e.target.selectionStart;

    // Determine operation type by comparing lengths
    const prevContent = content;
    if (newContent.length > prevContent.length) {
      const insertedText = newContent.slice(selStart - (newContent.length - prevContent.length), selStart);
      sendEdit({ type: 'insert', start: selStart - insertedText.length, text: insertedText });

      // Autocomplete: detect current word
      const wordMatch = newContent.slice(0, selStart).match(/\b(\w+)$/);
      if (wordMatch && wordMatch[1].length >= 2) {
        setCurrentWord(wordMatch[1]);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          requestAutocomplete(wordMatch[1]);
          setShowSuggestions(true);
        }, 200);
      }
    } else if (newContent.length < prevContent.length) {
      const deleteCount = prevContent.length - newContent.length;
      sendEdit({ type: 'delete', start: selStart, end: selStart + deleteCount });
      setShowSuggestions(false);
    }
  }, [content, sendEdit, requestAutocomplete]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setShowSuggestions(false);
  }, []);

  const handleSelectionChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    sendCursor(el.selectionStart, {
      start: el.selectionStart,
      end: el.selectionEnd,
    });
  }, [sendCursor]);

  const applySuggestion = (word) => {
    const el = editorRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = content.slice(0, pos);
    const wordStart = before.search(/\b\w+$/);
    sendEdit({ type: 'replace', start: wordStart, end: pos, text: word });
    setShowSuggestions(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) searchDocument(searchQuery.trim());
  };

  useEffect(() => {
    refreshStats();
  }, [version]);

  const userColor = (uid) => COLORS[uid.charCodeAt(0) % COLORS.length];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.statusBar}>
          <span style={{ color: connected ? '#2ecc71' : '#e74c3c' }}>
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
          <span style={styles.version}>v{version}</span>
          {activeUsers.map(uid => (
            <span key={uid} style={{ ...styles.userBadge, background: userColor(uid) }}>
              {uid.slice(0, 6)}
            </span>
          ))}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={styles.searchBar}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search document..."
            style={styles.searchInput}
          />
          <button type="submit" style={styles.btn}>Search</button>
        </form>
      </div>

      {/* Conflict banner */}
      {conflicts.length > 0 && (
        <div style={styles.conflictBanner}>
          ⚠ {conflicts.length} conflict(s) detected in overlapping regions
        </div>
      )}

      {/* Editor area */}
      <div style={styles.editorWrapper}>
        <textarea
          ref={editorRef}
          value={content}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onChange={() => {}} // controlled
          style={styles.editor}
          spellCheck={false}
          placeholder="Start typing to collaborate..."
        />

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={styles.suggestions}>
            {suggestions.map((word, i) => (
              <div
                key={i}
                style={styles.suggestionItem}
                onMouseDown={() => applySuggestion(word)}
              >
                {word}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div style={styles.searchResults}>
          <strong>{searchResults.length} result(s)</strong>
          {searchResults.slice(0, 5).map((r, i) => (
            <div key={i} style={styles.searchResult}>
              <span style={styles.position}>pos {r.position}</span>
              <span>...{r.context}...</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats panel */}
      {stats && (
        <div style={styles.statsPanel}>
          <span>Lines: {stats.lineCount}</span>
          <span>Versions: {stats.versionCount}</span>
          <span>Editors: {stats.activeEditors}</span>
          <span>Conflicts: {stats.conflicts}</span>
          <button style={styles.btnSmall} onClick={() => rollback(Math.max(0, version - 1))}>
            ↩ Rollback
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'monospace', background: '#1e1e2e', color: '#cdd6f4' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#181825', borderBottom: '1px solid #313244' },
  statusBar: { display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 },
  version: { color: '#89b4fa', fontSize: 12 },
  userBadge: { padding: '2px 8px', borderRadius: 12, fontSize: 11, color: '#fff' },
  searchBar: { display: 'flex', gap: 8 },
  searchInput: { background: '#313244', border: 'none', color: '#cdd6f4', padding: '6px 12px', borderRadius: 6, outline: 'none', width: 220 },
  btn: { background: '#89b4fa', border: 'none', color: '#1e1e2e', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  btnSmall: { background: '#f38ba8', border: 'none', color: '#1e1e2e', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  conflictBanner: { background: '#f38ba8', color: '#1e1e2e', padding: '6px 16px', fontSize: 13, fontWeight: 600 },
  editorWrapper: { position: 'relative', flex: 1 },
  editor: { width: '100%', height: '100%', background: '#1e1e2e', color: '#cdd6f4', border: 'none', outline: 'none', padding: 24, fontSize: 15, lineHeight: 1.7, resize: 'none', boxSizing: 'border-box', fontFamily: 'monospace' },
  suggestions: { position: 'absolute', top: 40, left: 24, background: '#313244', border: '1px solid #45475a', borderRadius: 6, zIndex: 100, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' },
  suggestionItem: { padding: '8px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #45475a' },
  searchResults: { background: '#181825', borderTop: '1px solid #313244', padding: '10px 16px', maxHeight: 160, overflowY: 'auto' },
  searchResult: { display: 'flex', gap: 12, padding: '4px 0', fontSize: 13, borderBottom: '1px solid #313244' },
  position: { color: '#89b4fa', minWidth: 60 },
  statsPanel: { display: 'flex', gap: 20, alignItems: 'center', padding: '8px 16px', background: '#181825', borderTop: '1px solid #313244', fontSize: 12, color: '#a6adc8' },
};
