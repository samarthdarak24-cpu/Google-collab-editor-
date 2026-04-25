/**
 * FIBONACCI HEAP - Edit Operation Scheduling & Priority Queue
 * Feature: Schedule pending edits by priority (timestamp/conflict weight),
 *          amortized O(1) insert, O(log n) extract-min
 * Time: Insert O(1), ExtractMin O(log n) amortized, DecreaseKey O(1) amortized
 * Space: O(n)
 */

class FibNode {
  constructor(key, value) {
    this.key = key;       // priority (timestamp or conflict score)
    this.value = value;   // edit operation
    this.degree = 0;
    this.marked = false;
    this.parent = null;
    this.child = null;
    this.left = this;
    this.right = this;
  }
}

class FibonacciHeap {
  constructor() {
    this.min = null;
    this.size = 0;
  }

  insert(key, value) {
    const node = new FibNode(key, value);
    this._addToRootList(node);
    if (!this.min || node.key < this.min.key) this.min = node;
    this.size++;
    return node;
  }

  _addToRootList(node) {
    if (!this.min) {
      node.left = node;
      node.right = node;
    } else {
      node.right = this.min;
      node.left = this.min.left;
      this.min.left.right = node;
      this.min.left = node;
    }
  }

  extractMin() {
    const z = this.min;
    if (!z) return null;

    // Add children to root list
    if (z.child) {
      let child = z.child;
      do {
        const next = child.right;
        this._addToRootList(child);
        child.parent = null;
        child = next;
      } while (child !== z.child);
    }

    // Remove z from root list
    z.left.right = z.right;
    z.right.left = z.left;

    if (z === z.right) {
      this.min = null;
    } else {
      this.min = z.right;
      this._consolidate();
    }

    this.size--;
    return { key: z.key, value: z.value };
  }

  _consolidate() {
    const maxDegree = Math.ceil(Math.log2(this.size + 1)) + 1;
    const A = new Array(maxDegree + 1).fill(null);

    const roots = [];
    let current = this.min;
    do {
      roots.push(current);
      current = current.right;
    } while (current !== this.min);

    for (let w of roots) {
      let x = w;
      let d = x.degree;
      while (A[d]) {
        let y = A[d];
        if (x.key > y.key) [x, y] = [y, x];
        this._link(y, x);
        A[d] = null;
        d++;
      }
      A[d] = x;
    }

    this.min = null;
    for (const node of A) {
      if (!node) continue;
      if (!this.min || node.key < this.min.key) this.min = node;
    }
  }

  _link(y, x) {
    // Remove y from root list
    y.left.right = y.right;
    y.right.left = y.left;

    // Make y a child of x
    y.parent = x;
    if (!x.child) {
      x.child = y;
      y.left = y;
      y.right = y;
    } else {
      y.right = x.child;
      y.left = x.child.left;
      x.child.left.right = y;
      x.child.left = y;
    }
    x.degree++;
    y.marked = false;
  }

  decreaseKey(node, newKey) {
    if (newKey > node.key) throw new Error('New key is greater than current key');
    node.key = newKey;
    const parent = node.parent;
    if (parent && node.key < parent.key) {
      this._cut(node, parent);
      this._cascadingCut(parent);
    }
    if (node.key < this.min.key) this.min = node;
  }

  _cut(x, y) {
    // Remove x from y's children
    if (x.right === x) {
      y.child = null;
    } else {
      x.left.right = x.right;
      x.right.left = x.left;
      if (y.child === x) y.child = x.right;
    }
    y.degree--;
    this._addToRootList(x);
    x.parent = null;
    x.marked = false;
  }

  _cascadingCut(y) {
    const z = y.parent;
    if (z) {
      if (!y.marked) {
        y.marked = true;
      } else {
        this._cut(y, z);
        this._cascadingCut(z);
      }
    }
  }

  isEmpty() { return this.size === 0; }
  peek() { return this.min ? { key: this.min.key, value: this.min.value } : null; }
}

module.exports = FibonacciHeap;
