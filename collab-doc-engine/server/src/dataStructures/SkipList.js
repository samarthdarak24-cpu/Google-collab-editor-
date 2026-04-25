/**
 * SKIP LIST - Fast Ordered Indexing of Document Versions
 * Feature: O(log n) version lookup, ordered edit history, fast range scans
 * Time: Search/Insert/Delete O(log n) expected
 * Space: O(n log n) expected
 */

const MAX_LEVEL = 16;
const P = 0.5;

class SkipNode {
  constructor(key, value, level) {
    this.key = key;       // timestamp or version number
    this.value = value;   // edit operation / snapshot
    this.forward = new Array(level + 1).fill(null);
  }
}

class SkipList {
  constructor() {
    this.maxLevel = MAX_LEVEL;
    this.level = 0;
    this.header = new SkipNode(-Infinity, null, MAX_LEVEL);
    this.size = 0;
  }

  _randomLevel() {
    let lvl = 0;
    while (Math.random() < P && lvl < MAX_LEVEL) lvl++;
    return lvl;
  }

  insert(key, value) {
    const update = new Array(MAX_LEVEL + 1).fill(null);
    let current = this.header;

    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].key < key) {
        current = current.forward[i];
      }
      update[i] = current;
    }

    current = current.forward[0];

    // Update existing key
    if (current && current.key === key) {
      current.value = value;
      return;
    }

    const newLevel = this._randomLevel();
    if (newLevel > this.level) {
      for (let i = this.level + 1; i <= newLevel; i++) update[i] = this.header;
      this.level = newLevel;
    }

    const newNode = new SkipNode(key, value, newLevel);
    for (let i = 0; i <= newLevel; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }
    this.size++;
  }

  search(key) {
    let current = this.header;
    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].key < key) {
        current = current.forward[i];
      }
    }
    current = current.forward[0];
    return current && current.key === key ? current.value : null;
  }

  delete(key) {
    const update = new Array(MAX_LEVEL + 1).fill(null);
    let current = this.header;

    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].key < key) {
        current = current.forward[i];
      }
      update[i] = current;
    }

    current = current.forward[0];
    if (!current || current.key !== key) return false;

    for (let i = 0; i <= this.level; i++) {
      if (update[i].forward[i] !== current) break;
      update[i].forward[i] = current.forward[i];
    }

    while (this.level > 0 && !this.header.forward[this.level]) this.level--;
    this.size--;
    return true;
  }

  // Range scan: get all versions between [startKey, endKey]
  rangeSearch(startKey, endKey) {
    const results = [];
    let current = this.header;

    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].key < startKey) {
        current = current.forward[i];
      }
    }

    current = current.forward[0];
    while (current && current.key <= endKey) {
      results.push({ key: current.key, value: current.value });
      current = current.forward[0];
    }
    return results;
  }

  // Get latest N versions
  getLatest(n = 10) {
    const all = [];
    let current = this.header.forward[0];
    while (current) {
      all.push({ key: current.key, value: current.value });
      current = current.forward[0];
    }
    return all.slice(-n).reverse();
  }

  toArray() {
    const result = [];
    let current = this.header.forward[0];
    while (current) {
      result.push({ key: current.key, value: current.value });
      current = current.forward[0];
    }
    return result;
  }
}

module.exports = SkipList;
