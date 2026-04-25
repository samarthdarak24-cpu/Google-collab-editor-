/**
 * INTERVAL TREE - Overlapping Edit Detection
 * Feature: Detect when two users are editing overlapping ranges simultaneously,
 *          find all edits that overlap with a given range
 * Time: Insert O(log n), Query O(k + log n) where k = results
 * Space: O(n)
 */

class IntervalNode {
  constructor(low, high, data) {
    this.low = low;
    this.high = high;
    this.max = high;   // max high in subtree
    this.data = data;  // { userId, timestamp, operation }
    this.left = null;
    this.right = null;
    this.height = 1;   // AVL height
  }
}

class IntervalTree {
  constructor() {
    this.root = null;
  }

  _height(node) { return node ? node.height : 0; }
  _max(node) { return node ? node.max : -Infinity; }

  _updateNode(node) {
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
    node.max = Math.max(node.high, this._max(node.left), this._max(node.right));
  }

  _balance(node) { return this._height(node.left) - this._height(node.right); }

  _rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this._updateNode(y);
    this._updateNode(x);
    return x;
  }

  _rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this._updateNode(x);
    this._updateNode(y);
    return y;
  }

  _rebalance(node) {
    this._updateNode(node);
    const bal = this._balance(node);

    if (bal > 1) {
      if (this._balance(node.left) < 0) node.left = this._rotateLeft(node.left);
      return this._rotateRight(node);
    }
    if (bal < -1) {
      if (this._balance(node.right) > 0) node.right = this._rotateRight(node.right);
      return this._rotateLeft(node);
    }
    return node;
  }

  insert(low, high, data) {
    this.root = this._insert(this.root, low, high, data);
  }

  _insert(node, low, high, data) {
    if (!node) return new IntervalNode(low, high, data);

    if (low < node.low) {
      node.left = this._insert(node.left, low, high, data);
    } else {
      node.right = this._insert(node.right, low, high, data);
    }

    return this._rebalance(node);
  }

  // Find all intervals overlapping [low, high]
  findOverlapping(low, high) {
    const results = [];
    this._findOverlapping(this.root, low, high, results);
    return results;
  }

  _findOverlapping(node, low, high, results) {
    if (!node) return;
    if (node.max < low) return; // no interval in subtree can overlap

    if (node.left) this._findOverlapping(node.left, low, high, results);

    // Check current node
    if (node.low <= high && low <= node.high) {
      results.push({ low: node.low, high: node.high, data: node.data });
    }

    if (node.right && node.low <= high) {
      this._findOverlapping(node.right, low, high, results);
    }
  }

  // Check if any interval overlaps [low, high]
  hasOverlap(low, high) {
    return this._hasOverlap(this.root, low, high);
  }

  _hasOverlap(node, low, high) {
    if (!node || node.max < low) return false;
    if (node.low <= high && low <= node.high) return true;
    if (node.left && node.left.max >= low) return this._hasOverlap(node.left, low, high);
    return this._hasOverlap(node.right, low, high);
  }

  // Remove interval by low, high, userId
  remove(low, high, userId) {
    this.root = this._remove(this.root, low, high, userId);
  }

  _remove(node, low, high, userId) {
    if (!node) return null;
    if (low < node.low) {
      node.left = this._remove(node.left, low, high, userId);
    } else if (low > node.low) {
      node.right = this._remove(node.right, low, high, userId);
    } else if (node.high === high && node.data.userId === userId) {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      // Find in-order successor
      let succ = node.right;
      while (succ.left) succ = succ.left;
      node.low = succ.low;
      node.high = succ.high;
      node.data = succ.data;
      node.right = this._remove(node.right, succ.low, succ.high, succ.data.userId);
    } else {
      node.right = this._remove(node.right, low, high, userId);
    }
    return this._rebalance(node);
  }

  // Get all active edit regions
  getAllIntervals() {
    const results = [];
    this._inorder(this.root, results);
    return results;
  }

  _inorder(node, results) {
    if (!node) return;
    this._inorder(node.left, results);
    results.push({ low: node.low, high: node.high, data: node.data });
    this._inorder(node.right, results);
  }
}

module.exports = IntervalTree;
