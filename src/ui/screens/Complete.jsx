// Mission complete (Figma: 06g). Month 36: your three years in one page.
// Left: your numbers and one chart you can switch. Right: patches, mission log and what to do next.
import { useState } from 'react';
import Stage from '../Stage.jsx';
import { sound } from '../../audio/sound.js';
import { restartMission } from '../../engine/index.js';
import { Chart, CHARTS } from './Trends.jsx';

export default function Complete({ engine, goTo, goHome }) {
  const [chart, setChart] = useState(0);
  const stats = engine.getStats();
  const points = engine.getCheckins();
  const profile = engine.getProfile();
  const real = points.filter((p) => !p.demo).length;
  const patches = [
    ['First steps on Mars', engine.state.seenScenes.has('mars'), 'reach month 9'],
    ['Check-in streak 3+', stats.streak >= 3, '3 months in a row'],
    ['Hazard expert', stats.lessons.learned >= 5, 'learn 5 lessons'],
    ['Good reporter', engine.getOutbox().length === 0 && points.length > 0, 'nothing left unsent'],
  ];
  const log = [
    ['Diary entries', engine.getDiary().length],
    ['Exercise sessions', engine.state.exercise.length],
    ['Alerts still open', engine.getAlerts().length],
    ['Stages visited', `${engine.state.seenScenes.size} / 4`],
  ];
  const c = CHARTS[chart];

  return (
    <Stage background="/media/bg/bg-earth.jpg" className="mc done">
      <p className="cy-kicker">MONTH 36 OF 36 · MISSION COMPLETE</p>
      <h1 className="cy-title done-title">Welcome home, Cmdr. {profile?.name ?? ''}</h1>
      <p className="done-sub">Three years, two planets, one body. Here&apos;s what you did to take care of it.</p>

      <div className="done-grid">
        <div className="done-left">
          <div className="done-stats">
            {[[stats.xp, 'XP earned', '#f2b705'], [real, 'check-ins', '#2bb673'], [`${stats.lessons.learned}/${stats.lessons.total}`, 'lessons learned', '#3fd0ff'], [stats.streak, 'check-in streak', '#ff8a3d']].map(([v, l, col]) => (
              <div key={l} className="glass"><strong style={{ color: col }}>{v}</strong><span>{l}</span></div>
            ))}
          </div>

          <section className="done-chart glass">
            <div className="done-tabs" role="tablist" aria-label="Choose a chart">
              {CHARTS.map((x, i) => (
                <button key={x.id} type="button" role="tab" aria-selected={i === chart} className={i === chart ? 'on' : ''} onClick={() => { sound.play('select'); setChart(i); }}>{x.label}</button>
              ))}
              <span className="mc-mini">{real < 2 ? 'one dot per check-in · the line starts with your second one' : 'one dot per check-in · dashed line = your Earth baseline'}</span>
            </div>
            <Chart c={c} points={points} base={c.id === 'mood' ? 1 : engine.getBaseline()?.[c.id]} w={1000} h={290} />
          </section>

          <div className="done-laika">
            <img src="/media/laika/laika_celebrate.png" alt="Laika celebrating" />
            <div className="mc-bubble glass">
              <p className="mc-bubble-name">Laika</p>
              <p>We did it! Your body still needs time to readapt to Earth: balance, bones and muscles come back slowly. Keep checking in during your first weeks home.</p>
            </div>
          </div>
        </div>

        <aside className="done-right">
          <section className="done-patches glass">
            <p className="cy-step">MISSION PATCHES · {patches.filter((p) => p[1]).length} of {patches.length}</p>
            <div>
              {patches.map(([n, got, how]) => (
                <span key={n} className={`done-patch${got ? ' got' : ''}`}><i>{got ? '★' : '☆'}</i><span>{n}<small>{got ? 'earned' : how}</small></span></span>
              ))}
            </div>
          </section>

          <section className="done-log glass">
            <p className="cy-step">YOUR MISSION LOG</p>
            {log.map(([k, v]) => <p key={k}><span>{k}</span><strong>{v}</strong></p>)}
          </section>

          <div className="done-actions">
            <button type="button" className="cy-btn" onClick={() => { sound.play('click'); goTo('diary'); }}>Read my mission diary →</button>
            <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); engine.setEndChoice('stay'); goHome(); }}>Keep exploring</button>
            <button type="button" className="end-link" onClick={() => { sound.play('click'); restartMission(); }}>Start a new mission</button>
          </div>
        </aside>
      </div>
      <p className="mc-disclaimer">Educational experience, not a diagnosis.</p>
    </Stage>
  );
}
