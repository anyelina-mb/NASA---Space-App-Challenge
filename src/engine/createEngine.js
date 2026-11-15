// The engine: the only thing the screens talk to (see "The contract" in the architecture doc).
// It receives the data files as a parameter, so it runs both in the browser (Vite) and in tests (Node).
import { MaxHeap, Queue, SortedArray, DecisionTree } from '../ds/index.js';
import { getStage, riskWeight, MISSION_MONTHS } from './missionClock.js';

const LEVEL = { green: 1, yellow: 2, red: 3 };

// Same values as src/data/avatars.json
export const PROFILE_OPTIONS = {
  bodyType: ['female', 'male'],
  skinTone: ['light', 'medium', 'dark'],
  suitColor: ['orange', 'blue', 'red'],
};

const RED_FLAG_RESULT = {
  color: 'red',
  title: 'Emergency symptom',
  cause: 'Chest pain, fainting, shortness of breath or sudden vision change need an immediate medical evaluation.',
  action: 'Stop, tell the crew and contact the flight surgeons now.',
  source: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/',
};

// Demo rules (NOT medical limits): how far today is from YOUR Earth baseline.
// Temperature uses degrees (a % change would hide a fever); sleep only counts hours lost.
export const DEMO_RULES = {
  temperature: { kind: 'abs', yellow: 0.5, red: 1.5, text: 'yellow at ±0.5 °C, red at ±1.5 °C' },
  sleepHours: { kind: 'drop', yellow: 1, red: 3, text: 'yellow at 1 h less, red at 3 h less' },
  default: { kind: 'pct', yellow: 0.15, red: 0.3, text: 'yellow at a 15% change, red at 30%' },
};
export function statusFor(id, value, base) {
  if (value == null || base == null || Number.isNaN(Number(value))) return 'green';
  const r = DEMO_RULES[id] ?? DEMO_RULES.default;
  const v = Number(value);
  const d = r.kind === 'abs' ? Math.abs(v - base) : r.kind === 'drop' ? base - v : Math.abs(v - base) / base;
  return d >= r.red ? 'red' : d >= r.yellow ? 'yellow' : 'green';
}

function compareToBaseline(value, base) {
  if (value == null || base == null) return 'green';
  const change = Math.abs(value - base) / base;
  if (change >= 0.3) return 'red';
  if (change >= 0.15) return 'yellow';
  return 'green';
}

