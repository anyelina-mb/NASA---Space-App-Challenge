// Mission Control (Figma: Final Screens › 06a–06d, one look per stage).
// Drag the month slider (or use the month badge) and the whole base changes:
// background, music, Laika's message, today's tasks and the body colors.
//   - Today's tasks come from the engine's Queue (first in, first out).
//   - The alert at the top-left is the top of the alerts MaxHeap (most urgent first).
//   - Moving the month uses the stages list and the mission clock.
import avatars from '../../data/avatars.json';
import { sound } from '../../audio/sound.js';
import SoundToggle from '../../audio/SoundToggle.jsx';
import Stage from '../Stage.jsx';
import { laikaLine } from '../hazards.js';
import { DsTag } from '../dsMode.jsx';
import { restartMission } from '../../engine/index.js';

const SEGMENTS = [
  { from: 1, to: 8, label: 'Trip there', cls: 'trip' },
  { from: 9, to: 27, label: 'On Mars', cls: 'mars' },
  { from: 28, to: 35, label: 'Trip home', cls: 'home' },
  { from: 36, to: 36, label: 'Earth', cls: 'earth' },
];

const SCENE_TITLE = { trip: 'Trip to Mars', mars: 'Life on Mars', home: 'Trip home', earth: 'Back on Earth' };
const LEARN_LABEL = { trip: 'the trip to Mars', mars: 'life on Mars', home: 'the trip home', earth: 'back on Earth' };
const COLOR_WORD = { green: 'Stable', yellow: 'Watch', red: 'Variation' };
const TASK_SCREEN = { checkin: 'checkin', exercise: 'exercise', diary: 'diary', report: 'diary', balance: 'scan' };
const NEXT_STAGE_MONTH = { trip: 14, mars: 31, home: 36, earth: null };
const PREV_STAGE_MONTH = { trip: 1, mars: 4, home: 14, earth: 31 };

export const pct = (m) => ((m - 1) / 35) * 100;

function dayLabel(month, scene) {
  if (scene === 'earth') return 'First week home';
  // On Mars we count sols (Mars days) since landing in month 9
  if (scene === 'mars') return `Sol ${Math.round((month - 9) * 30.4 * 0.973) + 1}`;
  return `Day ${Math.round((month - 1) * 30.4) + 1}`;
}

