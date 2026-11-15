// Your trends (Figma: 09). Every saved check-in adds a point. Dashed line = your Earth baseline.
// "What matters most right now" = the top NASA risks of this month from a MaxHeap.
import { useState } from 'react';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import { sound } from '../../audio/sound.js';

export const CHARTS = [
  { id: 'sleepHours', label: 'Sleep', unit: 'h per night', min: 4, max: 9, color: '#3fd0ff' },
  { id: 'heartRate', label: 'Resting heart rate', unit: 'bpm', min: 50, max: 90, color: '#ff8a3d' },
  { id: 'mood', label: 'Mood', unit: '0 great · 4 very low', min: 0, max: 4, color: '#f2c79a' },
];
const DOT = { green: '#2bb673', yellow: '#f2b705', red: '#e5383b' };
const DEF_W = 780; const DEF_H = 150;

export function Chart({ c, points, base, w: W = DEF_W, h: H = DEF_H }) {
  const X = (m) => 30 + ((m - 1) / 35) * (W - 60);
  const Y = (v) => H - 22 - ((Math.min(c.max, Math.max(c.min, v)) - c.min) / (c.max - c.min)) * (H - 40);
  const pts = points.filter((p) => p.values[c.id] != null);
  const statusKey = c.id === 'sleepHours' ? 'sleep' : c.id;
  return (
    <section className="tr-chart glass">
      <p><strong>{c.label}</strong> <small>{c.unit}</small></p>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${c.label} over the mission`}>
        <rect x={X(9)} y="6" width={X(27) - X(9)} height={H - 28} fill="rgba(217,102,59,.12)" />
        {base != null && <><line x1="30" x2={W - 30} y1={Y(base)} y2={Y(base)} stroke="#eef3ff" strokeOpacity=".5" strokeDasharray="5 5" /><text x={W - 30} y={Y(base) - 5} textAnchor="end" className="tr-t">Earth {base}</text></>}
        {pts.length > 1 && <polyline fill="none" stroke={c.color} strokeWidth="2.5" points={pts.map((p) => `${X(p.month)},${Y(p.values[c.id])}`).join(' ')} />}
        {pts.map((p) => <circle key={p.month} cx={X(p.month)} cy={Y(p.values[c.id])} fill={p.demo ? '#050814' : (DOT[p.status?.[statusKey]] ?? c.color)} stroke={p.demo ? (DOT[p.status?.[statusKey]] ?? c.color) : '#050814'} strokeWidth={p.demo ? 2 : 2} r={p.demo ? 4 : 6}><title>Month {p.month}: {p.values[c.id]}{p.demo ? ' (demo)' : ''}</title></circle>)}
        {[1, 9, 28, 36].map((m) => <text key={m} x={X(m)} y={H - 4} className="tr-t" textAnchor="middle">M{m}</text>)}
      </svg>
    </section>
  );
}

export default function Trends({ engine, goTo, goBack, goHome }) {
  const stage = engine.getStage();
  const base = engine.getBaseline();
  const [example, setExample] = useState(false);
  const mine = engine.getCheckins(); // only the check-ins YOU saved
  // "Example mission": made-up months (hollow dots) only while the switch is on; never saved
  const points = example ? [...mine, ...engine.getExampleHistory()].sort((a, b) => a.month - b.month) : mine;
  const top = engine.getTopRisks(engine.state.month, 5);
  const real = mine.length;
  return (
    <Stage background={stage.background} className="mc tr">
      <header className="mc-top glass cy-top">
        <p className="mc-brand">HUMAN ROVER</p>
        <p className="cy-center">MONTH {engine.state.month} OF 36 · {stage.name.toUpperCase()}</p>
        <NavButtons goBack={goBack} goHome={goHome} />
      </header>
      <p className="cy-kicker">YOUR TRENDS {example && <span className="tr-demo">EXAMPLE MISSION ON · HOLLOW DOTS ARE MADE UP</span>}</p>
      <h1 className="cy-title">{real} {real === 1 ? 'check-in' : 'check-ins'} so far</h1>
      <div className="tr-charts">
        {CHARTS.map((c) => <Chart key={c.id} c={c} points={points} base={c.id === 'mood' ? 1 : base?.[c.id]} w={1000} h={150} />)}
      </div>

      <div className="tr-col">
        <section className="tr-line glass">
          <p className="cy-step">HOW TO READ YOUR CHARTS</p>
          {real === 0 && <p>No check-ins yet. Save your first one and a dot appears on each chart.</p>}
          {real === 1 && <p>You saved <b>1 check-in</b>, so each chart has <b>one dot</b> (month {mine[0].month}). Your line starts with your <b>second</b> check-in: move to another month and save one there.</p>}
          {real > 1 && <p>Each dot is one of your check-ins. Dots close to the dashed line mean you are close to your Earth baseline.</p>}
          <ul className="tr-keys">
            <li><i className="k-dash" />dashed line = your Earth baseline</li>
            <li><i className="k-dot" />filled dot = your check-in (green, yellow or red)</li>
            <li><i className="k-mars" />shaded = months on Mars (9–27)</li>
            {example && <li><i className="k-hollow" />hollow dot = made-up example month</li>}
          </ul>
          <button type="button" className={`tr-toggle${example ? ' on' : ''}`} aria-pressed={example} onClick={() => { sound.play('click'); setExample(!example); }}>
            <span className="menu-switch" aria-hidden="true"><i /></span>
            {example ? 'Hide the example mission' : 'Show an example mission (for the demo)'}
          </button>
        </section>

        <section className="tr-side glass">
          <p className="cy-step">{stage.name.toUpperCase()} · WHAT MATTERS MOST RIGHT NOW</p>
          <p className="mc-muted">Each NASA risk matters more in some stages than others, so Laika ranks what to watch first.</p>
          {top.map((r) => (
            <a key={r.id} className="tr-risk" href={r.source} target="_blank" rel="noreferrer">
              <span>{r.name}</span>
              <span className="tr-bars">{[1, 2, 3].map((i) => <i key={i} className={i <= r.score ? 'on' : ''} />)}</span>
              <small>{['', 'low', 'medium', 'high'][r.score]}</small>
            </a>
          ))}
          <p className="mc-mini">Design model based on NASA HRP risk pages, not measured probabilities.</p>
        </section>
      </div>
      <div className="cy-actions">
        <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); goTo('diary'); }}>Open diary</button>
        <button type="button" className="cy-btn" onClick={() => { sound.play('click'); goTo('control'); }}>Back to Mission Control</button>
      </div>
      <p className="mc-disclaimer">Self-check practice, not a medical diagnosis.</p>
    </Stage>
  );
}
