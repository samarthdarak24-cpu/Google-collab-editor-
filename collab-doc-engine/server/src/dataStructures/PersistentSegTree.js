/**
 * PERSISTENT SEGMENT TREE - Immutable Version History
 * Feature: Each document version creates a new root, old versions remain intact.
 *          O(log n) per version, O(n + v*log n) total space for v versions.
 * Time: Update O(log n), Query O(log n)
 * Space: O(n + v * log n) — path copying
 */

class PSTNode {
  constructor(left = null, right = null, editCount = 0, lastEditor = null) {
    this.left = left;
    this.right = right;
    this.editCount = editCount;
    this.lastEditor = lastEditor;
  }
}

class PersistentSegmentTree {
  constructor(n) {
    this.n = n;
    this.versions = [];           // roots of each version
    this.versionMeta = [];        // metadata per version
    this.versions.push(this._build(0, n - 1));
    this.versionMeta.push({ timestamp: Date.now(), editor: 'system', description: 'initial' });
  }

  _build(start, end) {
    if (start === end) return new PSTNode();
    const mid = Math.floor((start + end) / 2);
    return new PSTNode(this._build(start, mid), this._build(mid + 1, end));
  }

  // Create new version with update at position idx
  update(prevVersion, idx, userId, timestamp) {
    const prevRoot = this.versions[prevVersion];
    const newRoot = this._update(prevRoot, 0, this.n - 1, idx, userId, timestamp);
    this.versions.push(newRoot);
    this.versionMeta.push({ timestamp, editor: userId, description: `edit at ${idx}` });
    return this.versions.length - 1; // return new version number
  }

  _update(node, start, end, idx, userId, timestamp) {
    // Path copying: create new nodes along the path
    const newNode = new PSTNode(node.left, node.right, node.editCount + 1, userId);
    if (start === end) return newNode;

    const mid = Math.floor((start + end) / 2);
    if (idx <= mid) {
      newNode.left = this._update(node.left, start, mid, idx, userId, timestamp);
    } else {
      newNode.right = this._update(node.right, mid + 1, end, idx, userId, timestamp);
    }
    newNode.editCount = newNode.left.editCount + newNode.right.editCount;
    return newNode;
  }

  // Query edit count in range [l, r] for a specific version
  query(version, l, r) {
    return this._query(this.versions[version], 0, this.n - 1, l, r);
  }

  _query(node, start, end, l, r) {
    if (!node || r < start || end < l) return 0;
    if (l <= start && end <= r) return node.editCount;
    const mid = Math.floor((start + end) / 2);
    return this._query(node.left, start, mid, l, r) +
           this._query(node.right, mid + 1, end, l, r);
  }

  // Diff between two versions: find positions that changed
  diff(v1, v2) {
    const changes = [];
    this._diff(this.versions[v1], this.versions[v2], 0, this.n - 1, changes);
    return changes;
  }

  _diff(n1, n2, start, end, changes) {
    if (!n1 || !n2 || n1 === n2) return;
    if (start === end) {
      if (n1.editCount !== n2.editCount) {
        changes.push({ position: start, v1Edits: n1.editCount, v2Edits: n2.editCount });
      }
      return;
    }
    const mid = Math.floor((start + end) / 2);
    this._diff(n1.left, n2.left, start, mid, changes);
    this._diff(n1.right, n2.right, mid + 1, end, changes);
  }

  getVersionCount() { return this.versions.length; }

  getVersionMeta(v) { return this.versionMeta[v]; }

  // Rollback: just return an older version number (non-destructive)
  rollback(targetVersion) {
    if (targetVersion < 0 || targetVersion >= this.versions.length) {
      throw new Error('Invalid version');
    }
    // Create a new version that is a copy of targetVersion
    const newRoot = this.versions[targetVersion];
    this.versions.push(newRoot);
    this.versionMeta.push({
      timestamp: Date.now(),
      editor: 'system',
      description: `rollback to v${targetVersion}`,
    });
    return this.versions.length - 1;
  }
}

module.exports = PersistentSegmentTree;
