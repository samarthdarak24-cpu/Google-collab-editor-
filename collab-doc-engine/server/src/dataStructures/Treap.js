/**
 * TREAP (Tree + Heap) - Randomized BST for Document Line Indexing
 * Feature: Fast ordered line/paragraph indexing, split/merge for insert/delete lines
 * Time: Insert/Delete/Search O(log n) expected
 * Space: O(n)
 */

class TreapNode {
  constructor(key, value) {
    this.key = key;           // line number or character offset
    this.value = value;       // line content / metadata
    this.priority = Math.random(); // random priority for heap property
    this.left = null;
    this.right = null;
    this.size = 1;            // subtree size for order statistics
  }
}

class Treap {
  constructor() {
    this.root = null;
  }

  _size(node) { return node ? node.size : 0; }

  _update(node) {
    if (node) node.size = 1 + this._size(node.left) + this._size(node.right);
  }

  // Split into [left tree with keys <= key] and [right tree with keys > key]
  split(node, key) {
    if (!node) return [null, null];
    if (node.key <= key) {
      const [l, r] = this.split(node.right, key);
      node.right = l;
      this._update(node);
      return [node, r];
    } else {
      const [l, r] = this.split(node.left, key);
      node.left = r;
      this._update(node);
      return [l, node];
    }
  }

  // Merge two treaps (all keys in left < all keys in right)
  merge(left, right) {
    if (!left) return right;
    if (!right) return left;
    if (left.priority > right.priority) {
      left.right = this.merge(left.right, right);
      this._update(left);
      return left;
    } else {
      right.left = this.merge(left, right.left);
      this._update(right);
      return right;
    }
  }

  insert(key, value) {
    const newNode = new TreapNode(key, value);
    const [l, r] = this.split(this.root, key - 1);
    this.root = this.merge(this.merge(l, newNode), r);
  }

  delete(key) {
    this.root = this._delete(this.root, key);
  }

  _delete(node, key) {
    if (!node) return null;
    if (key < node.key) {
      node.left = this._delete(node.left, key);
    } else if (key > node.key) {
      node.right = this._delete(node.right, key);
    } else {
      return this.merge(node.left, node.right);
    }
    this._update(node);
    return node;
  }

  search(key) {
    let node = this.root;
    while (node) {
      if (key === node.key) return node.value;
      node = key < node.key ? node.left : node.right;
    }
    return null;
  }

  // Get k-th element (0-indexed) — order statistics
  kth(k) {
    return this._kth(this.root, k);
  }

  _kth(node, k) {
    if (!node) return null;
    const leftSize = this._size(node.left);
    if (k < leftSize) return this._kth(node.left, k);
    if (k === leftSize) return node.value;
    return this._kth(node.right, k - leftSize - 1);
  }

  // Insert a new line at position (shifts all subsequent lines)
  insertLine(lineNum, content) {
    // Shift all keys >= lineNum by 1
    this.root = this._shiftKeys(this.root, lineNum, 1);
    this.insert(lineNum, content);
  }

  deleteLine(lineNum) {
    this.delete(lineNum);
    // Shift all keys > lineNum by -1
    this.root = this._shiftKeys(this.root, lineNum + 1, -1);
  }

  _shiftKeys(node, fromKey, delta) {
    if (!node) return null;
    if (node.key >= fromKey) {
      node.key += delta;
      node.left = this._shiftKeys(node.left, fromKey, delta);
    } else {
      node.right = this._shiftKeys(node.right, fromKey, delta);
    }
    return node;
  }

  // Range query: get all lines between [start, end]
  rangeQuery(start, end) {
    const results = [];
    this._inorder(this.root, start, end, results);
    return results;
  }

  _inorder(node, start, end, results) {
    if (!node) return;
    if (node.key > start) this._inorder(node.left, start, end, results);
    if (node.key >= start && node.key <= end) {
      results.push({ line: node.key, content: node.value });
    }
    if (node.key < end) this._inorder(node.right, start, end, results);
  }

  size() { return this._size(this.root); }
}

module.exports = Treap;
