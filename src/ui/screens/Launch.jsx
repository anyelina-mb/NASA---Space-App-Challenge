// Launch (Figma: 05). Press Launch → countdown 10…0. The launch video starts at T-5 so the
// liftoff lands on T-0, then you arrive at Mission Control in month 1.
import { useEffect, useRef, useState } from 'react';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import { sound } from '../../audio/sound.js';

const VIDEO_SECONDS = 5; // launch.mp4 length
const FACTS = [
  ['Your balance', 'Without gravity, the inner ear gets mixed signals. Dizziness in the first days is common.', 'NASA HRP · sensorimotor function', 'https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/'],
  ['Fluids move up', 'Body fluids shift toward the head, which is linked to changes in the eyes on long missions.', 'NASA HRP · SANS', 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/'],
  ['Bones and muscles', "When your legs don't carry weight, bones and muscles weaken. Daily exercise helps.", 'NASA HRP · bone changes', 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'],
];

export default function Launch({ engine, refresh, goTo, goBack }) {
  const [count, setCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [read, setRead] = useState([]);
  const video = useRef(null);
  const timer = useRef(null);

  const finish = () => {
    clearInterval(timer.current);
    engine.setMonth(1);
    refresh();
    goTo('control');
  };

  useEffect(() => () => clearInterval(timer.current), []);

  function start() {
    if (running) return;
    sound.unlock();
    setRunning(true);
    let t = 10;
    timer.current = setInterval(() => {
      t -= 1;
      setCount(t);
      if (t === VIDEO_SECONDS && video.current) { video.current.currentTime = 0; video.current.play().catch(() => {}); }
      if (t === 3) sound.play('launch');
      if (t <= 0) clearInterval(timer.current);
    }, 1000);
  }

  const toggleRead = (i) => { sound.play('select'); setRead(read.includes(i) ? read.filter((x) => x !== i) : [...read, i]); };

  return (
    <Stage background="/media/bg/bg-orbit.jpg" className="mc launch">
      <div className="home-shade" aria-hidden="true" />
      <header className="mc-top glass cy-top">
        <p className="mc-brand">HUMAN ROVER</p>
        <ol className="ln-steps"><li>✓ 1 · Your explorer</li><li className="on">2 · Launch</li></ol>
        <NavButtons home={false} />
      </header>
      <p className="cy-kicker">STEP 2 OF 2 · EARTH → MARS</p>
      <h1 className="cy-title">{count > 0 ? 'Ready for liftoff?' : 'Liftoff!'}</h1>
      <p className="ln-count" aria-live="assertive">T – 00:{String(count).padStart(2, '0')}</p>
      <div className="ln-bar"><span style={{ width: `${((10 - count) / 10) * 100}%` }} /></div>
      <p className="ln-plan">Journey there: months 1–8 · then about 19 months living on Mars (our model)</p>

      <div className="ln-video glass">
        <video ref={video} src="/media/video/launch.mp4" muted playsInline preload="auto" onEnded={finish} />
        {!running && <button type="button" className="ln-play" onClick={start} aria-label="Start the countdown">▶</button>}
        <p className="mc-mini ln-vlabel">{running ? (count > VIDEO_SECONDS ? 'VIDEO STARTS AT T-5' : 'LIFTOFF') : 'VIDEO · STARTS WITH THE COUNTDOWN'}</p>
      </div>

      <section className="ln-facts glass">
        <h2>Before you go: 3 things space changes first</h2>
        <p className="mc-muted">Tap each one when you&apos;ve read it. Laika will remind you about them on the way.</p>
        {FACTS.map(([t, d, l, u], i) => (
          <div key={t} className={`ln-fact${read.includes(i) ? ' on' : ''}`}>
            <button type="button" className="ln-check" onClick={() => toggleRead(i)} aria-pressed={read.includes(i)}>{read.includes(i) && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}</button>
            <div><strong>{t}</strong><p>{d}</p><a href={u} target="_blank" rel="noreferrer">{l} ›</a></div>
          </div>
        ))}
      </section>

      <div className="cy-laika">
        <img src="/media/laika/laika_launch.png" alt="Laika in her launch seat" className="ln-laika" />
        <div className="mc-bubble glass">
          <p className="mc-bubble-name">Laika</p>
          <p>{running ? 'Here we go! Hold on tight.' : "Seat belt on! Once we're in space, I'll give you your first task."}</p>
          <p className="mc-next">Next → {running ? 'Watch the countdown' : 'Tap Launch to start the countdown'}</p>
        </div>
      </div>

      <div className="cy-actions">
        <button type="button" className="cy-btn ghost" disabled={running} onClick={() => { sound.play('click'); goBack(); }}>← Edit astronaut</button>
        <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); finish(); }}>Skip video</button>
        <button type="button" className="cy-btn" onClick={start} disabled={running}>{running ? `T – ${count}` : 'Launch → Mission Control'}</button>
      </div>
      <p className="mc-disclaimer">Educational experience · Facts paraphrased from NASA Human Research Program pages</p>
    </Stage>
  );
}
