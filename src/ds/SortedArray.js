// Array kept sorted by a numeric key (the mission month).
// Used for: the diary and the Learn lessons. Binary search jumps to any month.
// insert O(n) (binary search + splice) · findByKey / upTo O(log n + k) · space O(n)
export class SortedArray {
  constructor(key = (item) => item.month) {
    this.items = [];
    this.key = key;
  }

  size() { return this.items.length; }

  // First index whose key is >= target. Returns { index, steps } so we can show the steps in the demo.
  lowerBound(target) {
    let lo = 0;
    let hi = this.items.length;
    let steps = 0;
    while (lo < hi) {
      steps++;
      const mid = Math.floor((lo + hi) / 2);
      if (this.key(this.items[mid]) < target) lo = mid + 1;
      else hi = mid;
    }
    return { index: lo, steps };
  }

  insert(item) {
    // insert after equal keys so entries of the same month keep their order
    const { index } = this.lowerBound(this.key(item) + 1);
    this.items.splice(index, 0, item);
  }

  findByKey(target) {
    const { index, steps } = this.lowerBound(target);
    const found = [];
    for (let i = index; i < this.items.length && this.key(this.items[i]) === target; i++) {
      found.push(this.items[i]);
    }
    return { found, steps };
  }

  // Every item whose key is <= target (a prefix of the array). Binary search finds where it ends.
  // O(log n) to find the cut + O(k) to copy the k items
  upTo(target) {
    const { index, steps } = this.lowerBound(target + 1);
    return { found: this.items.slice(0, index), steps };
  }

  toArray() { return [...this.items]; }
}
