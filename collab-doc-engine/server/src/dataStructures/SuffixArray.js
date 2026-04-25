/**
 * SUFFIX ARRAY + LCP Array - Advanced Full-Text Search
 * Feature: Find all occurrences of a pattern in a document in O(m log n),
 *          longest common substring between document versions
 * Time: Build O(n log^2 n), Search O(m log n)
 * Space: O(n)
 */

class SuffixArray {
  constructor(text) {
    this.text = text;
    this.n = text.length;
    this.sa = [];    // suffix array
    this.lcp = [];   // longest common prefix array
    this.rank = [];
    if (text.length > 0) {
      this._build();
      this._buildLCP();
    }
  }

  _build() {
    const n = this.n;
    const text = this.text;

    // Initial ranking by first character
    let rank = Array.from(text, ch => ch.charCodeAt(0));
    let sa = Array.from({ length: n }, (_, i) => i);
    let tmp = new Array(n);

    for (let gap = 1; gap < n; gap *= 2) {
      const rankCopy = rank.slice();

      const compare = (a, b) => {
        if (rankCopy[a] !== rankCopy[b]) return rankCopy[a] - rankCopy[b];
        const ra = a + gap < n ? rankCopy[a + gap] : -1;
        const rb = b + gap < n ? rankCopy[b + gap] : -1;
        return ra - rb;
      };

      sa.sort(compare);

      tmp[sa[0]] = 0;
      for (let i = 1; i < n; i++) {
        tmp[sa[i]] = tmp[sa[i - 1]] + (compare(sa[i], sa[i - 1]) !== 0 ? 1 : 0);
      }
      rank = tmp.slice();
      if (rank[sa[n - 1]] === n - 1) break;
    }

    this.sa = sa;
    this.rank = rank;
  }

  // Kasai's algorithm for LCP array
  _buildLCP() {
    const n = this.n;
    const sa = this.sa;
    const text = this.text;
    const invSA = new Array(n);
    for (let i = 0; i < n; i++) invSA[sa[i]] = i;

    const lcp = new Array(n).fill(0);
    let h = 0;

    for (let i = 0; i < n; i++) {
      if (invSA[i] > 0) {
        const j = sa[invSA[i] - 1];
        while (i + h < n && j + h < n && text[i + h] === text[j + h]) h++;
        lcp[invSA[i]] = h;
        if (h > 0) h--;
      }
    }
    this.lcp = lcp;
  }

  // Binary search for pattern — returns [lo, hi] range in SA
  _searchRange(pattern) {
    const m = pattern.length;
    const n = this.n;
    const text = this.text;
    const sa = this.sa;

    let lo = 0, hi = n - 1, left = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const suffix = text.slice(sa[mid], sa[mid] + m);
      if (suffix < pattern) lo = mid + 1;
      else if (suffix > pattern) hi = mid - 1;
      else { left = mid; hi = mid - 1; }
    }
    if (left === -1) return [];

    lo = left; hi = n - 1;
    let right = left;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const suffix = text.slice(sa[mid], sa[mid] + m);
      if (suffix === pattern) { right = mid; lo = mid + 1; }
      else hi = mid - 1;
    }

    return this.sa.slice(left, right + 1).sort((a, b) => a - b);
  }

  // Find all occurrences of pattern, returns sorted positions
  search(pattern) {
    return this._searchRange(pattern);
  }

  // Count occurrences
  count(pattern) {
    return this._searchRange(pattern).length;
  }

  // Longest repeated substring in document
  longestRepeatedSubstring() {
    let maxLen = 0, pos = 0;
    for (let i = 1; i < this.n; i++) {
      if (this.lcp[i] > maxLen) {
        maxLen = this.lcp[i];
        pos = this.sa[i];
      }
    }
    return this.text.slice(pos, pos + maxLen);
  }

  // Longest common substring between this doc and another
  longestCommonSubstring(other) {
    // Use a separator character that won't appear in normal text
    const sep = '\x00';
    const combined = this.text + sep + other;
    const sa2 = new SuffixArray(combined);
    const sepIdx = this.text.length;
    let maxLen = 0, result = '';

    for (let i = 1; i < sa2.n; i++) {
      const a = sa2.sa[i - 1];
      const b = sa2.sa[i];
      // One suffix from each string (separated by sep)
      if ((a < sepIdx) !== (b < sepIdx) && sa2.lcp[i] > maxLen) {
        maxLen = sa2.lcp[i];
        result = combined.slice(sa2.sa[i], sa2.sa[i] + maxLen);
      }
    }
    return result;
  }
}

module.exports = SuffixArray;
