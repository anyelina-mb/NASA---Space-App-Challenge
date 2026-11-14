// Stack (LIFO).
// Used for: body scan zoom (Body › Head › Eyes) and the Back button.
// push O(1) · pop O(1) · peek O(1) · space O(n)
export class Stack {
  constructor() { this.items = []; }
  size() { return this.items.length; }
  isEmpty() { return this.items.length === 0; }
  push(value) { this.items.push(value); }
  pop() { return this.isEmpty() ? null : this.items.pop(); }
  peek() { return this.isEmpty() ? null : this.items[this.items.length - 1]; }
  toArray() { return [...this.items]; }
}
