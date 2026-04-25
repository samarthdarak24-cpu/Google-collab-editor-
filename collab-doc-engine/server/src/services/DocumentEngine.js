/**
 * DocumentEngine - Core service orchestrating all data structures
 * This is the heart of the collaborative document system.
 */

const Trie = require('../dataStructures/Trie');
const SegmentTree = require('../dataStructures/SegmentTree');
const SkipList = require('../dataStructures/SkipList');
const HuffmanCoding = require('../dataStructures/HuffmanTree');
const FibonacciHeap = require('../dataStructures/FibonacciHeap');
const PersistentSegmentTree = require('../dataStructures/PersistentSegTree');
const Treap = require('../dataStructures/Treap');
const { EditRegionDSU } = require('../dataStructures/DisjointSet');
const SuffixArray = require('../dataStructures/SuffixArray');
const IntervalTree = require('../dataStructures/IntervalTree');

class DocumentEngine {
  constructor(docId, initialContent = '') {
    this.docId = docId;
    this.content = initialContent;
    this.n = Math.max(initialContent.length, 10000); // max doc size

    // --- Data Structure Instances ---

    // Trie: word search & autocomplete
    this.searchTrie = new Trie();

    // Segment Tree: range edit tracking
    this.editTracker = new SegmentTree(this.n);

    // Skip List: ordered version history (key = timestamp)
    this.versionHistory = new SkipList();

    // Fibonacci Heap: pending edit operation queue
    this.editQueue = new FibonacciHeap();

    // Persistent Segment Tree: immutable version snapshots
    this.snapshots = new PersistentSegmentTree(this.n);
    this.currentVersion = 0;

    // Treap: line-level indexing
    this.lineIndex = new Treap();

    // DSU: conflict region grouping
    this.conflictTracker = new EditRegionDSU();

    // Interval Tree: active edit regions per user
    this.activeEdits = new IntervalTree();

    // Suffix Array: rebuilt on demand for full-text search
    this.suffixArray = null;
    this.suffixArrayDirty = true;

    // Huffman: compression cache
    this.huffman = new HuffmanCoding();

    // Initialize with content
    if (initialContent) {
      this._indexContent(initialContent);
    }
  }

  // ─── EDIT OPERATIONS ────────────────────────────────────────────────────────

  /**
   * Apply an edit operation from a user
   * @param {Object} op - { userId, type: 'insert'|'delete'|'replace', start, end, text, timestamp }
   */
  applyEdit(op) {
    const { userId, type, start, text, timestamp } = op;
    const end = op.end !== undefined ? op.end : start + (text?.length || 0);

    // 1. Check for conflicts via Interval Tree
    const conflicts = this.activeEdits.findOverlapping(start, end || start);
    const hasConflict = conflicts.some(c => c.data.userId !== userId);

    // 2. Register active edit region
    this.activeEdits.insert(start, end || start + (text?.length || 0), {
      userId, timestamp, operation: type,
    });

    // 3. Track conflict groups via DSU
    const regionId = `${userId}-${timestamp}`;
    this.conflictTracker.addRegion(regionId, start, end || start, userId);

    // 4. Queue the operation in Fibonacci Heap (priority = timestamp)
    const heapNode = this.editQueue.insert(timestamp, op);

    // 5. Apply to content
    let newContent = this.content;
    if (type === 'insert') {
      newContent = this.content.slice(0, start) + text + this.content.slice(start);
    } else if (type === 'delete') {
      newContent = this.content.slice(0, start) + this.content.slice(end);
    } else if (type === 'replace') {
      newContent = this.content.slice(0, start) + text + this.content.slice(end);
    }

    // 6. Update Segment Tree for range tracking
    this.editTracker.rangeUpdate(
      start,
      Math.min((end || start + (text?.length || 1)) - 1, this.n - 1),
      userId,
      timestamp
    );

    // 7. Save version in Skip List
    this.versionHistory.insert(timestamp, {
      op,
      contentSnapshot: newContent.slice(0, 500), // partial snapshot
      version: this.currentVersion + 1,
    });

    // 8. Create persistent snapshot
    this.currentVersion = this.snapshots.update(
      this.currentVersion, start, userId, timestamp
    );

    // 9. Update content and re-index
    this.content = newContent;
    this.suffixArrayDirty = true;

    // 10. Update Trie with new words
    if (text) {
      const words = text.match(/\b\w+\b/g) || [];
      words.forEach(w => this.searchTrie.insert(w, this.docId));
    }

    // 11. Update line index (Treap)
    this._rebuildLineIndex();

    return {
      success: true,
      conflicts: hasConflict ? conflicts : [],
      version: this.currentVersion,
      timestamp,
    };
  }