export default function MissionControl({ engine, refresh, goTo }) {
  const month = engine.state.month;
  const stage = engine.getStage();
  const scene = stage.scene;
  const profile = engine.getProfile();
  const stats = engine.getStats();
  const status = engine.getLastCheckinStatus();
  const alert = engine.topAlert();
  const tasks = engine.getTasks();
  const systems = engine.getBodySystems();
  const avatar = profile && avatars.find((a) => a.bodyType === profile.bodyType && a.skinTone === profile.skinTone && a.suitColor === profile.suitColor);
  const monthsLeft = 36 - month;

  const go = (screen) => { sound.play('click'); goTo(screen); };
  const setMonth = (m) => {
    const res = engine.setMonth(m);
    if (res.stageChanged) sound.play('success');
    refresh();
  };

  return (
    <Stage background={stage.background} className={`mc mc-${scene}`}>

      <header className="mc-top glass">
        <p className="mc-brand">HUMAN ROVER</p>
        <p className="mc-name">{profile ? `Cmdr. ${profile.name}` : 'Cmdr.'}</p>
        <div className="mc-lessons">
          <span>Lessons learned</span>
          <strong>{stats.lessons.learned} / {stats.lessons.total}</strong>
        </div>
        <p className="mc-xp">{stats.xp} XP · check-in streak {stats.streak}</p>
        <button type="button" className="mc-status" onClick={() => go('trends')} title="Open your trends">
          <span className="mc-mini">LAST CHECK-IN</span>
          {status
            ? Object.entries(status).map(([k, c]) => <span key={k} className="mc-dot-label"><i className={`dot-i ${c}`} />{k}</span>)
            : <span className="mc-muted">none yet</span>}
        </button>
        <SoundToggle />
        <button type="button" className="mc-menu-btn" onClick={() => go('menu')}>Menu</button>
      </header>

      <div className="mc-slider glass">
        <label htmlFor="mc-month">
          Month {month} of 36 · {SCENE_TITLE[scene]} · {stage.gravity === 'microgravity' ? 'microgravity' : `gravity ${stage.gravity}`} · {monthsLeft ? `${monthsLeft} months left` : 'mission complete!'}
        </label>
        <div className="mc-track">
          {SEGMENTS.map((s) => (
            <span key={s.cls} className={`mc-seg ${s.cls}`} style={{ left: `${pct(s.from)}%`, width: `calc(${pct(s.to) - pct(s.from)}% + 6px)` }} />
          ))}
          <input
            id="mc-month"
            type="range"
            min="1"
            max="36"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-valuetext={`Month ${month}, ${SCENE_TITLE[scene]}`}
          />
        </div>
        <div className="mc-seg-labels">
          {SEGMENTS.map((s) => <span key={s.cls} style={{ left: `${pct(s.from)}%` }}>{s.label}</span>)}
        </div>
      </div>
      <p className="mc-hand mc-drag-hint">drag me: the whole base changes with the month</p>

      <DsTag style={{ position: 'absolute', left: 24, top: 166, zIndex: 4 }}>MAX-HEAP · most urgent on top</DsTag>
      <DsTag style={{ position: 'absolute', left: 860, top: 152, zIndex: 4 }}>SORTED ARRAY · binary search by month</DsTag>
      {alert ? (
        <div className={`mc-alert glass ${alert.color}`}>
          <i className={`dot-i ${alert.color}`} />
          <span>
            <strong>{alert.title}</strong>
            <small>{alert.color === 'red' ? 'Most urgent · tell the crew medical officer' : 'Watch · check it again soon'} · month {alert.month}</small>
          </span>
          <button type="button" className="mc-handled" onClick={() => { sound.play('success'); engine.resolveTopAlert(); refresh(); }} title="I told the crew / it's handled">Handled ✓</button>
        </div>
      ) : (
        <div className="mc-alert glass green"><i className="dot-i green" /><span><strong>No alerts</strong><small>Everything looks stable</small></span></div>
      )}

      {engine.getLastNote()?.month === month && (
        <div className="mc-note" aria-label="Latest diary entry">
          <p className="mc-note-title">month {engine.getLastNote().month}</p>
          <p>{engine.getLastNote().text}</p>
        </div>
      )}

      <section className="mc-systems glass" aria-label="Body systems">
        <h2>Body systems</h2>
        {systems.map((s) => (
          <div key={s.id} className="mc-sys">
            <i className={`dot-i ${s.color}`} />
            <p>{s.label}<small>{COLOR_WORD[s.color]}</small></p>
            <span className="mc-bar"><span className={s.color} style={{ width: s.color === 'green' ? '80%' : s.color === 'yellow' ? '55%' : '30%' }} /></span>
          </div>
        ))}
      </section>

      {avatar && <img className="mc-avatar" src={avatar.src} alt={`${profile.name}, your astronaut`} />}

      <nav className="mc-deck glass" aria-label="Ship deck">
        <h2>Ship Deck</h2>
        <button type="button" className="mc-deck-item active" onClick={() => go('learn')}><i />Learn · {LEARN_LABEL[scene]}</button>
        <button type="button" className="mc-deck-item" onClick={() => go('scan')}><i />Check yourself</button>
        <button type="button" className="mc-deck-item" onClick={() => go('checkin')}><i />Check-in and trends</button>
        <button type="button" className="mc-deck-item" onClick={() => go('diary')}><i />Diary and reports</button>
      </nav>

      <section className="mc-today glass" aria-label="Today's tasks">
        <h2>Today · {dayLabel(month, scene)} <DsTag>QUEUE · first in, first out</DsTag></h2>
        {tasks.length === 0 && <p className="mc-muted">All done for this month. Nice work!</p>}
        <ol>
          {tasks.map((t, i) => (
            <li key={t.id} className={i === 0 ? 'first' : ''}>
              <span className="mc-num">{i + 1}</span>
              <span className="mc-task"><strong>{t.text}</strong><small>{t.hint}</small></span>
              {i === 0
                ? <button type="button" className="mc-start" onClick={() => go(TASK_SCREEN[t.id] ?? 'scan')}>Start</button>
                : <span className="mc-mini">+5 XP</span>}
            </li>
          ))}
        </ol>
      </section>

      <div className="mc-laika">
        <img className="laika-float" src={`/media/laika/${stage.laikaImg}`} alt="Laika, your guide" />
        <div className="mc-bubble glass">
          <p className="mc-bubble-name">Laika</p>
          <p>{laikaLine(stage, month)}</p>
          <p className="mc-next">Next → {tasks[0] ? `${stage.next}` : 'Drag the month to continue the mission'}</p>
          <a href={stage.source} target="_blank" rel="noreferrer">NASA source ›</a>
        </div>
      </div>

      <div className="mc-badge">
        {month > 1 ? <button type="button" className="mc-arrow" aria-label="Previous stage" onClick={() => setMonth(PREV_STAGE_MONTH[scene])}>‹</button> : <span className="mc-arrow-space" />}
        <button
          type="button"
          className={`mc-circle ${scene}`}
          onClick={() => (scene === 'earth' ? go('complete') : setMonth(NEXT_STAGE_MONTH[scene]))}
          title={scene === 'earth' ? 'See your mission summary' : 'Jump to the next stage'}
        >
          <small>MONTH</small>
          <strong>{month}</strong>
          <span>{monthsLeft ? `${monthsLeft} months left` : 'tap: your summary'}</span>
          <small>{SCENE_TITLE[scene].toUpperCase()}</small>
        </button>
        {NEXT_STAGE_MONTH[scene] ? <button type="button" className="mc-arrow" aria-label="Next stage" onClick={() => setMonth(NEXT_STAGE_MONTH[scene])}>›</button> : <span className="mc-arrow-space" />}
      </div>

      {engine.isMissionDone() && !engine.getEndChoice() && (
        <div className="end-wrap" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className="end-card glass">
            <img src="/media/laika/laika_celebrate.png" alt="Laika celebrating" />
            <p className="cy-step">MONTH 36 OF 36 · ALL TASKS DONE</p>
            <h2 id="end-title">Mission complete, Cmdr. {profile?.name ?? ''}!</h2>
            <p>Three years, two planets and you took care of your body the whole way. What do you want to do now?</p>
            <div className="end-actions">
              <button type="button" className="cy-btn" onClick={() => { sound.play('success'); engine.setEndChoice('results'); goTo('complete'); }}>See my results →</button>
              <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); engine.setEndChoice('stay'); refresh(); }}>Keep exploring</button>
              <button type="button" className="end-link" onClick={() => { sound.play('click'); restartMission(); }}>Start a new mission</button>
            </div>
            <p className="mc-mini">Keep exploring: you can finish any time from Menu › Finish mission.</p>
          </div>
        </div>
      )}

      <p className="mc-disclaimer">Educational experience and self-check practice, not a medical diagnosis. Facts paraphrased from NASA pages.</p>
    </Stage>
  );
}
