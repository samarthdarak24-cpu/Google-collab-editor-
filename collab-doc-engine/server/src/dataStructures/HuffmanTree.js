/**
 * HUFFMAN TREE - Document Compression
 * Feature: Compress document snapshots before storing in MongoDB,
 *          reduces storage cost for large documents
 * Time: Build O(n log n), Encode/Decode O(n)
 * Space: O(n)
 */

class HuffmanNode {
  constructor(char, freq, left = null, right = null) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

// Min-heap for building Huffman tree
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return min;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].freq <= this.heap[i].freq) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].freq < this.heap[smallest].freq) smallest = l;
      if (r < n && this.heap[r].freq < this.heap[smallest].freq) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }

  get size() { return this.heap.length; }
}

class HuffmanCoding {
  constructor() {
    this.codes = {};
    this.reverseMap = {};
    this.root = null;
  }

  // Build frequency table from text
  _buildFreqTable(text) {
    const freq = {};
    for (const ch of text) freq[ch] = (freq[ch] || 0) + 1;
    return freq;
  }

  // Build Huffman tree
  buildTree(text) {
    const freq = this._buildFreqTable(text);
    const heap = new MinHeap();

    for (const [char, f] of Object.entries(freq)) {
      heap.push(new HuffmanNode(char, f));
    }

    // Edge case: single unique character
    if (heap.size === 1) {
      const node = heap.pop();
      this.root = new HuffmanNode(null, node.freq, node, null);
    } else {
      while (heap.size > 1) {
        const left = heap.pop();
        const right = heap.pop();
        heap.push(new HuffmanNode(null, left.freq + right.freq, left, right));
      }
      this.root = heap.pop();
    }

    this.codes = {};
    this._generateCodes(this.root, '');
    this.reverseMap = Object.fromEntries(
      Object.entries(this.codes).map(([k, v]) => [v, k])
    );
    return this;
  }

  _generateCodes(node, code) {
    if (!node) return;
    if (!node.left && !node.right) {
      this.codes[node.char] = code || '0';
      return;
    }
    this._generateCodes(node.left, code + '0');
    this._generateCodes(node.right, code + '1');
  }

  encode(text) {
    if (!this.root) this.buildTree(text);
    let bits = '';
    for (const ch of text) bits += this.codes[ch];

    // Pack bits into bytes
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, '0'), 2));
    }

    return {
      bytes: Buffer.from(bytes),
      bitLength: bits.length,
      codes: this.codes,
      originalSize: Buffer.byteLength(text, 'utf8'),
      compressedSize: bytes.length,
      ratio: (bytes.length / Buffer.byteLength(text, 'utf8')).toFixed(3),
    };
  }

  decode(bytes, bitLength) {
    let bits = '';
    for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
    bits = bits.slice(0, bitLength);

    let result = '';
    let node = this.root;
    for (const bit of bits) {
      node = bit === '0' ? node.left : node.right;
      if (!node.left && !node.right) {
        result += node.char;
        node = this.root;
      }
    }
    return result;
  }

  // Serialize tree for storage in MongoDB
  serializeTree() {
    return JSON.stringify(this.codes);
  }

  static fromCodes(codesJson) {
    const hc = new HuffmanCoding();
    hc.codes = JSON.parse(codesJson);
    hc.reverseMap = Object.fromEntries(
      Object.entries(hc.codes).map(([k, v]) => [v, k])
    );
    return hc;
  }
}

module.exports = HuffmanCoding;
