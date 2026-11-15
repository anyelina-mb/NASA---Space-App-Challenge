// Menu (Figma: 06f). Opens over Mission Control (it stays visible behind, a bit darker).
import { useState } from 'react';
import Stage from '../Stage.jsx';
import avatars from '../../data/avatars.json';
import { sound } from '../../audio/sound.js';
import { restartMission } from '../../engine/index.js';
import SoundToggle from '../../audio/SoundToggle.jsx';
import { setDsMode, useDsMode } from '../dsMode.jsx';
import MissionControl from './MissionControl.jsx';

const RESOURCES = [
  ['NASA · 5 Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/'],
  ['NASA · Risks of Human Spaceflight', 'https://www.nasa.gov/hrp/risks/'],
  ['NASA · Ongoing HRP research', 'https://www.nasa.gov/hrp/ongoing-hrp-research/'],
  ['CSA · Monitoring radiation for astronaut health', 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp'],
  ['CSA · Why do we do science in space?', 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp'],
];
const BASE_FIELDS = [['heartRate', 'Resting heart rate', 'bpm'], ['systolic', 'Blood pressure (top)', 'mmHg'], ['sleepHours', 'Sleep', 'h'], ['temperature', 'Temperature', '°C'], ['bloodSugar', 'Blood sugar', 'mg/dL']];

export default function Menu({ engine, refresh, goTo, goBack }) {
  const [panel, setPanel] = useState('main');
  const [sure, setSure] = useState(false); // restart asks twice: it erases the saved mission
  const ds = useDsMode();
  const profile = engine.getProfile();
  const stats = engine.getStats();
  const avatar = profile && avatars.find((a) => a.bodyType === profile.bodyType && a.skinTone === profile.skinTone && a.suitColor === profile.suitColor);
  const [base, setBase] = useState({ ...engine.getBaseline() });
  const go = (s) => { sound.play('click'); goTo(s); };
  const baseBad = BASE_FIELDS.some(([id]) => base[id] === '' || !(Number(base[id]) > 0));

  return (
    <div className="menu-wrap">
      <div className="menu-behind" aria-hidden="true"><MissionControl engine={engine} refresh={() => {}} goTo={() => {}} /></div>
      <button type="button" className="menu-dim" aria-label="Close menu" onClick={goBack} />
      <Stage className="mc menu-stage">
        <aside className="menu-panel glass" aria-label="Menu">
          <div className="menu-head">
            <p className="cy-step">{panel === 'main' ? 'MENU' : panel === 'res' ? 'RESOURCES' : 'MY EARTH BASELINE'}</p>
            <button type="button" className="menu-x" onClick={() => (panel === 'main' ? goBack() : setPanel('main'))} aria-label={panel === 'main' ? 'Close' : 'Back'}>
              {panel === 'main'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>}
            </button>
          </div>

          {panel === 'main' && (
            <>
              <div className="menu-profile">
                {avatar && <span className="menu-face" style={{ backgroundImage: `url(${avatar.src})` }} />}
                <div>
                  <h2>Cmdr. {profile?.name ?? '—'}</h2>
                  <p className="mc-mini">{profile ? `${profile.bodyType} · ${profile.skinTone} skin · ${profile.suitColor} suit` : ''}</p>
                  <p className="menu-stats">{stats.xp} XP · streak {stats.streak} · lessons {stats.lessons.learned}/{stats.lessons.total}</p>
                </div>
              </div>
              <button type="button" className="menu-item" onClick={() => go('creator')}><b>Edit my astronaut</b><small>body, skin and suit</small></button>
              <button type="button" className="menu-item" onClick={() => setPanel('base')}><b>My Earth baseline</b><small>the numbers we compare you with</small></button>
              <button type="button" className="menu-item" onClick={() => setPanel('res')}><b>Resources</b><small>NASA and CSA articles</small></button>
              <div className="menu-item menu-row"><div><b>Sound</b><small>music and effects</small></div><SoundToggle /></div>
              <div className="menu-item menu-row">
                <div><b>Show data structures</b><small>tags for the demo and the pitch</small></div>
                <button type="button" className={`menu-switch${ds ? ' on' : ''}`} aria-pressed={ds} onClick={() => { sound.play('click'); setDsMode(!ds); }}><i /></button>
              </div>
              {engine.state.month === 36 && (
                <button type="button" className="menu-item finish" onClick={() => go('complete')}><b>Finish mission</b><small>see your results and patches</small></button>
              )}
              <button type="button" className="menu-item danger" onClick={() => { sound.play('click'); if (sure) restartMission(); else setSure(true); }}><b>{sure ? 'Tap again to erase this mission' : 'Restart mission'}</b><small>{sure ? 'your progress, diary and check-ins will be deleted' : 'erases this mission and starts again'}</small></button>
              <p className="mc-mini menu-foot">Educational experience, not a medical diagnosis. Facts from NASA HRP and CSA pages.</p>
            </>
          )}

          {panel === 'res' && (
            <div className="menu-list">
              {RESOURCES.map(([t, u]) => <a key={u} className="menu-item" href={u} target="_blank" rel="noreferrer"><b>{t}</b><small>opens the official page ›</small></a>)}
            </div>
          )}

          {panel === 'base' && (
            <div className="menu-list">
              <p className="mc-muted">{engine.getBaseline().demo ? 'Right now these are example values. Put your own numbers measured on Earth.' : 'Your own numbers measured on Earth.'}</p>
              {BASE_FIELDS.map(([id, label, unit]) => (
                <label key={id} className="menu-field">{label}
                  <span><input type="number" step="0.1" value={base[id]} onChange={(e) => setBase({ ...base, [id]: e.target.value })} /> {unit}</span>
                </label>
              ))}
              {baseBad && <p className="ci-red">Every value must be a number above 0.</p>}
              <button type="button" className="cy-btn small" disabled={baseBad} onClick={() => {
                const clean = Object.fromEntries(BASE_FIELDS.map(([id]) => [id, Number(base[id])]));
                engine.setBaseline(clean); sound.play('success'); refresh(); setPanel('main');
              }}>Save baseline</button>
            </div>
          )}
        </aside>
      </Stage>
    </div>
  );
}
