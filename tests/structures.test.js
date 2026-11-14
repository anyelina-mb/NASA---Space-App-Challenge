// Run with: npm test   (uses Node's built-in test runner, no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MaxHeap, Queue, Stack, SortedArray, DecisionTree } from '../src/ds/index.js';
import { createEngine } from '../src/engine/createEngine.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const data = () => ({ stages: load('stages.json'), risks: load('risks.json'), symptoms: load('symptoms.json'), bodyParts: load('body-parts.json') });

// ---------- Data structures ----------
test('MaxHeap returns items from highest to lowest', () => {
  const h = new MaxHeap();
  [5, 1, 9, 3, 7].forEach((x) => h.insert(x));
  assert.deepEqual(h.toSortedArray(), [9, 7, 5, 3, 1]);
  assert.equal(h.size(), 5, 'toSortedArray must not empty the heap');
});

test('MaxHeap edge cases: empty heap and equal priorities', () => {
  const h = new MaxHeap((a, b) => (a.p !== b.p ? a.p > b.p : a.t < b.t));
  assert.equal(h.extract(), null);
  assert.equal(h.peek(), null);
  h.insert({ p: 2, t: 0 }); h.insert({ p: 2, t: 1 }); h.insert({ p: 3, t: 2 });
  assert.deepEqual(h.toSortedArray().map((x) => x.t), [2, 0, 1]);
});

test('Queue is FIFO and an empty queue returns null', () => {
  const q = new Queue();
  assert.equal(q.dequeue(), null);
  q.enqueue('a'); q.enqueue('b'); q.enqueue('c');
  assert.equal(q.dequeue(), 'a');
  assert.equal(q.peek(), 'b');
  assert.equal(q.size(), 2);
});

test('Stack is LIFO (Back button)', () => {
  const s = new Stack();
  s.push('control'); s.push('scan'); s.push('zoom-arm');
  assert.equal(s.pop(), 'zoom-arm');
  assert.equal(s.peek(), 'scan');
  s.pop(); s.pop();
  assert.equal(s.pop(), null);
});

test('SortedArray keeps months in order and binary search finds them', () => {
  const d = new SortedArray((e) => e.month);
  assert.equal(d.findByKey(5).found.length, 0, 'empty diary');
  [12, 3, 30, 3, 18].forEach((m, i) => d.insert({ month: m, i }));
  assert.deepEqual(d.toArray().map((e) => e.month), [3, 3, 12, 18, 30]);
  assert.equal(d.findByKey(3).found.length, 2, 'both notes of month 3');
  assert.equal(d.findByKey(19).found.length, 0);
  assert.ok(d.findByKey(30).steps <= Math.ceil(Math.log2(5)) + 1, 'O(log n) steps');
});

test('DecisionTree: unknown answer falls back to the safe "not covered" leaf', () => {
  const tree = DecisionTree.fromJSON(load('symptoms.json').symptoms.find((s) => s.id === 'limb-pain').tree);
  const ok = tree.traverse({ trigger: 'Exercise' });
  assert.equal(ok.leaf.color, 'green');
  const unknown = tree.traverse({ trigger: 'Alien bite' });
  assert.equal(unknown.leaf, DecisionTree.UNKNOWN);
  assert.equal(unknown.complete, false);
});

// ---------- Engine ----------
test('Same headache, different month → different result (heap + tree)', () => {
  const early = createEngine(data());
  const a = early.assess({ symptomIds: ['headache'] });
  assert.equal(a.ranking[0].id, 'vestibular');
  assert.equal(a.results[0].leaf.title, 'Your body is adapting');

  const late = createEngine(data());
  while (late.state.month < 32) late.advanceMonth();
  const b = late.assess({ symptomIds: ['headache'], answers: { vision: 'Yes', sudden: 'Gradually' } });
  assert.equal(b.ranking[0].id, 'sans');
  assert.equal(b.results[0].leaf.color, 'yellow');
});

test('Red flag goes straight to red and into the outbox', () => {
  const e = createEngine(data());
  const r = e.assess({ symptomIds: ['chest-pain', 'headache'] });
  assert.equal(r.results[0].leaf.color, 'red');
  assert.equal(e.getOutbox().length, 1);
  assert.equal(e.getAlerts()[0].color, 'red');
});

test('Escalation: severe makes yellow red', () => {
  const e = createEngine(data());
  const r = e.assess({ symptomIds: ['limb-pain'], answers: { trigger: 'Nothing I know', severity: 'Severe' } });
  assert.equal(r.results[0].leaf.color, 'red');
});

test('Edge cases: no symptoms, month limits', () => {
  const e = createEngine(data());
  assert.deepEqual(e.assess({ symptomIds: [] }), { results: [], ranking: [] });
  assert.throws(() => e.getStage(0), RangeError);
  assert.throws(() => e.getStage(37), RangeError);
  while (e.state.month < 36) e.advanceMonth();
  assert.equal(e.advanceMonth().finished, true);
  assert.equal(e.state.month, 36);
});
