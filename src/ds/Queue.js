// Queue (FIFO) with head/tail indexes, so dequeue does not shift the array.
// Used for: mission tasks and the outbox of reports to Earth.
// enqueue O(1) · dequeue O(1) · peek O(1) · space O(n)
export class Queue {
  constructor() {
    this.items = {};
    this.head = 0;
    this.tail = 0;
  }

  size() { return this.tail - this.head; }
  isEmpty() { return this.size() === 0; }

  enqueue(value) {
    this.items[this.tail] = value;
    this.tail++;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const value = this.items[this.head];
    delete this.items[this.head];
    this.head++;
    return value;
  }

  peek() { return this.isEmpty() ? null : this.items[this.head]; }

  toArray() {
    const out = [];
    for (let i = this.head; i < this.tail; i++) out.push(this.items[i]);
    return out;
  }
}
