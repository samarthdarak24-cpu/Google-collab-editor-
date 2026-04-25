const Trie = require('../Trie');
const SegmentTree = require('../SegmentTree');
const SkipList = require('../SkipList');
const HuffmanCoding = require('../HuffmanTree');
const FibonacciHeap = require('../FibonacciHeap');
const PersistentSegmentTree = require('../PersistentSegTree');
const Treap = require('../Treap');
const { DisjointSet, EditRegionDSU } = require('../DisjointSet');
const SuffixArray = require('../SuffixArray');
const IntervalTree = require('../IntervalTree');

// ── TRIE ────────────────────────────────────────────────────────────────────
describe('Trie', () => {
  test('insert and search', () => {
    const t = new Trie();
    t.insert('hello', 'doc1');
    t.insert('help', 'doc2');
    expect(t.search('hello')).not.toBeNull();
    expect(t.search('world')).toBeNull();
  });

  test('autocomplete returns sorted by frequency', () => {
    const t = new Trie();
    t.insert('hello'); t.insert('hello'); t.insert('help');
    const results = t.autocomplete('hel');
    expect(results[0]).toBe('hello'); // higher frequency first
  });

  test('searchInDocs returns correct docIds', () => {
    const t = new Trie();
    t.insert('react', 'doc1');
    t.insert('react', 'doc2');
    const docs = t.searchInDocs('react');
    expect(docs).toContain('doc1');
    expect(docs).toContain('doc2');
  });
});

// ── SEGMENT TREE ─────────────────────────────────────────────────────────────
describe('SegmentTree', () => {
  test('range update and query', () => {
    const st = new SegmentTree(100);
    st.rangeUpdate(0, 49, 'user1', 1000);
    const result = st.rangeQuery(0, 49);
    expect(result.editCount).toBeGreaterThan(0);
    expect(result.lastEditor).toBe('user1');
  });

  test('point update', () => {
    const st = new SegmentTree(100);
    st.pointUpdate(10, 'user2', 2000, 65);
    const result = st.rangeQuery(10, 10);
    expect(result.lastEditor).toBe('user2');
  });
});

// ── SKIP LIST ────────────────────────────────────────────────────────────────
describe('SkipList', () => {
  test('insert and search', () => {
    const sl = new SkipList();
    sl.insert(100, { op: 'insert', text: 'hello' });
    expect(sl.search(100)).toEqual({ op: 'insert', text: 'hello' });
    expect(sl.search(999)).toBeNull();
  });

  test('range search', () => {
    const sl = new SkipList();
    sl.insert(100, 'a'); sl.insert(200, 'b'); sl.insert(300, 'c');
    const results = sl.rangeSearch(100, 250);
    expect(results.length).toBe(2);
  });

  test('delete', () => {
    const sl = new SkipList();
    sl.insert(50, 'x');
    sl.delete(50);
    expect(sl.search(50)).toBeNull();
  });
});

// ── HUFFMAN ──────────────────────────────────────────────────────────────────
describe('HuffmanCoding', () => {
  test('encode and decode roundtrip', () => {
    const hc = new HuffmanCoding();
    const text = 'hello world this is a test document for compression';
    hc.buildTree(text);
    const encoded = hc.encode(text);
    const decoded = hc.decode(encoded.bytes, encoded.bitLength);
    expect(decoded).toBe(text);
  });

  test('compression ratio < 1 for repetitive text', () => {
    const hc = new HuffmanCoding();
    const text = 'aaaaaabbbbbbcccccc';
    hc.buildTree(text);
    const encoded = hc.encode(text);
    expect(parseFloat(encoded.ratio)).toBeLessThan(1);
  });
});

// ── FIBONACCI HEAP ───────────────────────────────────────────────────────────
describe('FibonacciHeap', () => {
  test('insert and extractMin', () => {
    const fh = new FibonacciHeap();
    fh.insert(30, 'op3');
    fh.insert(10, 'op1');
    fh.insert(20, 'op2');
    expect(fh.extractMin().key).toBe(10);
    expect(fh.extractMin().key).toBe(20);
  });

  test('peek returns min without removing', () => {
    const fh = new FibonacciHeap();
    fh.insert(5, 'x');
    fh.insert(3, 'y');
    expect(fh.peek().key).toBe(3);
    expect(fh.size).toBe(2);
  });
});

// ── PERSISTENT SEGMENT TREE ──────────────────────────────────────────────────
describe('PersistentSegmentTree', () => {
  test('creates new version on update', () => {
    const pst = new PersistentSegmentTree(100);
    const v1 = pst.update(0, 10, 'user1', Date.now());
    const v2 = pst.update(v1, 20, 'user2', Date.now());
    expect(pst.getVersionCount()).toBe(3); // initial + 2 updates
  });

  test('rollback creates new version pointing to old root', () => {
    const pst = new PersistentSegmentTree(100);
    const v1 = pst.update(0, 5, 'user1', Date.now());
    const rolled = pst.rollback(0);
    expect(pst.getVersionCount()).toBe(3);
  });
});

// ── TREAP ────────────────────────────────────────────────────────────────────
describe('Treap', () => {
  test('insert and search', () => {
    const t = new Treap();
    t.insert(1, 'line one');
    t.insert(2, 'line two');
    expect(t.search(1)).toBe('line one');
    expect(t.search(3)).toBeNull();
  });

  test('kth element', () => {
    const t = new Treap();
    t.insert(1, 'a'); t.insert(2, 'b'); t.insert(3, 'c');
    expect(t.kth(0)).toBe('a');
    expect(t.kth(2)).toBe('c');
  });

  test('range query', () => {
    const t = new Treap();
    t.insert(1, 'a'); t.insert(2, 'b'); t.insert(3, 'c');
    const results = t.rangeQuery(1, 2);
    expect(results.length).toBe(2);
  });
});

// ── DISJOINT SET ─────────────────────────────────────────────────────────────
describe('DisjointSet', () => {
  test('union and find', () => {
    const dsu = new DisjointSet(5);
    dsu.union(0, 1);
    dsu.union(1, 2);
    expect(dsu.connected(0, 2)).toBe(true);
    expect(dsu.connected(0, 3)).toBe(false);
  });

  test('component size', () => {
    const dsu = new DisjointSet(5);
    dsu.union(0, 1); dsu.union(1, 2);
    expect(dsu.getComponentSize(0)).toBe(3);
  });
});

// ── SUFFIX ARRAY ─────────────────────────────────────────────────────────────
describe('SuffixArray', () => {
  test('search finds all occurrences', () => {
    const sa = new SuffixArray('banana');
    const positions = sa.search('an');
    expect(positions.length).toBe(2);
  });

  test('count occurrences', () => {
    const sa = new SuffixArray('abcabcabc');
    expect(sa.count('abc')).toBe(3);
  });
});

// ── INTERVAL TREE ────────────────────────────────────────────────────────────
describe('IntervalTree', () => {
  test('find overlapping intervals', () => {
    const it = new IntervalTree();
    it.insert(0, 10, { userId: 'u1', timestamp: 1 });
    it.insert(5, 15, { userId: 'u2', timestamp: 2 });
    it.insert(20, 30, { userId: 'u3', timestamp: 3 });
    const overlaps = it.findOverlapping(8, 12);
    expect(overlaps.length).toBe(2);
  });

  test('no overlap returns empty', () => {
    const it = new IntervalTree();
    it.insert(0, 5, { userId: 'u1', timestamp: 1 });
    expect(it.findOverlapping(10, 20).length).toBe(0);
  });
});
