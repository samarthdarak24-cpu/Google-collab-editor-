/**
 * TRIE - Compressed Trie for Document Search & Autocomplete
 * Feature: Real-time word suggestions, full-text search within documents
 * Time: Insert O(m), Search O(m), m = word length
 * Space: O(ALPHABET_SIZE * m * n)
 */

class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.frequency = 0;      // for ranking suggestions
    this.docIds = new Set();  // which documents contain this word
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, docId = null) {
    let node = this.root;
    word = word.toLowerCase();
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEndOfWord = true;
    node.frequency++;
    if (docId) node.docIds.add(docId);
  }

  search(word) {
    let node = this.root;
    word = word.toLowerCase();
    for (const ch of word) {
      if (!node.children[ch]) return null;
      node = node.children[ch];
    }
    return node.isEndOfWord ? node : null;
  }

  // Returns top-k autocomplete suggestions sorted by frequency
  autocomplete(prefix, k = 10) {
    let node = this.root;
    prefix = prefix.toLowerCase();
    for (const ch of prefix) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    const results = [];
    this._dfs(node, prefix, results);
    return results
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, k)
      .map(r => r.word);
  }

  _dfs(node, current, results) {
    if (node.isEndOfWord) {
      results.push({ word: current, frequency: node.frequency, docIds: node.docIds });
    }
    for (const [ch, child] of Object.entries(node.children)) {
      this._dfs(child, current + ch, results);
    }
  }

  // Search across documents - returns docIds containing the word
  searchInDocs(word) {
    const node = this.search(word);
    return node ? [...node.docIds] : [];
  }

  delete(word) {
    this._deleteHelper(this.root, word.toLowerCase(), 0);
  }

  _deleteHelper(node, word, depth) {
    if (!node) return false;
    if (depth === word.length) {
      if (node.isEndOfWord) node.isEndOfWord = false;
      return Object.keys(node.children).length === 0;
    }
    const ch = word[depth];
    if (this._deleteHelper(node.children[ch], word, depth + 1)) {
      delete node.children[ch];
      return !node.isEndOfWord && Object.keys(node.children).length === 0;
    }
    return false;
  }
}

module.exports = Trie;
