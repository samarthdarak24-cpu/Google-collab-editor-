/**
 * MongoDB Model Tests
 * These tests require an active MongoDB connection.
 * They are skipped in CI/unit test environments without a DB.
 */

const mongoose = require('mongoose');
const User = require('../User');
const Document = require('../Document');

// Skip all MongoDB-dependent tests when no connection is available
const hasDB = mongoose.connection.readyState === 1;

describe.skip('User Model', () => {});

// eslint-disable-next-line jest/valid-describe-callback
(hasDB ? describe : describe.skip)('Document Model', () => {
  let testDoc;

  test('creates document with default values', async () => {
    testDoc = await Document.create({
      _id: 'test-doc-123',
      title: 'Model Test Document'
    });

    expect(testDoc.content).toEqual({ ops: [] });
    expect(testDoc.version).toBe(0);
    expect(testDoc.isPublic).toBe(false);
    expect(testDoc.locked).toBe(false);
  });

  test('adds collaborator', async () => {
    testDoc.collaborators.push({
      userId: new mongoose.Types.ObjectId(),
      username: 'testuser',
      role: 'editor'
    });
    await testDoc.save();

    const doc = await Document.findById('test-doc-123');
    expect(doc.collaborators.length).toBe(1);
    expect(doc.collaborators[0].role).toBe('editor');
  });

  test('adds edit history entry', async () => {
    testDoc.editHistory.push({
      userId: new mongoose.Types.ObjectId(),
      username: 'testuser',
      userColor: '#3498db',
      delta: { ops: [{ insert: 'hello' }] },
      summary: [{ type: 'insert', text: 'hello', len: 5 }],
      timestamp: Date.now(),
      version: 1
    });
    await testDoc.save();

    const doc = await Document.findById('test-doc-123');
    expect(doc.editHistory.length).toBe(1);
  });

  test('adds chat message', async () => {
    testDoc.chat.push({
      userId: new mongoose.Types.ObjectId(),
      username: 'testuser',
      color: '#3498db',
      text: 'Hello everyone!',
      timestamp: Date.now()
    });
    await testDoc.save();

    const doc = await Document.findById('test-doc-123');
    expect(doc.chat.length).toBe(1);
    expect(doc.chat[0].text).toBe('Hello everyone!');
  });

  test('adds comment', async () => {
    testDoc.comments.push({
      id: 'comment-1',
      userId: new mongoose.Types.ObjectId(),
      username: 'testuser',
      color: '#3498db',
      text: 'Great point!',
      range: { index: 0, length: 5 },
      resolved: false,
      timestamp: Date.now()
    });
    await testDoc.save();

    const doc = await Document.findById('test-doc-123');
    expect(doc.comments.length).toBe(1);
    expect(doc.comments[0].resolved).toBe(false);
  });

  test('adds snapshot', async () => {
    testDoc.snapshots.push({
      version: 1,
      content: Buffer.from('compressed data'),
      bitLength: 100,
      huffmanCodes: '{}',
      deltaOps: { ops: [{ insert: 'hello' }] },
      timestamp: Date.now(),
      savedBy: 'testuser',
      label: 'v1.0'
    });
    await testDoc.save();

    const doc = await Document.findById('test-doc-123');
    expect(doc.snapshots.length).toBe(1);
    expect(doc.snapshots[0].label).toBe('v1.0');
  });

  test('updates updatedAt on save', async () => {
    const oldTime = testDoc.updatedAt;
    await new Promise(resolve => setTimeout(resolve, 100));
    testDoc.title = 'Updated Title';
    await testDoc.save();

    expect(testDoc.updatedAt.getTime()).toBeGreaterThan(oldTime.getTime());
  });

  test('limits edit history to 2000 entries', async () => {
    const doc = await Document.findById('test-doc-123');
    // Add 2100 entries
    for (let i = 0; i < 2100; i++) {
      doc.editHistory.push({
        userId: new mongoose.Types.ObjectId(),
        username: 'testuser',
        userColor: '#3498db',
        delta: { ops: [{ insert: 'x' }] },
        summary: [],
        timestamp: Date.now() + i,
        version: i
      });
    }
    await doc.save();

    const savedDoc = await Document.findById('test-doc-123');
    expect(savedDoc.editHistory.length).toBe(2000);
  });

  test('text search index works', async () => {
    const doc = await Document.create({
      _id: 'search-test-doc',
      title: 'Searchable Document',
      plainText: 'This is a searchable document with unique content'
    });

    const results = await Document.find({ $text: { $search: 'searchable' } });
    expect(results.length).toBeGreaterThan(0);

    await Document.deleteOne({ _id: 'search-test-doc' });
  });
});
