// Max-heap (priority queue) stored in an array.
// Used for: alerts (most urgent first) and ranking possible causes in assess().
// insert O(log n) · extract O(log n) · peek O(1) · space O(n)
export class MaxHeap {
  // compare(a, b) returns true when a should be above b
  constructor(compare = (a, b) => a > b) {
    this.items = [];
    this.compare = compare;
  }

  size() { return this.items.length; }
  isEmpty() { return this.items.length === 0; }
  peek() { return this.items[0] ?? null; }

  insert(value) {
    this.items.push(value);
    let i = this.items.length - 1;
    // bubble up: swap with the parent while the new value is higher
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!this.compare(this.items[i], this.items[parent])) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  extract() {
    if (this.isEmpty()) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (!this.isEmpty()) {
      this.items[0] = last;
      // sink down: swap with the higher child until the order is fixed
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let best = i;
        if (left < this.items.length && this.compare(this.items[left], this.items[best])) best = left;
        if (right < this.items.length && this.compare(this.items[right], this.items[best])) best = right;
        if (best === i) break;
        [this.items[i], this.items[best]] = [this.items[best], this.items[i]];
        i = best;
      }
    }
    return top;
  }

  // Sorted copy (most urgent first) without changing this heap. O(n log n)
  toSortedArray() {
    const copy = new MaxHeap(this.compare);
    copy.items = [...this.items];
    const out = [];
    while (!copy.isEmpty()) out.push(copy.extract());
    return out;
  }
}
