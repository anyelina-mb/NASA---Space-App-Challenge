// Monthly check-in (Figma: 08). Enter today's numbers; each one is compared with your
// Earth baseline and turns green / yellow / red right away (demo limits, not medical limits).
// Saving: alerts go into the MaxHeap, the entry into the diary (SortedArray), the task leaves the Queue.
import { useState } from 'react';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import { sound } from '../../audio/sound.js';
import { statusFor, DEMO_RULES } from '../../engine/createEngine.js';
import { hazardOf, HAZARD_LABEL } from '../hazards.js';

const ROWS = [
  { id: 'heartRate', label: 'Resting heart rate', unit: 'bpm', step: 1, how: 'sit still 5 min, count your wrist pulse for 30 s and double it', risk: 'cardio', src: 'SENSOR' },
  { id: 'systolic', label: 'Blood pressure (top number)', unit: 'mmHg', step: 1, how: 'sit, arm resting at heart level, don\'t talk', risk: 'cardio', src: 'SENSOR' },
  { id: 'sleepHours', label: 'Sleep', unit: 'h', step: 0.5, how: 'hours from lights off to waking up', risk: 'sleep', src: 'SELF-REPORT' },
  { id: 'temperature', label: 'Body temperature', unit: '°C', step: 0.1, how: 'same time every day, under the tongue', risk: 'immune', src: 'SENSOR' },
  { id: 'bloodSugar', label: 'Blood sugar', unit: 'mg/dL', step: 1, how: 'finger-prick meter, before eating', risk: 'nutrition', src: 'SENSOR' },
];
const STATUS_KEY = { heartRate: 'heartRate', systolic: 'bloodPressure', sleepHours: 'sleep', temperature: 'temperature', bloodSugar: 'bloodSugar' };
const MOODS = ['great', 'good', 'okay', 'low', 'very low'];
const rank = (c) => (c === 'red' ? 3 : c === 'yellow' ? 2 : 1);

const colorOf = (id, v, b) => statusFor(id, v, b);

// "Why measure this?": the NASA risk behind each measurement, with its official page
function Why({ risk }) {
  if (!risk) return null;
  return <small className="ci-why" title={risk.why}>why? <a href={risk.source} target="_blank" rel="noreferrer">NASA risk: {risk.name} ›</a></small>;
}

