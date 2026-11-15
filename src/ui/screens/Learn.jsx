// Learn (Figma: 11). Drag the month and pick a NASA hazard: the body lights up where space
// changes things that month. Tap a glowing part to read what happens there, answer the quick
// check to learn it (+XP).
//   - getLessons: binary search (SortedArray.upTo) finds the lessons of the month
//   - getTopTopics: a MaxHeap picks the most important ones
import { useState } from 'react';
import BodyViewer from '../../three/BodyViewer.jsx';
import Stage from '../Stage.jsx';
import { laikaLine } from '../hazards.js';
import NavButtons from '../NavButtons.jsx';
import lessonsData from '../../data/lessons.json';
import bodyParts from '../../data/body-parts.json';
import { sound } from '../../audio/sound.js';
import { pct } from './MissionControl.jsx';
import { DsTag } from '../dsMode.jsx';

const HAZARDS = [
  { id: 'radiation', label: 'Radiation', color: '#f2b705' },
  { id: 'isolation', label: 'Isolation', color: '#9e80fa' },
  { id: 'distance', label: 'Distance', color: '#3fd0ff' },
  { id: 'gravity', label: 'Gravity', color: '#d9663b' },
  { id: 'environment', label: 'Closed habitat', color: '#2bb673' },
];
const HAZARD = Object.fromEntries(HAZARDS.map((h) => [h.id, h]));
const HAZARD_WHY = {
  radiation: 'Space radiation is invisible. Beyond Earth\'s magnetic field the crew gets more of it, so NASA works on shielding and measuring it.',
  isolation: 'Months with the same few people in a small space can affect mood, sleep and teamwork. NASA trains and supports crews for it.',
  distance: 'The farther from Earth, the slower messages and supplies. NASA says planning and self-sufficiency will be key.',
  gravity: 'Muscles, bones, inner ear and organs all have to adjust every time gravity changes: floating, Mars, and home again.',
  environment: 'The ship or habitat is home and machine at once: air, temperature, microbes and immune responses are all watched.',
};
const BASIS = { iss: 'Learned on long space station missions', expected: 'What NASA expects for Mars', fact: 'Measured fact' };
const SCENE_TITLE = { trip: 'the trip to Mars', mars: 'life on Mars', home: 'the trip home', earth: 'back on Earth' };
const SEGMENTS = [
  { from: 1, to: 8, label: 'Trip there', cls: 'trip' },
  { from: 9, to: 27, label: 'On Mars', cls: 'mars' },
  { from: 28, to: 35, label: 'Trip home', cls: 'home' },
  { from: 36, to: 36, label: 'Earth', cls: 'earth' },
];

