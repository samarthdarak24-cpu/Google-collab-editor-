const jwt = require('jsonwebtoken');
const Document = require('../models/Document');
const User = require('../models/User');
const DocumentEngine = require('../services/DocumentEngine');

const JWT_SECRET = process.env.JWT_SECRET || 'collab-doc-secret-2024';

const engines = new Map();
const docUsers = new Map(); // docId -> Map<socketId, userInfo>

function getEngine(docId, initialText = '') {
  if (!engines.has(docId)) engines.set(docId, new DocumentEngine(docId, initialText));
  return engines.get(docId);
}

const historyBuffers = new Map(); // "docId-userId" -> { delta, summary, timestamp, version }
const historyTimers = new Map();

function getDocUsers(docId) {
  if (!docUsers.has(docId)) docUsers.set(docId, new Map());
  return docUsers.get(docId);
}

module.exports = function registerCollabHandlers(io) {

  // ── Socket auth middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const { id } = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(id).select('-password');
        if (user) socket.user = user;
      }
      next();
    } catch {
      next(); // Allow connection even if token fails, join-document will check doc privacy
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] ${user.username} connected (${socket.id})`);

    // ── JOIN DOCUMENT ────────────────────────────────────────────────────
    socket.on('join-document', async ({ docId }) => {
      try {
        let doc = await Document.findById(docId);
        if (!doc) return socket.emit('error', { message: 'Document not found' });

        // Access check — must be a collaborator
        const isCollaborator = doc.collaborators.some(
          c => c.userId.toString() === user._id.toString()
        );
        if (!isCollaborator && !doc.isPublic) {
          return socket.emit('error', { message: 'Access denied. Ask the owner to share this document with you.' });
        }

        socket.join(docId);
        socket.data.docId = docId;

        const engine = getEngine(docId, doc.plainText || '');
        const users = getDocUsers(docId);

        const guestId = `Guest-${socket.id.slice(0, 4)}`;
        const userInfo = {
          userId: user?._id?.toString() || socket.id,
          username: user?.username || guestId,
          color: user?.color || '#'+Math.floor(Math.random()*16777215).toString(16),
          socketId: socket.id,
          role: user ? (doc.collaborators.find(c => c.userId.toString() === user._id.toString())?.role || 'editor') : 'viewer',
        };
        users.set(socket.id, userInfo);

        // Send full doc state to the joining user
        socket.emit('document-loaded', {
          content: doc.content,
          version: doc.version,
          title: doc.title,
          collaborators: doc.collaborators,
          activeUsers: [...users.values()],
          myRole: doc.collaborators.find(c => c.userId.toString() === user._id.toString())?.role || 'editor',
        });

        // Tell everyone else this user joined
        socket.to(docId).emit('user-joined', {
          userId: user._id.toString(),
          username: user.username,
          color: user.color,
          socketId: socket.id,
          role: users.get(socket.id).role,
        });

        // Broadcast updated user list to everyone in room
        io.to(docId).emit('active-users', [...users.values()]);

        console.log(`[Socket] ${user.username} joined doc ${docId} (${users.size} users now)`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── SEND DELTA ───────────────────────────────────────────────────────
    socket.on('send-changes', async ({ delta, docId, version }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;

      const timestamp = Date.now();

      // Build a human-readable summary of the change
      const summary = buildSummary(delta);

      const changePayload = {
        delta,
        userId: user._id.toString(),
        username: user.username,
        color: user.color,
        timestamp,
        version,
        summary,
      };

      // Broadcast to ALL OTHER users in the room
      socket.to(dId).emit('receive-changes', changePayload);

      // Also echo back to sender so their history panel updates
      socket.emit('change-confirmed', changePayload);

      // Update DocumentEngine
      const engine = engines.get(dId);
      if (engine && delta.ops) {
        const insertedText = delta.ops
          .filter(op => typeof op.insert === 'string')
          .map(op => op.insert)
          .join('');
        if (insertedText) {
          engine.applyEdit({ userId: user._id.toString(), type: 'insert', start: 0, text: insertedText, timestamp });
        }
      }

      // ── Buffer History Entry ──
      const bufferKey = `${dId}-${user._id}`;
      
      // Clear existing flush timer
      if (historyTimers.has(bufferKey)) {
        clearTimeout(historyTimers.get(bufferKey));
      }

      // Merge with existing buffer or start new one
      const currentBuffer = historyBuffers.get(bufferKey) || {
        userId: user._id,
        username: user.username,
        userColor: user.color,
        delta: { ops: [] },
        summary: [],
        timestamp: Date.now(),
        version: version,
      };

      // Simple merge of delta ops and summary
      if (delta.ops) {
        currentBuffer.delta.ops = [...currentBuffer.delta.ops, ...delta.ops];
        currentBuffer.summary = [...currentBuffer.summary, ...summary];
      }
      currentBuffer.timestamp = Date.now();
      currentBuffer.version = version;
      historyBuffers.set(bufferKey, currentBuffer);

      // Set new flush timer (30 seconds of inactivity)
      const timer = setTimeout(async () => {
        const buffer = historyBuffers.get(bufferKey);
        if (!buffer) return;

        try {
          await Document.findByIdAndUpdate(dId, {
            $push: { editHistory: buffer },
            $inc: { version: 1 },
            updatedAt: new Date(),
          });
          
          // Notify the room that history has a new entry
          io.to(dId).emit('history-updated', buffer);
          
          historyBuffers.delete(bufferKey);
          historyTimers.delete(bufferKey);
        } catch (err) {
          console.error('[Socket] History flush error:', err.message);
        }
      }, 30000); // 30 seconds

      historyTimers.set(bufferKey, timer);
    });

    // ── SAVE DOCUMENT CONTENT ────────────────────────────────────────────
    socket.on('save-document', async ({ content, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      try {
        const plainText = (content?.ops || [])
          .filter(op => typeof op.insert === 'string')
          .map(op => op.insert)
          .join('');

        await Document.findByIdAndUpdate(dId, { content, plainText, updatedAt: new Date() });

        const engine = getEngine(dId, plainText);
        engine.content = plainText;
        engine.suffixArrayDirty = true;
        engine._rebuildLineIndex();

        socket.emit('save-confirmed', { timestamp: Date.now() });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── CURSOR MOVE ──────────────────────────────────────────────────────
    socket.on('cursor-move', ({ range, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;

      const users = getDocUsers(dId);
      const u = users.get(socket.id);
      if (u) u.cursor = range;

      // Broadcast cursor to everyone ELSE
      socket.to(dId).emit('cursor-update', {
        userId: user._id.toString(),
        username: user.username,
        color: user.color,
        range,
        socketId: socket.id,
      });
    });

    // ── SEARCH ───────────────────────────────────────────────────────────
    socket.on('search', ({ query, type, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      const engine = engines.get(dId);
      if (!engine) return;

      if (type === 'autocomplete') {
        socket.emit('autocomplete-results', { query, results: engine.autocomplete(query, 8) });
      } else {
        socket.emit('search-results', { query, results: engine.searchText(query).slice(0, 20) });
      }
    });

    // ── TITLE CHANGE ─────────────────────────────────────────────────────
    socket.on('title-change', ({ title, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      socket.to(dId).emit('title-updated', { title });
    });

    // ── FEATURE: SNAPSHOT SYNC ───────────────────────────────────────────
    socket.on('broadcast-snapshot-created', async ({ docId, snapshot }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      // Broadcast to EVERYONE (including sender) to refresh their snapshot list and switch to snapshots tab
      io.to(dId).emit('snapshot-created', { 
        snapshot,
        createdBy: user.username 
      });
    });

    // ── ROLLBACK ─────────────────────────────────────────────────────────
    socket.on('rollback', async ({ targetVersion, docId }) => {
      const dId = docId || socket.data.docId;
      try {
        const doc = await Document.findById(dId, 'snapshots');
        const snap = doc?.snapshots.find(s => s.version === targetVersion);
        if (!snap) return socket.emit('error', { message: 'Snapshot not found' });
        io.to(dId).emit('rollback-applied', {
          content: snap.deltaOps,
          version: snap.version,
          requestedBy: user.username,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── FEATURE: CHAT ─────────────────────────────────────────────────────
    socket.on('chat-message', async ({ text, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId || !text?.trim()) return;
      const msg = {
        userId: user._id.toString(),
        username: user.username,
        color: user.color,
        text: text.trim().slice(0, 500),
        timestamp: Date.now(),
      };
      // Broadcast to everyone in room
      io.to(dId).emit('chat-message', msg);
      // Persist
      try {
        await Document.findByIdAndUpdate(dId, { $push: { chat: msg } });
      } catch {}
    });

    // ── FEATURE: TYPING INDICATOR ─────────────────────────────────────────
    socket.on('typing-start', ({ docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      socket.to(dId).emit('user-typing', { username: user.username, color: user.color, socketId: socket.id });
    });
    socket.on('typing-stop', ({ docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      socket.to(dId).emit('user-stopped-typing', { socketId: socket.id });
    });

    // ── FEATURE: LOCK MODE ────────────────────────────────────────────────
    socket.on('lock-document', async ({ locked, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      try {
        await Document.findByIdAndUpdate(dId, { locked });
        io.to(dId).emit('document-locked', { locked, by: user.username });
      } catch {}
    });

    // ── FEATURE: COMMENT ──────────────────────────────────────────────────
    socket.on('add-comment', ({ comment, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      // Broadcast new comment to all users
      io.to(dId).emit('comment-added', comment);
    });
    socket.on('resolve-comment', ({ commentId, docId }) => {
      const dId = docId || socket.data.docId;
      if (!dId) return;
      io.to(dId).emit('comment-resolved', { commentId });
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const dId = socket.data.docId;
      if (dId) {
        const users = getDocUsers(dId);
        users.delete(socket.id);
        socket.to(dId).emit('user-left', {
          userId: user._id.toString(),
          username: user.username,
          socketId: socket.id,
        });
        // Broadcast updated user list
        io.to(dId).emit('active-users', [...users.values()]);

        if (users.size === 0) {
          engines.delete(dId);
          docUsers.delete(dId);
        }
      }
      console.log(`[Socket] ${user.username} disconnected`);
    });
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildSummary(delta) {
  if (!delta?.ops) return 'formatting change';
  const parts = [];
  for (const op of delta.ops) {
    if (typeof op.insert === 'string') {
      const text = op.insert.replace(/\n/g, '↵');
      const preview = text.length > 50 ? text.slice(0, 50) + '…' : text;
      parts.push({ type: 'insert', text: preview, len: text.length });
    } else if (op.delete) {
      parts.push({ type: 'delete', len: op.delete });
    } else if (op.retain && op.attributes) {
      parts.push({ type: 'format', attrs: Object.keys(op.attributes) });
    }
  }
  return parts;
}