  // ─── SEARCH ─────────────────────────────────────────────────────────────────

  autocomplete(prefix, k = 10) {
    return this.searchTrie.autocomplete(prefix, k);
  }

  searchText(pattern) {
    if (this.suffixArrayDirty) {
      this.suffixArray = new SuffixArray(this.content);
      this.suffixArrayDirty = false;
    }
    const positions = this.suffixArray.search(pattern);
    return positions.map(pos => ({
      position: pos,
      context: this.content.slice(Math.max(0, pos - 20), pos + pattern.length + 20),
    }));
  }

  // ─── VERSION CONTROL ────────────────────────────────────────────────────────

  getVersionHistory(startTime, endTime) {
    return this.versionHistory.rangeSearch(startTime, endTime);
  }

  rollback(targetVersion) {
    const newVersion = this.snapshots.rollback(targetVersion);
    this.currentVersion = newVersion;
    return newVersion;
  }

  diffVersions(v1, v2) {
    return this.snapshots.diff(v1, v2);
  }

  // ─── COMPRESSION ────────────────────────────────────────────────────────────

  compress() {
    if (this.content.length === 0) return null;
    this.huffman.buildTree(this.content);
    return this.huffman.encode(this.content);
  }

  decompress(bytes, bitLength) {
    return this.huffman.decode(bytes, bitLength);
  }

  // ─── ANALYTICS ──────────────────────────────────────────────────────────────

  getEditHotspot() {
    return this.editTracker.getMostEditedRange();
  }

  getRangeEditInfo(start, end) {
    return this.editTracker.rangeQuery(start, end);
  }

  getConflicts() {
    return this.conflictTracker.getConflictGroups();
  }

  getActiveEditors() {
    return this.activeEdits.getAllIntervals().map(i => ({
      range: [i.low, i.high],
      userId: i.data.userId,
      timestamp: i.data.timestamp,
    }));
  }

  // ─── LINE OPERATIONS ────────────────────────────────────────────────────────

  getLine(lineNum) {
    return this.lineIndex.search(lineNum);
  }

  getLines(start, end) {
    return this.lineIndex.rangeQuery(start, end);
  }

  // ─── INTERNAL ───────────────────────────────────────────────────────────────

  _indexContent(content) {
    const words = content.match(/\b\w+\b/g) || [];
    words.forEach(w => this.searchTrie.insert(w, this.docId));
    this._rebuildLineIndex();
  }

  _rebuildLineIndex() {
    const lines = this.content.split('\n');
    this.lineIndex = new Treap();
    lines.forEach((line, i) => this.lineIndex.insert(i + 1, line));
  }

  clearActiveEdit(userId, start, end) {
    this.activeEdits.remove(start, end, userId);
  }

  getStats() {
    return {
      docId: this.docId,
      contentLength: this.content.length,
      versionCount: this.snapshots.getVersionCount(),
      currentVersion: this.currentVersion,
      lineCount: this.lineIndex.size(),
      activeEditors: this.activeEdits.getAllIntervals().length,
      conflicts: this.conflictTracker.getConflictGroups().length,
    };
  }
}

module.exports = DocumentEngine;
