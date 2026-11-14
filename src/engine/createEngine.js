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

// Demo placeholder: real green/yellow/red limits need a written source before use.
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
    profile: null, // { name, bodyType, skinTone, suitColor }, set by the Character Creator
  };

  // Lessons active in a month (start <= month <= end), optionally only for one body area
  function lessonsFor(month, area = null) {
    getStage(month, stages); // throws RangeError for months outside 1-36
    const { found, steps } = lessonIndex.upTo(month);
    const lessonsNow = found.filter((l) => l.end >= month && (!area || l.areas.includes(area)));
    return { lessons: lessonsNow, steps };
  }

  const progress = () => ({ learned: learned.size, total: lessons.lessons.length, ids: [...learned] });

  function addAlert(color, title) {
    if (color === 'green') return;
    state.alerts.insert({ level: LEVEL[color], color, title, month: state.month, order: state.order++ });
  }

  function scheduleTasks() {
    const stage = getStage(state.month, stages);
    state.tasks.enqueue({ id: 'checkin', text: 'Monthly check-in' });
    state.tasks.enqueue({ id: 'exercise', text: 'Exercise session' });
    if (stage.id === 'mars' || stage.id === 'earth') state.tasks.enqueue({ id: 'balance', text: 'Balance check' });
    state.tasks.enqueue({ id: 'diary', text: 'Write a diary note' });
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
      if (stage.id !== before) state.diary.insert({ month: state.month, text: `New stage: ${stage.name}` });
      return { month: state.month, stage, finished: false, stageChanged: stage.id !== before };
    },

    saveCheckin(values) {
      const b = state.baseline ?? {};
      const status = {
        heartRate: compareToBaseline(values.heartRate, b.heartRate),
        bloodPressure: compareToBaseline(values.systolic, b.systolic),
        temperature: compareToBaseline(values.temperature, b.temperature),
        sleep: values.sleepHours != null && b.sleepHours != null
          ? (b.sleepHours - values.sleepHours >= 3 ? 'red' : b.sleepHours - values.sleepHours >= 1 ? 'yellow' : 'green')
          : 'green',
        mood: values.mood >= 4 ? 'yellow' : 'green', // mood 0 (very good) – 4 (very low)
      };
      state.lastCheckin = { month: state.month, values, status };
      for (const [name, color] of Object.entries(status)) addAlert(color, `${name}: variation from your baseline`);
      state.diary.insert({ month: state.month, text: 'Monthly check-in saved' });
      if (state.tasks.peek()?.id === 'checkin') state.tasks.dequeue();
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
    assess({ symptomIds, answers = {} }) {
      const picked = symptomIds.map((id) => symptomById.get(id)).filter(Boolean);
      if (picked.length === 0) return { results: [], ranking: [] };

      // 1. Red flags first
      if (picked.some((s) => s.redFlag)) {
        addAlert('red', RED_FLAG_RESULT.title);
        state.outbox.enqueue({ title: RED_FLAG_RESULT.title, month: state.month });
        state.diary.insert({ month: state.month, text: `Body scan: ${RED_FLAG_RESULT.title} [red]` });
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
        if (!tree) return { symptomId: s.id, leaf: DecisionTree.UNKNOWN, path: [] };
        const { leaf, path } = tree.traverse({ ...answers, topCause: top.id });
        const out = { ...leaf };
        // 4. Escalation rules
        if (out.color === 'yellow' && answers.severity === 'Severe') { out.color = 'red'; path.push('Severity severe → raise to red'); }
        if (out.color === 'green' && answers.onset === 'Ongoing from a previous check-in') { out.color = 'yellow'; path.push('Ongoing → raise to yellow'); }
        return { symptomId: s.id, leaf: out, path };
      });

      // 5. Side effects: alerts heap, outbox queue, diary
      for (const r of results) {
        addAlert(r.leaf.color, r.leaf.title);
        if (r.leaf.color === 'red') state.outbox.enqueue({ title: r.leaf.title, month: state.month });
        state.diary.insert({ month: state.month, text: `Body scan: ${r.leaf.title} [${r.leaf.color}]` });
      }
      return { results, ranking };
    },

    getAlerts() { return state.alerts.toSortedArray(); },
    nextTask() { return state.tasks.peek(); },
    completeTask() { return state.tasks.dequeue(); },
    getOutbox() { return state.outbox.toArray(); },
    sendOldestReport() { return state.outbox.dequeue(); },
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
      learned.add(id);
      return progress();
    },

    getProgress() { return progress(); },
  };
}
