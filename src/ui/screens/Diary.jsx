// Diary and reports (Figma: 12).
// Diary = SortedArray by month: binary search jumps straight to the month you pick.
// Reports to Earth = Queue: the oldest report is sent first.
import { useState } from 'react';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import { sound } from '../../audio/sound.js';
import { DsTag } from '../dsMode.jsx';

const DELAY = { trip: 'a few minutes', mars: 'up to ~22 minutes', home: 'a few minutes', earth: 'no delay' };

export default function Diary({ engine, refresh, goBack, goHome, goTo }) {
  const stage = engine.getStage();
  const [month, setMonth] = useState(engine.state.month);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(null);
  const { found, steps } = engine.searchDiary(month);
  const outbox = engine.getOutbox();

  function write() {
    if (!text.trim()) return;
    engine.addDiary(text, month); setText(''); sound.play('success'); refresh();
  }
  function send() {
    const r = engine.sendOldestReport(); setSent(r); sound.play('success'); refresh();
  }

  return (
    <Stage background={stage.background} className="mc dy">
      <header className="mc-top glass cy-top">
        <p className="mc-brand">HUMAN ROVER</p>
        <p className="cy-center">MONTH {engine.state.month} OF 36 · {stage.name.toUpperCase()}</p>
        <NavButtons goBack={goBack} goHome={goHome} />
      </header>
      <p className="cy-kicker">DIARY AND REPORTS</p>
      <h1 className="cy-title">Your mission diary</h1>

      <section className="dy-book">
        <div className="dy-month">
          <label htmlFor="dy-m">Read month {month}</label>
          <input id="dy-m" type="range" min="1" max="36" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
          <span className="mc-mini">found in {steps} {steps === 1 ? 'step' : 'steps'}</span><DsTag>SORTED ARRAY · binary search</DsTag>
        </div>
        <div className="dy-entries">
          {found.length === 0 && <p className="dy-empty">Nothing written in month {month}.</p>}
          {found.map((e, i) => <p key={i} className="dy-entry"><b>month {e.month}</b> {e.text}</p>)}
        </div>
        <div className="dy-write">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="One line about today is enough…" maxLength={200} aria-label="Write today's diary entry" />
          <button type="button" className="dy-btn" disabled={!text.trim()} onClick={write}>Write in month {month}{month === engine.state.month ? ' (today)' : ''} →</button>
        </div>
      </section>

      <div className="dy-side">
      <section className="dy-out glass">
        <p className="cy-step">REPORTS TO FLIGHT SURGEONS ON EARTH <DsTag>QUEUE</DsTag></p>
        <p className="mc-muted">Message delay right now: {DELAY[stage.scene]}. The oldest report goes first.</p>
        {outbox.length === 0 && <p className="dy-none">Nothing waiting to send.</p>}
        <ol>
          {outbox.map((r, i) => <li key={i} className={r.color === 'red' ? 'red' : ''}><span>{i + 1}</span>{r.title}<small>month {r.month}</small></li>)}
        </ol>
        <button type="button" className="cy-btn" disabled={!outbox.length} onClick={send}>Send the oldest report →</button>
        {sent && <p className="dy-sent">✓ Sent: {sent.title}</p>}
      </section>
      <section className="dy-pages glass">
        <p className="cy-step">PAGES WITH NOTES · tap to jump</p>
        <div>
          {[...new Set(engine.getDiary().map((e) => e.month))].map((m) => (
            <button key={m} type="button" className={m === month ? 'on' : ''} onClick={() => { sound.play('select'); setMonth(m); }}>month {m}</button>
          ))}
        </div>
      </section>
      </div>
      <div className="cy-actions">
        <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); goTo('trends'); }}>See my trends</button>
        <button type="button" className="cy-btn" onClick={() => { sound.play('click'); goHome(); }}>Back to Mission Control</button>
      </div>
      <p className="mc-disclaimer">Self-check practice, not a medical diagnosis.</p>
    </Stage>
  );
}
