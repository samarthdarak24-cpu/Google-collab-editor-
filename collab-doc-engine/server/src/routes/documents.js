const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const User = require('../models/User');
const HuffmanCoding = require('../dataStructures/HuffmanTree');

// GET /api/documents — list user's documents
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Document.find({
      'collaborators.userId': req.user._id,
    }, '_id title version updatedAt collaborators isPublic').sort({ updatedAt: -1 });
    res.json({ docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents — create new document
router.post('/', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await Document.create({
      _id: uuidv4(),
      title: title || 'Untitled Document',
      content: { ops: [] },
      collaborators: [{
        userId: req.user._id,
        username: req.user.username,
        role: 'owner',
      }],
    });
    res.status(201).json({ doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/:token — open public doc (no auth) — must be before /:id
router.get('/public/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ publicToken: req.params.token, isPublic: true });
    if (!doc) return res.status(404).json({ error: 'Link not found or expired' });
    res.json({ doc: { _id: doc._id, title: doc.title, content: doc.content, version: doc.version } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/documents/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const isCollaborator = doc.collaborators.some(
      c => c.userId.toString() === req.user._id.toString()
    );
    if (!isCollaborator && !doc.isPublic)
      return res.status(403).json({ error: 'Access denied' });

    res.json({ doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/documents/:id/title
router.patch('/:id/title', auth, async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title, updatedAt: new Date() },
      { new: true }
    );
    res.json({ title: doc.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/share — add collaborator
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { email, role = 'editor' } = req.body;
    const targetUser = await User.findOne({ email });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const already = doc.collaborators.some(
      c => c.userId.toString() === targetUser._id.toString()
    );
    if (!already) {
      doc.collaborators.push({ userId: targetUser._id, username: targetUser.username, role });
      await doc.save();
    }
    res.json({ message: 'Shared successfully', collaborators: doc.collaborators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, 'editHistory version isPublic collaborators');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    
    // Check access
    const authHeader = req.headers.authorization;
    let hasAccess = doc.isPublic;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const { id } = jwt.verify(token, process.env.JWT_SECRET || 'collab-doc-secret-2024');
        if (doc.collaborators.some(c => c.userId.toString() === id)) hasAccess = true;
      } catch {}
    }
    
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
    res.json({ history: doc.editHistory.slice(-100).reverse(), version: doc.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/snapshot — save a version checkpoint
router.post('/:id/snapshot', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    let username = 'Guest';
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const { id } = jwt.verify(token, process.env.JWT_SECRET || 'collab-doc-secret-2024');
        const user = await User.findById(id);
        if (user) username = user.username;
      } catch {}
    }

    // Generate change summary from history
    const lastSnap = doc.snapshots[doc.snapshots.length - 1];
    const since = lastSnap ? lastSnap.timestamp : 0;
    const historySince = doc.editHistory.filter(h => h.timestamp > since);
    
    const descriptions = [];
    historySince.forEach(h => {
      if (Array.isArray(h.summary)) {
        h.summary.forEach(s => {
          if (s.type === 'insert') descriptions.push(`Added text`);
          else if (s.type === 'delete') descriptions.push(`Deleted text`);
        });
      }
    });
    const summary = descriptions.length > 0 
      ? [...new Set(descriptions)].join(', ') 
      : 'Minor updates';

    const newSnapshot = {
      version: doc.version,
      deltaOps: doc.content,
      timestamp: Date.now(),
      savedBy: username,
      label: req.body.label || `Version ${new Date().toLocaleTimeString()}`,
      changeDescription: summary
    };

    doc.snapshots.push(newSnapshot);
    await doc.save();

    // Use a global event to tell the Editor to broadcast a refresh
    res.json({ message: 'Snapshot saved', snapshot: newSnapshot });
  } catch (err) {
    console.error('Snapshot Error:', err);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// GET /api/documents/:id/snapshots
router.get('/:id/snapshots', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, 'snapshots isPublic collaborators');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    
    let hasAccess = doc.isPublic;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const { id } = jwt.verify(token, process.env.JWT_SECRET || 'collab-doc-secret-2024');
        if (doc.collaborators.some(c => c.userId.toString() === id)) hasAccess = true;
      } catch {}
    }

    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const list = doc.snapshots.map(s => ({
      version: s.version,
      timestamp: s.timestamp,
      savedBy: s.savedBy,
      label: s.label,
      changeDescription: s.changeDescription,
    }));
    res.json({ snapshots: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/snapshots/:version — restore
router.get('/:id/snapshots/:version', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, 'snapshots isPublic collaborators');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    
    let hasAccess = doc.isPublic;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const { id } = jwt.verify(token, process.env.JWT_SECRET || 'collab-doc-secret-2024');
        if (doc.collaborators.some(c => c.userId.toString() === id)) hasAccess = true;
      } catch {}
    }

    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const snap = doc.snapshots.find(s => s.version === Number(req.params.version));
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
    res.json({ content: snap.deltaOps, version: snap.version, timestamp: snap.timestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id/collaborators/:userId — remove a collaborator
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Only owner can remove collaborators
    const requester = doc.collaborators.find(c => c.userId.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'owner')
      return res.status(403).json({ error: 'Only the owner can remove collaborators' });

    // Cannot remove the owner
    const target = doc.collaborators.find(c => c.userId.toString() === req.params.userId);
    if (target?.role === 'owner')
      return res.status(400).json({ error: 'Cannot remove the owner' });

    doc.collaborators = doc.collaborators.filter(c => c.userId.toString() !== req.params.userId);
    await doc.save();
    res.json({ message: 'Removed', collaborators: doc.collaborators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Feature: Public Share Link ─────────────────────────────────────────────
// POST /api/documents/:id/public-link — generate public token
router.post('/:id/public-link', auth, async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const token = uuidv4().replace(/-/g, '').slice(0, 16);
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { isPublic: true, publicToken: token },
      { new: true }
    );
    res.json({ publicToken: doc.publicToken, link: `http://localhost:3000/public/${doc.publicToken}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/documents/:id/public-link — revoke
router.delete('/:id/public-link', auth, async (req, res) => {
  try {
    await Document.findByIdAndUpdate(req.params.id, { isPublic: false, publicToken: null });
    res.json({ message: 'Public link revoked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Feature: Lock Mode ─────────────────────────────────────────────────────
// PATCH /api/documents/:id/lock
router.patch('/:id/lock', auth, async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { locked: req.body.locked },
      { new: true }
    );
    res.json({ locked: doc.locked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Feature: Export ────────────────────────────────────────────────────────
// GET /api/documents/:id/export?format=txt|html|json
router.get('/:id/export', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const fmt = req.query.format || 'txt';

    if (fmt === 'json') {
      // Cross-feature: include document stats in JSON export
      const plainText = doc.plainText || '';
      const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
      const chars = plainText.length;
      const readTime = Math.ceil(words / 200) < 1 ? '< 1 min' : `${Math.ceil(words / 200)} min`;
      const exportData = {
        title: doc.title,
        content: doc.content,
        version: doc.version,
        stats: { words, chars, readTime },
        exportedAt: new Date().toISOString(),
      };
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(exportData, null, 2));
    }
    if (fmt === 'html') {
      const ops = doc.content?.ops || [];
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title}</title><style>body{font-family:Inter,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;line-height:1.7}footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:12px;color:#888}</style></head><body>`;
      html += `<h1>${doc.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h1>`;
      for (const op of ops) {
        if (typeof op.insert === 'string') {
          let text = op.insert.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          if (op.attributes?.bold) text = `<strong>${text}</strong>`;
          if (op.attributes?.italic) text = `<em>${text}</em>`;
          if (op.attributes?.underline) text = `<u>${text}</u>`;
          if (op.attributes?.header === 1) text = `<h1>${text}</h1>`;
          else if (op.attributes?.header === 2) text = `<h2>${text}</h2>`;
          else if (op.attributes?.header === 3) text = `<h3>${text}</h3>`;
          else html += text.replace(/\n/g, '<br>');
          if (op.attributes?.header) html += text;
        }
      }
      // Cross-feature: optional stats footer in HTML export
      const plainText = doc.plainText || '';
      const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
      html += `<footer>📝 ${words} words &nbsp;·&nbsp; v${doc.version} &nbsp;·&nbsp; Exported ${new Date().toLocaleDateString()}</footer>`;
      html += '</body></html>';
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.html"`);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }
    // Default: plain text
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.txt"`);
    res.setHeader('Content-Type', 'text/plain');
    return res.send(doc.plainText || '');
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Feature: Comments ──────────────────────────────────────────────────────
// GET /api/documents/:id/comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, 'comments');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ comments: doc.comments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/documents/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text, range, selectedText } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const comment = {
      id: uuidv4(),
      userId: req.user._id,
      username: req.user.username,
      color: req.user.color,
      text,
      selectedText: selectedText || '',
      range,
      resolved: false,
      timestamp: Date.now(),
    };
    await Document.findByIdAndUpdate(req.params.id, { $push: { comments: comment } });
    res.status(201).json({ comment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/documents/:id/comments/:commentId/resolve
router.patch('/:id/comments/:commentId/resolve', auth, async (req, res) => {
  try {
    await Document.updateOne(
      { _id: req.params.id, 'comments.id': req.params.commentId },
      { $set: { 'comments.$.resolved': true } }
    );
    res.json({ message: 'Resolved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/documents/:id/comments/:commentId
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    await Document.updateOne(
      { _id: req.params.id },
      { $pull: { comments: { id: req.params.commentId } } }
    );
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Feature: Chat ──────────────────────────────────────────────────────────
// GET /api/documents/:id/chat
router.get('/:id/chat', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, 'chat');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ messages: doc.chat.slice(-100) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