export default function CheckIn({ engine, refresh, goTo, goBack, goHome }) {
  const base = engine.getBaseline();
  const stage = engine.getStage();
  const [v, setV] = useState({ heartRate: base.heartRate, systolic: base.systolic, sleepHours: base.sleepHours, temperature: base.temperature, bloodSugar: base.bloodSugar });
  const [mood, setMood] = useState(1);
  const [vision, setVision] = useState(false);

  const colors = Object.fromEntries(ROWS.map((r) => [r.id, v[r.id] === '' ? 'green' : colorOf(r.id, Number(v[r.id]), base[r.id])]));
  colors.mood = mood >= 4 ? 'yellow' : 'green';
  colors.vision = vision ? 'yellow' : 'green';
  const counts = Object.values(colors).reduce((a, c) => ({ ...a, [c]: (a[c] ?? 0) + 1 }), {});
  const worstId = Object.keys(colors).reduce((a, k) => (rank(colors[k]) > rank(colors[a]) ? k : a), 'heartRate');
  const worstRisk = engine.getRisk(worstId === 'mood' ? 'behavioral' : worstId === 'vision' ? 'sans' : ROWS.find((r) => r.id === worstId).risk);
  const worstLabel = worstId === 'mood' ? 'Mood' : worstId === 'vision' ? 'Vision' : ROWS.find((r) => r.id === worstId).label;
  const allGreen = rank(colors[worstId]) === 1;

  const set = (id, val) => setV({ ...v, [id]: val });
  // every number must be filled in and above 0 (an empty box would count as 0 and turn red)
  const bad = ROWS.filter((r) => v[r.id] === '' || !Number.isFinite(Number(v[r.id])) || Number(v[r.id]) <= 0);
  const firstThisMonth = !engine.state.checkinMonths.has(engine.state.month);
  const bump = (r, d) => { sound.play('click'); set(r.id, Math.round((Number(v[r.id]) + d * r.step) * 10) / 10); };

  function save() {
    if (bad.length) return;
    engine.saveCheckin({ ...v, heartRate: Number(v.heartRate), systolic: Number(v.systolic), sleepHours: Number(v.sleepHours), temperature: Number(v.temperature), bloodSugar: Number(v.bloodSugar), mood, visionChanged: vision });
    sound.play(allGreen ? 'success' : 'alert');
    goTo('trends', { replace: true });
  }

  return (
    <Stage background={stage.background} className="mc ci">
      <header className="mc-top glass cy-top">
        <p className="mc-brand">HUMAN ROVER</p>
        <p className="cy-center">MONTH {engine.state.month} OF 36 · {stage.name.toUpperCase()}</p>
        <NavButtons goBack={goBack} goHome={goHome} />
      </header>
      <p className="cy-kicker">MONTHLY CHECK-IN</p>
      <h1 className="cy-title">How are you this month?</h1>
      <p className="ln2-sub ci-sub">We compare today with your Earth baseline{base.demo ? ' (example values for the demo)' : ''}. Small changes are normal up here; we&apos;re looking for the big ones.</p>

      <section className="ci-table glass">
        <div className="ci-row ci-head"><span>MEASURE</span><span>TODAY</span><span>EARTH</span><span>STATUS</span></div>
        {ROWS.map((r) => (
          <div key={r.id} className="ci-row">
            <div><strong>{r.label}</strong><em className={r.src === 'SENSOR' ? 'sensor' : ''}>{r.src}</em><small>how? {r.how}</small><Why risk={engine.getRisk(r.risk)} /></div>
            <div className="ci-input">
              <button type="button" onClick={() => bump(r, -1)} aria-label={`less ${r.label}`}>−</button>
              <input type="number" step={r.step} value={v[r.id]} onChange={(e) => set(r.id, e.target.value)} aria-label={r.label} />
              <span>{r.unit}</span>
              <button type="button" onClick={() => bump(r, 1)} aria-label={`more ${r.label}`}>+</button>
            </div>
            <span className="ci-base">{base[r.id]} {r.unit}</span>
            <span className={`ci-stat ${colors[r.id]}`}><i className={`dot-i ${colors[r.id]}`} />{colors[r.id]}</span>
          </div>
        ))}
        <div className="ci-row">
          <div><strong>Mood</strong><em>SELF-REPORT</em><small>how? pick honestly, nobody grades this</small><Why risk={engine.getRisk('behavioral')} /></div>
          <div className="cy-chips">{MOODS.map((m, i) => <button key={m} type="button" className={`cy-pill${mood === i ? ' on' : ''}`} onClick={() => { sound.play('select'); setMood(i); }}>{m}</button>)}</div>
          <span className="ci-base">good</span>
          <span className={`ci-stat ${colors.mood}`}><i className={`dot-i ${colors.mood}`} />{colors.mood}</span>
        </div>
        <div className="ci-row">
          <div><strong>Vision</strong><em>SELF-REPORT</em><small>how? notice blurry or changed vision</small><Why risk={engine.getRisk('sans')} /></div>
          <div className="cy-chips">{['no changes', 'something changed'].map((m, i) => <button key={m} type="button" className={`cy-pill${vision === Boolean(i) ? ' on' : ''}`} onClick={() => { sound.play('select'); setVision(Boolean(i)); }}>{m}</button>)}</div>
          <span className="ci-base">no changes</span>
          <span className={`ci-stat ${colors.vision}`}><i className={`dot-i ${colors.vision}`} />{colors.vision}</span>
        </div>
        <p className="ci-legend"><span className="mc-mini">DEMO LIMITS</span> temperature {DEMO_RULES.temperature.text} · sleep {DEMO_RULES.sleepHours.text} · others {DEMO_RULES.default.text}. Not medical limits.</p>
      </section>

      <section className="ci-side glass">
        <div className="ci-laika">
          <img src="/media/bg/laika-circle.jpg" alt="Laika" />
          <div><p className="mc-bubble-name">Laika noticed</p><p className="mc-mini">{counts.yellow ?? 0} yellow · {counts.red ?? 0} red · {counts.green ?? 0} green</p></div>
        </div>
        {allGreen ? (
          <><h2>Everything is close to your Earth baseline.</h2><p>Keep your routine. Laika will ask again next month.</p></>
        ) : (
          <>
            <h2>{worstLabel} is {colors[worstId]} today.</h2>
            <p>{worstRisk?.explain}</p>
            <a href={worstRisk?.source} target="_blank" rel="noreferrer">NASA HRP · {worstRisk?.name} ›</a>
            {colors[worstId] === 'red' && <p className="ci-red">Red: tell the crew medical officer today.</p>}
          </>
        )}
        <div className="ci-goes">
          <p className="cy-step">WHERE YOUR CHECK-IN GOES</p>
          <p><b>Alerts</b> · most urgent first</p>
          <p><b>Diary</b> · month {engine.state.month}</p>
          <p><b>Trends</b> · a new point on your charts</p>
        </div>
      </section>

      <div className="cy-actions">
        <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); engine.focusLearn({ hazard: allGreen ? null : hazardOf(worstRisk), area: null }); goTo('learn'); }}>{allGreen ? 'Learn about this month' : `Why? Learn about ${HAZARD_LABEL[hazardOf(worstRisk)] ?? 'it'}`}</button>
        <button type="button" className="cy-btn" disabled={bad.length > 0} title={bad.length ? `Fill in: ${bad.map((r) => r.label).join(', ')}` : ''} onClick={save}>
          {bad.length ? `Fill in ${bad[0].label.toLowerCase()}` : firstThisMonth ? 'Save check-in · +15 XP →' : 'Update this month\'s check-in →'}
        </button>
      </div>
      <p className="mc-disclaimer">Self-check practice, not a medical diagnosis.</p>
    </Stage>
  );
}
