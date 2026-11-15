// Log exercise (Figma: 06e). Saving finishes the Today task and turns bones and muscles green.
import { useState } from 'react';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import { sound } from '../../audio/sound.js';

// The three machines crews use on the ISS (NASA NTRS: evolution of ISS exercise hardware)
const TYPES = ['Treadmill', 'Exercise bike', 'Resistance', 'Other'];
const HOW = {
  Treadmill: 'In weightlessness you would float away, so a harness and bungee cords pull you down onto the treadmill.',
  'Exercise bike': 'The space station bike (CEVIS) has no seat: you strap your feet to the pedals and a belt holds you in place.',
  Resistance: 'Weights weigh nothing in space, so the resistance machine (ARED) uses vacuum cylinders to push back like heavy weights.',
  Other: 'Anything that makes your muscles and bones work counts. NASA\'s Zero T2 study tests exercise without a treadmill.',
};

export default function Exercise({ engine, refresh, goBack, goHome }) {
  const stage = engine.getStage();
  const [type, setType] = useState('Treadmill');
  const [min, setMin] = useState(45);
  const [feel, setFeel] = useState('okay');
  const done = engine.exerciseThisMonth().length;
  function save() { engine.logExercise({ type, minutes: min, feel }); sound.play('success'); refresh(); goBack(); }
  return (
    <Stage background={stage.background} className="mc ex">
      <header className="mc-top glass cy-top"><p className="mc-brand">HUMAN ROVER</p><p className="cy-center">TODAY&apos;S TASK · EXERCISE</p><NavButtons goBack={goBack} goHome={goHome} /></header>
      <section className="ex-panel glass">
        <p className="cy-step">TODAY&apos;S TASK · EXERCISE</p>
        <h1>Log your exercise</h1>
        <p className="ex-q">What did you do?</p>
        <div className="cy-chips">{TYPES.map((t) => <button key={t} type="button" className={`cy-pill${type === t ? ' on' : ''}`} onClick={() => { sound.play('select'); setType(t); }}>{t}</button>)}</div>
        <p className="ex-how"><b>Safe in space?</b> Yes, with the right gear. {HOW[type]} <a href="https://ntrs.nasa.gov/api/citations/20170011470/downloads/20170011470.pdf" target="_blank" rel="noreferrer">NASA NTRS · ISS exercise hardware ›</a></p>
        <p className="ex-q">How long?</p>
        <div className="ci-input ex-min">
          <button type="button" onClick={() => setMin(Math.max(5, min - 5))}>−</button><strong>{min} min</strong><button type="button" onClick={() => setMin(Math.min(180, min + 5))}>+</button>
        </div>
        <p className="ex-q">How did it feel?</p>
        <div className="cy-chips">{['easy', 'okay', 'hard'].map((f) => <button key={f} type="button" className={`cy-pill${feel === f ? ' on' : ''}`} onClick={() => setFeel(f)}>{f}</button>)}</div>
        <div className="ex-why">
          <p className="cy-step">WHY IT MATTERS</p>
          <p>When your legs carry less weight, bones and muscles weaken. That&apos;s why NASA crews exercise every day.</p>
          <a href="https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/" target="_blank" rel="noreferrer">NASA HRP · Bone changes ›</a>
          <p className="mc-hand">sessions this month: {done} · 2 or more turns bones and muscles green</p>
        </div>
        <div className="ex-actions">
          <button type="button" className="cy-btn ghost" onClick={goBack}>Cancel</button>
          <button type="button" className="cy-btn" onClick={save}>Save · +5 XP</button>
        </div>
      </section>
    </Stage>
  );
}
