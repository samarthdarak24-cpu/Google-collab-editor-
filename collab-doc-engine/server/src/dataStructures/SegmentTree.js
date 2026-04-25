/**
 * SEGMENT TREE - Range-based Document Edit Tracking
 * Feature: Track character-level changes, range queries on document versions,
 *          efficient range updates for collaborative edits
 * Time: Build O(n), Query O(log n), Update O(log n)
 * Space: O(4n)
 */

class SegmentTree {
  constructor(n) {
    this.n = n;
    this.tree = new Array(4 * n).fill(null).map(() => ({
      editCount: 0,
      lastEditor: null,
      timestamp: 0,
      checksum: 0,
    }));
    this.lazy = new Array(4 * n).fill(0); // lazy propagation
  }

  // Build from existing document character array
  build(arr, node = 1, start = 0, end = this.n - 1) {
    if (start === end) {
      this.tree[node] = {
        editCount: arr[start]?.editCount || 0,
        lastEditor: arr[start]?.lastEditor || null,
        timestamp: arr[start]?.timestamp || 0,
        checksum: arr[start]?.charCode || 0,
      };
      return;
    }
    const mid = Math.floor((start + end) / 2);
    this.build(arr, 2 * node, start, mid);
    this.build(arr, 2 * node + 1, mid + 1, end);
    this._merge(node);
  }

  _merge(node) {
    const l = this.tree[2 * node];
    const r = this.tree[2 * node + 1];
    this.tree[node] = {
      editCount: l.editCount + r.editCount,
      lastEditor: r.timestamp > l.timestamp ? r.lastEditor : l.lastEditor,
      timestamp: Math.max(l.timestamp, r.timestamp),
      checksum: l.checksum ^ r.checksum,
    };
  }

  // Range update: mark a range [l, r] as edited by userId
  rangeUpdate(l, r, userId, timestamp, node = 1, start = 0, end = this.n - 1) {
    if (r < start || end < l) return;
    if (l <= start && end <= r) {
      this.tree[node].editCount++;
      this.tree[node].lastEditor = userId;
      this.tree[node].timestamp = timestamp;
      this.lazy[node]++;
      return;
    }
    this._pushDown(node, start, end);
    const mid = Math.floor((start + end) / 2);
    this.rangeUpdate(l, r, userId, timestamp, 2 * node, start, mid);
    this.rangeUpdate(l, r, userId, timestamp, 2 * node + 1, mid + 1, end);
    this._merge(node);
  }

  _pushDown(node, start, end) {
    if (this.lazy[node] !== 0) {
      const mid = Math.floor((start + end) / 2);
      this.tree[2 * node].editCount += this.lazy[node];
      this.lazy[2 * node] += this.lazy[node];
      this.tree[2 * node + 1].editCount += this.lazy[node];
      this.lazy[2 * node + 1] += this.lazy[node];
      this.lazy[node] = 0;
    }
  }

  // Query: get edit info for range [l, r]
  rangeQuery(l, r, node = 1, start = 0, end = this.n - 1) {
    if (r < start || end < l) return { editCount: 0, lastEditor: null, timestamp: 0 };
    if (l <= start && end <= r) return this.tree[node];
    this._pushDown(node, start, end);
    const mid = Math.floor((start + end) / 2);
    const leftRes = this.rangeQuery(l, r, 2 * node, start, mid);
    const rightRes = this.rangeQuery(l, r, 2 * node + 1, mid + 1, end);
    return {
      editCount: leftRes.editCount + rightRes.editCount,
      lastEditor: rightRes.timestamp > leftRes.timestamp ? rightRes.lastEditor : leftRes.lastEditor,
      timestamp: Math.max(leftRes.timestamp, rightRes.timestamp),
    };
  }

  // Point update: single character edit
  pointUpdate(idx, userId, timestamp, charCode) {
    this._pointUpdate(idx, userId, timestamp, charCode, 1, 0, this.n - 1);
  }

  _pointUpdate(idx, userId, timestamp, charCode, node, start, end) {
    if (start === end) {
      this.tree[node].editCount++;
      this.tree[node].lastEditor = userId;
      this.tree[node].timestamp = timestamp;
      this.tree[node].checksum = charCode;
      return;
    }
    const mid = Math.floor((start + end) / 2);
    if (idx <= mid) this._pointUpdate(idx, userId, timestamp, charCode, 2 * node, start, mid);
    else this._pointUpdate(idx, userId, timestamp, charCode, 2 * node + 1, mid + 1, end);
    this._merge(node);
  }

  // Get most-edited region (hotspot detection)
  getMostEditedRange() {
    return this._findMax(1, 0, this.n - 1);
  }

  _findMax(node, start, end) {
    if (start === end) return { start, end, editCount: this.tree[node].editCount };
    const mid = Math.floor((start + end) / 2);
    const left = this._findMax(2 * node, start, mid);
    const right = this._findMax(2 * node + 1, mid + 1, end);
    return left.editCount >= right.editCount ? left : right;
  }
}

module.exports = SegmentTree;