export function createEngine({ stages, risks, symptoms, bodyParts, lessons = { lessons: [] } }) {
  const riskById = new Map(risks.risks.map((r) => [r.id, r]));
  // Learn mode: lessons sorted by the month they start, so binary search finds a month's lessons
  const lessonIndex = new SortedArray((l) => l.start);
  for (const l of lessons.lessons) lessonIndex.insert(l);
  const learned = new Set();
  const symptomById = new Map(symptoms.symptoms.map((s) => [s.id, s]));
  const partByMesh = new Map(bodyParts.map((p) => [p.mesh, p]));
  const trees = new Map(
    symptoms.symptoms.filter((s) => s.tree).map((s) => [s.id, DecisionTree.fromJSON(s.tree)]),
  );

  const state = {
    month: 1,
    baseline: null,
    lastCheckin: null,
    alerts: new MaxHeap((a, b) => (a.level !== b.level ? a.level > b.level : a.order < b.order)),
    tasks: new Queue(),
    outbox: new Queue(),
    diary: new SortedArray((e) => e.month),
    order: 0,
    checkins: [], // every saved check-in, in order (for Trends)
    seenScenes: new Set(['trip']), // stages already visited (one diary note per new stage)
    profile: null, // { name, bodyType, skinTone, suitColor }, set by the Character Creator
    xp: 0,
    checkinMonths: new Set(), // months with a saved check-in (for the streak)
    exercise: [], // { month, type, minutes, feel }
    doneTasks: new Set(), // "month:taskId" already finished, so going back to a month doesn't bring them back
  };

  // Lessons active in a month (start <= month <= end), optionally only for one body area
  function lessonsFor(month, area = null) {
    getStage(month, stages); // throws RangeError for months outside 1-36
    const { found, steps } = lessonIndex.upTo(month);
    const lessonsNow = found.filter((l) => l.end >= month && (!area || l.areas.includes(area)) && forMe(l));
    return { lessons: lessonsNow, steps };
  }

  // Diary entries are kept sorted by month (SortedArray); lastNote is simply the newest one written
  function note(text) {
    state.diary.insert({ month: state.month, text });
    state.lastNote = { month: state.month, text };
  }

  // Some lessons are only for one body type (e.g. NASA data about women astronauts)
  const forMe = (l) => !l.onlyFor || state.profile?.bodyType === l.onlyFor;
  const progress = () => ({ learned: learned.size, total: lessons.lessons.filter(forMe).length, ids: [...learned] });

  function addAlert(color, title) {
    if (color === 'green') return;
    state.alerts.insert({ level: LEVEL[color], color, title, month: state.month, order: state.order++ });
  }

  // Today's tasks for the current month, in order (the check-in always goes first).
  // A new month gives a fresh queue: first in, first out.
  function scheduleTasks() {
    const stage = getStage(state.month, stages);
    state.tasks = new Queue();
    for (const t of stage.tasks ?? []) if (!state.doneTasks.has(`${state.month}:${t.id}`)) state.tasks.enqueue({ ...t, month: state.month });
  }
  const markDone = (id) => state.doneTasks.add(`${state.month}:${id}`);

  const XP = { task: 5, checkin: 15, lesson: 10, exercise: 5, selfCheck: 10 };
  function addXp(kind) { state.xp += XP[kind] ?? 0; return state.xp; }

  // Removes a task by id wherever it is (e.g. the check-in saved from the menu, not from Today)
  function finishTask(id) {
    const left = state.tasks.toArray();
    const found = left.some((t) => t.id === id);
    if (!found) return false;
    state.tasks = new Queue();
    left.filter((t) => t.id !== id).forEach((t) => state.tasks.enqueue(t));
    markDone(id);
    addXp('task');
    return true;
  }

  // Consecutive months with a check-in, counting back from the latest one
  function streak() {
    let m = state.month; let n = 0;
    if (!state.checkinMonths.has(m)) m -= 1;
    while (m >= 1 && state.checkinMonths.has(m)) { n++; m--; }
    return n;
  }

  // +1 when the last check-in shows a variation related to this risk
  function checkinBonus(riskId) {
    const c = state.lastCheckin;
    if (!c) return 0;
    const related = { sleep: c.status.sleep, cardio: c.status.heartRate !== 'green' ? c.status.heartRate : c.status.bloodPressure, behavioral: c.status.mood };
    return related[riskId] && related[riskId] !== 'green' ? 1 : 0;
  }

  scheduleTasks();

  return {
    state,

    getBaseline() { return state.baseline; },

    setBaseline(baseline) {
      state.baseline = { ...baseline };
    },

    setProfile({ name, bodyType, skinTone, suitColor }) {
      const clean = String(name ?? '').trim();
      if (!clean) throw new Error('Profile needs a name');
      if (!PROFILE_OPTIONS.bodyType.includes(bodyType)) throw new Error(`Unknown body type: ${bodyType}`);
      if (!PROFILE_OPTIONS.skinTone.includes(skinTone)) throw new Error(`Unknown skin tone: ${skinTone}`);
      if (!PROFILE_OPTIONS.suitColor.includes(suitColor)) throw new Error(`Unknown suit color: ${suitColor}`);
      state.profile = { name: clean, bodyType, skinTone, suitColor };
      return state.profile;
    },

    getProfile() { return state.profile; },

    getStage(month = state.month) {
      return getStage(month, stages);
    },

    advanceMonth() {
      if (state.month >= MISSION_MONTHS) return { month: state.month, stage: getStage(state.month, stages), finished: true };
      const before = getStage(state.month, stages).id;
      state.month += 1;
      const stage = getStage(state.month, stages);
      scheduleTasks();
      if (stage.id !== before) note(`New stage: ${stage.name}`);
      return { month: state.month, stage, finished: false, stageChanged: stage.id !== before };
    },

    // Jump to any month (the month slider). Throws RangeError outside 1-36.
    setMonth(month) {
      const before = getStage(state.month, stages);
      const stage = getStage(month, stages);
      if (month === state.month) return { month, stage, stageChanged: false };
      state.month = month;
      scheduleTasks();
      const changed = stage.scene !== before.scene;
      if (changed && !state.seenScenes.has(stage.scene)) { state.seenScenes.add(stage.scene); note(`New stage: ${stage.name}`); }
      return { month, stage, stageChanged: changed };
    },

    saveCheckin(values) {
      const b = state.baseline ?? {};
      const status = {
        heartRate: statusFor('heartRate', values.heartRate, b.heartRate),
        bloodPressure: statusFor('systolic', values.systolic, b.systolic),
        temperature: statusFor('temperature', values.temperature, b.temperature),
        sleep: statusFor('sleepHours', values.sleepHours, b.sleepHours),
        mood: values.mood >= 4 ? 'yellow' : 'green', // mood 0 (very good) – 4 (very low)
        bloodSugar: statusFor('bloodSugar', values.bloodSugar, b.bloodSugar),
        vision: values.visionChanged ? 'yellow' : 'green', // any change in vision is worth telling the crew
      };
      state.lastCheckin = { month: state.month, values, status };
      // one check-in per month: saving again in the same month updates it (no double points in Trends)
      state.checkins = state.checkins.filter((c) => c.month !== state.month);
      state.checkins.push(state.lastCheckin);
      state.checkins.sort((a, c) => a.month - c.month);
      if (!state.checkinMonths.has(state.month)) addXp('checkin'); // XP only for the first check-in of a month
      state.checkinMonths.add(state.month);
      for (const [name, color] of Object.entries(status)) addAlert(color, `${name}: variation from your baseline`);
      note('Monthly check-in saved');
      finishTask('checkin');
      return status;
    },

    getBodyAreas(meshNames) {
      return meshNames
        .map((mesh) => partByMesh.get(mesh))
        .filter(Boolean)
        .map((part) => ({
          ...part,
          symptoms: symptoms.symptoms.filter((s) => s.areas.includes(part.area)).map((s) => ({ id: s.id, label: s.label, redFlag: s.redFlag, questions: s.questions })),
        }));
    },

    // selection = { symptomIds: [...], answers: { questionId: option } }
    assess({ symptomIds, answers = {}, commit = true }) {
      const picked = symptomIds.map((id) => symptomById.get(id)).filter(Boolean);
      if (picked.length === 0) return { results: [], ranking: [] };

      // 1. Red flags first
      if (picked.some((s) => s.redFlag)) {
        if (commit) {
          addAlert('red', RED_FLAG_RESULT.title);
          state.outbox.enqueue({ title: RED_FLAG_RESULT.title, month: state.month });
          note(`Body scan: ${RED_FLAG_RESULT.title} [red]`);
        }
        return { results: [{ symptomId: picked.find((s) => s.redFlag).id, leaf: RED_FLAG_RESULT, path: ['Red flag → yes'] }], ranking: [] };
      }

      // 2. Rank possible causes with a max-heap (score, then how serious the risk is)
      // ties: higher score → more serious risk → listed first in the symptom data
      const heap = new MaxHeap((a, b) => {
        if (a.score !== b.score) return a.score > b.score;
        if (a.severity !== b.severity) return a.severity > b.severity;
        return a.order < b.order;
      });
      let order = 0;
      const seen = new Set();
      for (const s of picked) {
        for (const riskId of s.risks) {
          if (seen.has(riskId)) continue;
          seen.add(riskId);
          const risk = riskById.get(riskId);
          const score = riskWeight(risk, state.month, stages, risks.transitionMonths)
            + checkinBonus(riskId)
            + (answers.onset === 'Ongoing from a previous check-in' ? 1 : 0);
          heap.insert({ id: riskId, name: risk.name, score, severity: risk.severity, order: order++ });
        }
      }
      const ranking = heap.toSortedArray();
      const top = ranking[0];

      // 3. Walk each symptom's decision tree; the heap's top cause answers the 'topCause' question
      const results = picked.map((s) => {
        const tree = trees.get(s.id);
        if (!tree) return { symptomId: s.id, leaf: DecisionTree.UNKNOWN, path: [], complete: true };
        // the heap's top cause among THIS symptom's risks answers its first question
        const ownTop = ranking.find((r) => s.risks.includes(r.id)) ?? top;
        const { leaf, path, complete } = tree.traverse({ ...answers, topCause: ownTop.id });
        const out = { ...leaf };
        // 4. Escalation rules
        if (out.color === 'yellow' && answers.severity === 'Severe') { out.color = 'red'; path.push('Severity severe → raise to red'); }
        if (out.color === 'green' && answers.onset === 'Ongoing from a previous check-in') { out.color = 'yellow'; path.push('Ongoing → raise to yellow'); }
        return { symptomId: s.id, leaf: out, path, complete, riskId: ownTop.id };
      });
      if (!commit) return { results, ranking };

      // 5. Side effects: alerts heap, outbox queue, diary
      for (const r of results) {
        addAlert(r.leaf.color, r.leaf.title);
        if (r.leaf.color === 'red') state.outbox.enqueue({ title: r.leaf.title, month: state.month });
        note(`Body scan: ${r.leaf.title} [${r.leaf.color}]`);
      }
      addXp('selfCheck');
      finishTask('balance'); // the Earth "Balance check" task is a self-check
      return { results, ranking };
    },

    getAlerts() { return state.alerts.toSortedArray(); },

    // The k strongest NASA risks this month (max-heap on the mission-clock weight)
    getTopRisks(month = state.month, k = 3) {
      const heap = new MaxHeap((a, b) => (a.score !== b.score ? a.score > b.score : a.severity > b.severity));
      for (const r of risks.risks) heap.insert({ ...r, score: riskWeight(r, month, stages, risks.transitionMonths) });
      const out = [];
      while (out.length < k && !heap.isEmpty()) out.push(heap.extract());
      return out;
    },

    // Clue for a tapped body area: the most likely NASA risk there this month (heap over that area's symptoms)
    getAreaInsight(area) {
      const ids = symptoms.symptoms.filter((s) => s.areas.includes(area) && !s.redFlag).map((s) => s.id);
      if (!ids.length) return null;
      const { ranking } = this.assess({ symptomIds: ids, commit: false });
      return ranking.length ? riskById.get(ranking[0].id) : null;
    },

    // ---------- Diary (SortedArray by month) ----------
    addDiary(text, month = state.month) {
      const t = String(text ?? '').trim();
      if (!t) throw new Error('Diary entry is empty');
      getStage(month, stages); // RangeError outside 1-36
      state.diary.insert({ month, text: t });
      state.lastNote = { month, text: t };
      if (!finishTask('diary')) finishTask('report'); // writing the mission report also counts
      return state.diary.size();
    },
    getDiary() { return state.diary.toArray(); },

    // Trends "example mission": made-up months for the ones without a real check-in.
    // NOT saved in your check-ins (so it never changes your real data); the screen shows them as hollow dots.
    getExampleHistory() {
      const b = state.baseline;
      if (!b) return [];
      const real = new Set(state.checkins.map((c) => c.month));
      const out = [];
      for (let m = 1; m <= MISSION_MONTHS; m++) {
        if (real.has(m)) continue;
        const landing = m >= 9 && m <= 10;
        const v = { heartRate: b.heartRate + (landing ? 8 : (m % 3)), systolic: b.systolic + (m % 4), temperature: b.temperature, sleepHours: b.sleepHours - (landing ? 1.4 : (m % 5) * 0.1), mood: landing ? 2 : 1, bloodSugar: b.bloodSugar + (m % 3) };
        const status = { heartRate: compareToBaseline(v.heartRate, b.heartRate), sleep: b.sleepHours - v.sleepHours >= 1 ? 'yellow' : 'green', mood: 'green' };
        out.push({ month: m, values: v, status, demo: true });
      }
      return out;
    },
    getCheckins() { return state.checkins; },
    getRisk(id) { return riskById.get(id) ?? null; },
    // Shortcut into Learn already filtered (e.g. "Why? Isolation" from a self-check result)
    focusLearn(focus) { state.learnFocus = focus; },
    monthsWithHazard(hazard) {
      const ms = new Set();
      for (const l of lessons.lessons) if (l.hazard === hazard && forMe(l)) for (let m = l.start; m <= l.end; m++) ms.add(m);
      return [...ms].sort((a, b) => a - b);
    },
    takeLearnFocus() { const f = state.learnFocus ?? null; state.learnFocus = null; return f; },
    getLastNote() { return state.lastNote ?? null; },
    // Puts a self-check result in the outbox to Earth (queue). Returns its place in line.
    addToReport(title, color = 'yellow') {
      state.outbox.enqueue({ title, color, month: state.month });
      return state.outbox.size();
    },
    topAlert() { return state.alerts.peek(); },
    // "Handled": takes the most urgent alert out of the max-heap; the next most urgent rises to the top
    resolveTopAlert() {
      const a = state.alerts.extract();
      if (a) note(`Handled: ${a.title}`);
      return a;
    },
    nextTask() { return state.tasks.peek(); },
    getTasks() { return state.tasks.toArray(); },
    completeTask() { const t = state.tasks.dequeue(); if (t) { markDone(t.id); addXp('task'); } return t; },
    finishTask(id) { return finishTask(id); },

    // ---------- Gamification ----------
    getStats() {
      return { xp: state.xp, streak: streak(), lessons: progress() };
    },

    logExercise({ type, minutes, feel = 'okay' }) {
      const m = Number(minutes);
      if (!type) throw new Error('Exercise needs a type');
      if (!Number.isFinite(m) || m <= 0 || m > 300) throw new RangeError('Minutes must be between 1 and 300');
      state.exercise.push({ month: state.month, type, minutes: m, feel });
      addXp('exercise');
      finishTask('exercise');
      return state.exercise.length;
    },

    // Exercise sessions logged this month
    exerciseThisMonth() { return state.exercise.filter((e) => e.month === state.month); },

    // Color of each body system from the last check-in and the exercise log (demo rules, not medical limits)
    getBodySystems() {
      const c = state.lastCheckin?.status;
      const worst = (...xs) => (xs.includes('red') ? 'red' : xs.includes('yellow') ? 'yellow' : 'green');
      const sessions = this.exerciseThisMonth().length;
      return [
        { id: 'heart', label: 'Heart', color: c ? worst(c.heartRate, c.bloodPressure) : 'green' },
        { id: 'bones', label: 'Bones & muscle', color: sessions >= 2 ? 'green' : sessions === 1 ? 'yellow' : (state.month > 1 ? 'yellow' : 'green') },
        { id: 'mind', label: 'Mind', color: c?.mood ?? 'green' },
        { id: 'sleep', label: 'Sleep', color: c?.sleep ?? 'green' },
        { id: 'immune', label: 'Immune', color: c?.temperature ?? 'green' },
      ];
    },

    // Header colors: what the last check-in said, at a glance
    getLastCheckinStatus() {
      const c = state.lastCheckin?.status;
      if (!c) return null;
      const worst = (a, b) => (a === 'red' || b === 'red' ? 'red' : a === 'yellow' || b === 'yellow' ? 'yellow' : 'green');
      return { Sleep: c.sleep, Heart: worst(c.heartRate, c.bloodPressure), Mood: c.mood, Vision: c.vision ?? 'green' };
    },
    getOutbox() { return state.outbox.toArray(); },
    sendOldestReport() { const r = state.outbox.dequeue(); if (r) finishTask('report'); return r; },
    searchDiary(month) { return state.diary.findByKey(month); },

    // ---------- Learn mode ----------
    // Lessons active in a month (start <= month <= end), optionally only for one body area.
    // Binary search cuts the lessons that start after the month: O(log n + k)
    getLessons({ month = state.month, area = null } = {}) { return lessonsFor(month, area); },

    // The k most important topics of a month, ranked by a max-heap:
    // score = lesson importance + how strong its NASA risk is in that stage (missionClock weights)
    getTopTopics(month = state.month, k = 3) {
      const heap = new MaxHeap((a, b) => (a.score !== b.score ? a.score > b.score : a.order < b.order));
      lessonsFor(month).lessons.forEach((l, order) => {
        const risk = l.riskId ? riskById.get(l.riskId) : null;
        const weight = risk ? riskWeight(risk, month, stages, risks.transitionMonths) : 2;
        heap.insert({ lesson: l, score: l.importance + weight, order });
      });
      const top = [];
      while (top.length < k && !heap.isEmpty()) top.push(heap.extract());
      return top.map((t) => ({ ...t.lesson, score: t.score }));
    },

    markLearned(id) {
      if (!lessons.lessons.some((l) => l.id === id)) throw new Error(`Unknown lesson: ${id}`);
      if (!learned.has(id)) addXp('lesson');
      learned.add(id);
      return progress();
    },

    getProgress() { return progress(); },

    // ---------- End of the mission ----------
    // Done = back on Earth (month 36) with every task of the Today queue finished
    isMissionDone() { return state.month === MISSION_MONTHS && state.tasks.isEmpty(); },
    // 'stay' = the player chose to keep exploring after the "mission complete" screen
    getEndChoice() { return state.endChoice ?? null; },
    setEndChoice(choice) { state.endChoice = choice; },

    // ---------- Save / load (so a page refresh keeps your mission) ----------
    // Turns every structure into plain arrays: O(n) time and space
    snapshot() {
      return {
        v: 1,
        month: state.month, baseline: state.baseline, profile: state.profile, xp: state.xp, order: state.order,
        lastCheckin: state.lastCheckin, lastNote: state.lastNote ?? null, endChoice: state.endChoice ?? null,
        checkins: state.checkins, exercise: state.exercise,
        alerts: state.alerts.items, tasks: state.tasks.toArray(), outbox: state.outbox.toArray(), diary: state.diary.toArray(),
        seenScenes: [...state.seenScenes], checkinMonths: [...state.checkinMonths], learned: [...learned], doneTasks: [...state.doneTasks],
      };
    },
    // Rebuilds the structures by inserting again: heap and sorted array O(n log n), queues O(n)
    restore(snap) {
      if (!snap || snap.v !== 1) return false;
      getStage(snap.month, stages); // RangeError if the save is broken
      Object.assign(state, {
        month: snap.month, baseline: snap.baseline, profile: snap.profile, xp: snap.xp ?? 0, order: snap.order ?? 0,
        lastCheckin: snap.lastCheckin, lastNote: snap.lastNote, endChoice: snap.endChoice,
        checkins: (snap.checkins ?? []).filter((c) => !c.demo), // older saves had example months mixed in: keep only real check-ins
        exercise: snap.exercise ?? [],
        seenScenes: new Set(snap.seenScenes ?? ['trip']), checkinMonths: new Set(snap.checkinMonths ?? []),
        doneTasks: new Set(snap.doneTasks ?? []),
      });
      state.alerts = new MaxHeap(state.alerts.compare);
      for (const a of snap.alerts ?? []) state.alerts.insert(a);
      state.tasks = new Queue();
      for (const t of snap.tasks ?? []) state.tasks.enqueue(t);
      state.outbox = new Queue();
      for (const r of snap.outbox ?? []) state.outbox.enqueue(r);
      state.diary = new SortedArray((e) => e.month);
      for (const e of snap.diary ?? []) state.diary.insert(e);
      learned.clear();
      for (const id of snap.learned ?? []) if (lessons.lessons.some((l) => l.id === id)) learned.add(id);
      return true;
    },
  };
}