// Same order every time for the same lesson, but the right answer moves around
function shuffled(lesson) {
  const opts = lesson.quiz.options.map((text, i) => ({ text, right: i === lesson.quiz.answer }));
  let seed = [...lesson.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = opts.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = seed % (i + 1); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}

function LessonCard({ lesson, done, onLearned }) {
  const [picked, setPicked] = useState(null);
  const options = lesson.quiz ? shuffled(lesson) : [];
  const correct = picked !== null && options[picked]?.right;
  const h = HAZARD[lesson.hazard];
  return (
    <article className="ln2-lesson glass" style={{ borderColor: `${h.color}88` }}>
      <p className="ln2-kicker" style={{ color: h.color }}>{h.label.toUpperCase()} · {BASIS[lesson.basis].toUpperCase()}</p>
      <h3>{lesson.title}</h3>
      <p>{lesson.text}</p>
      <a href={lesson.source} target="_blank" rel="noreferrer">{lesson.sourceName} ›</a>
      {lesson.quiz && (
        <div className="ln2-quiz">
          <p>Quick check: {lesson.quiz.q}</p>
          <div className="cy-chips">
            {options.map((o, i) => (
              <button
                key={o.text}
                type="button"
                className={`cy-pill${picked === i ? (correct ? ' right' : ' wrong') : ''}`}
                onClick={() => { setPicked(i); if (o.right) { sound.play('success'); onLearned(lesson.id); } else sound.play('click'); }}
              >{o.text}</button>
            ))}
          </div>
          {picked !== null && <p className={correct ? 'ln2-ok' : 'ln2-no'}>{correct ? `✓ Correct! Lesson learned${done ? '' : ' · +10 XP'}` : 'Not quite, try again.'}</p>}
          {picked === null && done && <p className="ln2-ok">✓ Learned</p>}
        </div>
      )}
    </article>
  );
}

export default function Learn({ engine, refresh, goTo, goBack, goHome }) {
  const [month, setMonth] = useState(engine.state.month);
  // Coming from a self-check or check-in result: open with that hazard (and body part) already picked
  const [entry] = useState(() => engine.takeLearnFocus());
  const [mesh, setMesh] = useState(() => (entry?.area ? bodyParts.find((p) => p.area === entry.area)?.mesh ?? null : null));
  const [hazard, setHazard] = useState(entry?.hazard ?? null);
  const [facing, setFacing] = useState('front');

  const stage = engine.getStage(month);
  const area = mesh ? engine.getBodyAreas([mesh])[0] : null;
  const all = engine.getLessons({ month }).lessons;
  const byHazard = hazard ? all.filter((l) => l.hazard === hazard) : all;
  const top = hazard ? byHazard.slice(0, 3) : engine.getTopTopics(month, 3);
  const shown = area ? byHazard.filter((l) => l.areas.includes(area.area)) : top;
  const progress = engine.getProgress();
  const bodyType = engine.getProfile()?.bodyType ?? 'female';
  const activeHazards = [...new Set(all.map((l) => l.hazard))];
  const focus = hazard ?? shown[0]?.hazard ?? activeHazards[0];

  // Body glow: every part with a lesson this month, in the color of its hazard
  const colors = {};
  for (const l of byHazard) {
    const c = HAZARD[l.hazard].color;
    for (const p of bodyParts) if (l.areas.includes(p.area) && !colors[p.mesh]) colors[p.mesh] = c;
  }

  const laika = area
    ? (shown.length ? `Here's what happens to your ${area.label.toLowerCase()} in month ${month}.` : `Nothing new for your ${area.label.toLowerCase()} in month ${month}. Try a glowing part!`)
    : `Month ${month}: ${laikaLine(stage, month)}`;
  const next = area ? (shown.length ? 'Answer the quick check to learn it' : 'Tap a glowing part, or drag the month')
    : 'Tap a glowing part of the body';

  // The Learn month IS the mission month, so Check yourself and Mission Control follow it
  const changeMonth = (m) => { setMonth(m); setMesh(null); engine.setMonth(m); refresh(); };

  return (
    <Stage background={stage.background} className="mc ln2">
      <header className="mc-top glass">
        <p className="mc-brand">HUMAN ROVER</p>
        <div className="ln2-progress">
          <span>Lessons learned {progress.learned} / {progress.total}</span>
          <i><b style={{ width: `${(progress.learned / Math.max(1, progress.total)) * 100}%` }} /></i>
        </div>
        <NavButtons goBack={goBack} goHome={goHome} />
      </header>

      <h1 className="ln2-title">Learn: {SCENE_TITLE[stage.scene]}</h1>
      <p className="ln2-sub">Drag the month and pick a hazard. The body glows where space changes things. Tap a glowing part.</p>

      <div className="ln2-hazards">
        <span className="mc-mini">NASA HAZARD</span>
        <button type="button" className={`ln2-hz all${hazard === null ? ' on' : ''}`} style={{ '--hz': '#eef3ff' }} onClick={() => { sound.play('select'); setHazard(null); setMesh(null); }}>All</button>
        {HAZARDS.map((h) => {
          const on = hazard === h.id; const active = activeHazards.includes(h.id);
          return (
            <button key={h.id} type="button" className={`ln2-hz${on ? ' on' : ''}${active ? '' : ' off'}`} style={{ '--hz': h.color }}
              onClick={() => { sound.play('select'); setHazard(on ? null : h.id); setMesh(null); }} title={active ? '' : 'No lesson about this hazard this month'}>
              <i />{h.label}{on && <b aria-hidden="true"> ✕</b>}
            </button>
          );
        })}
      </div>

      <div className="mc-slider glass ln2-slider">
        <label htmlFor="ln-month">Month {month} of 36 · {stage.name} · {stage.gravity === 'microgravity' ? 'microgravity' : `gravity ${stage.gravity}`} · {all.length} {all.length === 1 ? 'lesson' : 'lessons'} this month</label>
        <div className="mc-track">
          {SEGMENTS.map((s) => <span key={s.cls} className={`mc-seg ${s.cls}`} style={{ left: `${pct(s.from)}%`, width: `calc(${pct(s.to) - pct(s.from)}% + 6px)` }} />)}
          <input id="ln-month" type="range" min="1" max="36" value={month} onChange={(e) => changeMonth(Number(e.target.value))} />
        </div>
        <div className="mc-seg-labels">{SEGMENTS.map((s) => <span key={s.cls} style={{ left: `${pct(s.from)}%` }}>{s.label}</span>)}</div>
      </div>
      <p className="mc-hand ln2-drag">drag me! every month has its own story</p>

      <section className="ln2-body glass">
        <div className="cy-chip">{area ? area.label : 'Tap a glowing part'}{area && <span>SELECTED</span>}</div>
        <div className="cy-view">
          <button type="button" className={facing === 'front' ? 'on' : ''} onClick={() => setFacing('front')}>Front</button>
          <button type="button" className={facing === 'back' ? 'on' : ''} onClick={() => setFacing('back')}>Back</button>
        </div>
        <div className="ln2-canvas">
          <BodyViewer
            key={bodyType}
            selected={mesh ? [mesh] : []}
            colors={colors}
            onToggle={(m) => { sound.play('select'); setMesh(m === mesh ? null : m); }}
            modelUrl={bodyType === 'male' ? '/models/body.glb' : '/models/body_female.glb'}
            facing={facing}
          />
        </div>
        {!mesh && <p className="mc-hand ln2-tap">glowing = something changes there this month. tap it!</p>}
        {focus && (
          <article className="cy-hazard ln2-hzcard" style={{ borderColor: HAZARD[focus].color }}>
            <p className="cy-hz-kicker" style={{ color: HAZARD[focus].color }}>RIGHT NOW · MONTH {month} · NASA HAZARD: {HAZARD[focus].label.toUpperCase()}</p>
            <p>{HAZARD_WHY[focus]}</p>
            <div className="cy-links"><span>READ MORE</span><a href="https://www.nasa.gov/hrp/hazards/" target="_blank" rel="noreferrer">NASA · 5 Hazards ›</a><a href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noreferrer">NASA · Risks ›</a></div>
          </article>
        )}
      </section>

      <div className="ln2-right">
        <div className="ln2-laika">
          <img className="laika-float" src={`/media/laika/${shown[0]?.laika ?? stage.laikaImg}`} alt="Laika" />
          <div className="mc-bubble glass">
            <p className="mc-bubble-name">Laika</p>
            <p>{laika}</p>
            <p className="mc-next">Next → {next}</p>
          </div>
        </div>
        <DsTag>BINARY SEARCH finds the month · MAX-HEAP picks the top 3</DsTag>
        <div className="ln2-list">
          {shown.length === 0 && (
            <div className="ln2-empty glass">
              <p className="ln2-empty-t">No lesson {hazard ? `about ${HAZARD[hazard].label.toLowerCase()}` : ''}{area ? ` for the ${area.label.toLowerCase()}` : ''} in month {month}.</p>
              {(() => {
                const next = hazard ? (engine.monthsWithHazard?.(hazard) ?? []).find((m) => m > month) ?? (engine.monthsWithHazard?.(hazard) ?? [])[0] : null;
                return (
                  <div className="cy-chips">
                    {area && <button type="button" className="cy-pill" onClick={() => setMesh(null)}>Show the whole body</button>}
                    {hazard && <button type="button" className="cy-pill" onClick={() => setHazard(null)}>Show all hazards</button>}
                    {next && <button type="button" className="cy-pill on" onClick={() => changeMonth(next)}>Go to month {next} →</button>}
                  </div>
                );
              })()}
            </div>
          )}
          {shown.map((l) => (
            <LessonCard key={`${l.id}-${month}`} lesson={l} done={progress.ids.includes(l.id)} onLearned={(id) => { engine.markLearned(id); refresh(); }} />
          ))}
        </div>
        <button type="button" className="cy-btn ln2-cta" onClick={() => { sound.play('click'); goTo('scan'); }}>Practice the self-check →</button>
      </div>
      <p className="mc-disclaimer">Educational experience, not a medical diagnosis · Facts paraphrased from NASA pages · No human has lived on Mars yet</p>
    </Stage>
  );
}
