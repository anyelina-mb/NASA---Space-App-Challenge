// Run with: npm test   (uses Node's built-in test runner, no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MaxHeap, Queue, Stack, SortedArray, DecisionTree } from '../src/ds/index.js';
import { createEngine, PROFILE_OPTIONS } from '../src/engine/createEngine.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const data = () => ({ stages: load('stages.json'), risks: load('risks.json'), symptoms: load('symptoms.json'), bodyParts: load('body-parts.json'), lessons: load('lessons.json') });

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

// ---------- Player profile (Character Creator) ----------
test('Profile: saved with a trimmed name and every look matches an avatar image', () => {
  const engine = createEngine(data());
  assert.equal(engine.getProfile(), null);
  const p = engine.setProfile({ name: '  Cmdr. Anyi ', bodyType: 'female', skinTone: 'dark', suitColor: 'blue' });
  assert.deepEqual(p, { name: 'Cmdr. Anyi', bodyType: 'female', skinTone: 'dark', suitColor: 'blue' });
  assert.equal(engine.getProfile().bodyType, 'female');

  const avatars = load('avatars.json');
  for (const b of PROFILE_OPTIONS.bodyType) for (const s of PROFILE_OPTIONS.skinTone) for (const c of PROFILE_OPTIONS.suitColor) {
    assert.ok(avatars.some((a) => a.bodyType === b && a.skinTone === s && a.suitColor === c), `${b}/${s}/${c} has an image`);
  }
});

test('Profile edge cases: empty name and unknown options are rejected', () => {
  const engine = createEngine(data());
  const ok = { name: 'Anyi', bodyType: 'male', skinTone: 'light', suitColor: 'red' };
  assert.throws(() => engine.setProfile({ ...ok, name: '   ' }));
  assert.throws(() => engine.setProfile({ ...ok, bodyType: 'robot' }));
  assert.throws(() => engine.setProfile({ ...ok, skinTone: 'green' }));
  assert.throws(() => engine.setProfile({ ...ok, suitColor: 'pink' }));
  assert.equal(engine.getProfile(), null, 'a rejected profile is not saved');
});

// ---------- Learn mode (lessons by month) ----------
test('SortedArray.upTo returns every item up to a key with binary search', () => {
  const d = new SortedArray((e) => e.start);
  assert.deepEqual(d.upTo(5).found, [], 'empty array');
  [9, 1, 28, 2, 12, 9].forEach((start) => d.insert({ start }));
  assert.deepEqual(d.upTo(9).found.map((e) => e.start), [1, 2, 9, 9]);
  assert.equal(d.upTo(0).found.length, 0, 'before the first item');
  assert.equal(d.upTo(99).found.length, 6, 'after the last item');
});

test('Learn: month 9 shows the landing lesson, month 1 does not; body area filters', () => {
  const e = createEngine(data());
  const ids = (m, area) => e.getLessons({ month: m, area }).lessons.map((l) => l.id);
  assert.ok(ids(9).includes('landing-38'));
  assert.ok(!ids(1).includes('landing-38'));
  assert.ok(ids(1).includes('leaving-gravity'));
  assert.ok(ids(20, 'head').every((id) => e.getLessons({ month: 20, area: 'head' }).lessons.find((l) => l.id === id).areas.includes('head')));
  assert.deepEqual(ids(36, 'hand'), [], 'no lesson for that area');
  assert.throws(() => e.getLessons({ month: 0 }), RangeError);
});

test('Learn: every lesson has a NASA source, a valid month range and a body area', () => {
  const { lessons } = load('lessons.json');
  const areas = new Set(load('body-parts.json').map((p) => p.area));
  for (const l of lessons) {
    assert.match(l.source, /nasa\.gov/, `${l.id} source`);
    assert.ok(l.start >= 1 && l.end <= 36 && l.start <= l.end, `${l.id} months`);
    assert.ok(l.areas.length > 0 && l.areas.every((a) => areas.has(a)), `${l.id} areas`);
  }
});

test('Learn: the heap ranks the top topics of a month and progress counts learned lessons', () => {
  const e = createEngine(data());
  const top = e.getTopTopics(9, 3);
  assert.equal(top.length, 3);
  assert.ok(top[0].score >= top[1].score && top[1].score >= top[2].score, 'highest score first');
  assert.equal(top[0].id, 'landing-38', 'landing in Mars gravity is the top topic of month 9');
  assert.equal(e.getTopTopics(36, 10).length, 1, 'k larger than the lessons available');
  assert.equal(e.markLearned('landing-38').learned, 1);
  assert.equal(e.markLearned('landing-38').learned, 1, 'learning twice counts once');
  assert.throws(() => e.markLearned('not-a-lesson'));
});
