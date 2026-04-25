/**
 * DISJOINT SET (Union-Find) - Collaborative Session & Conflict Grouping
 * Feature: Group users editing the same section, detect conflicting edit regions,
 *          merge overlapping edit zones
 * Time: Nearly O(1) per operation with path compression + union by rank
 * Space: O(n)
 */

class DisjointSet {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.size = new Array(n).fill(1);
    this.meta = new Array(n).fill(null); // metadata per component
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return false; // already in same set

    // Union by rank
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
      this.size[py] += this.size[px];
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
      this.size[px] += this.size[py];
    } else {
      this.parent[py] = px;
      this.size[px] += this.size[py];
      this.rank[px]++;
    }
    return true;
  }

  connected(x, y) {
    return this.find(x) === this.find(y);
  }

  getComponentSize(x) {
    return this.size[this.find(x)];
  }

  // Get all members of the same component as x
  getComponent(x) {
    const root = this.find(x);
    const members = [];
    for (let i = 0; i < this.parent.length; i++) {
      if (this.find(i) === root) members.push(i);
    }
    return members;
  }

  // Get all distinct components
  getAllComponents() {
    const components = new Map();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      if (!components.has(root)) components.set(root, []);
      components.get(root).push(i);
    }
    return [...components.values()];
  }
}

/**
 * Document-specific DSU: tracks which edit regions are "connected"
 * (i.e., overlapping or adjacent edits that form a conflict zone)
 */
class EditRegionDSU {
  constructor() {
    this.regions = new Map();   // regionId -> { start, end, users }
    this.dsu = null;
    this.idList = [];
  }

  addRegion(regionId, start, end, userId) {
    this.regions.set(regionId, { start, end, users: new Set([userId]) });
    this._rebuild();
  }

  _rebuild() {
    this.idList = [...this.regions.keys()];
    this.dsu = new DisjointSet(this.idList.length);

    // Union overlapping regions
    for (let i = 0; i < this.idList.length; i++) {
      for (let j = i + 1; j < this.idList.length; j++) {
        const a = this.regions.get(this.idList[i]);
        const b = this.regions.get(this.idList[j]);
        if (this._overlaps(a, b)) {
          this.dsu.union(i, j);
        }
      }
    }
  }

  _overlaps(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  // Get all conflict groups (regions that overlap)
  getConflictGroups() {
    if (!this.dsu) return [];
    const components = this.dsu.getAllComponents();
    return components
      .filter(c => c.length > 1)
      .map(c => c.map(i => ({
        id: this.idList[i],
        ...this.regions.get(this.idList[i]),
      })));
  }

  isConflicting(regionId1, regionId2) {
    const i = this.idList.indexOf(regionId1);
    const j = this.idList.indexOf(regionId2);
    if (i === -1 || j === -1) return false;
    return this.dsu.connected(i, j);
  }
}

module.exports = { DisjointSet, EditRegionDSU };
