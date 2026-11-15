// Character Creator (Figma: Final Screens › "03 Character Creator").
// Pick name, body, skin tone and suit color; the matching picture comes from avatars.json.
// Continue saves the choice in the engine as the player profile (Body Scan uses bodyType).
import { useState } from 'react';
import avatars from '../../data/avatars.json';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import { sound } from '../../audio/sound.js';

const BODIES = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];
// Swatch colors taken from the Figma swatches
const SKIN_TONES = [
  { id: 'light', label: 'Light', color: '#FADBC2' },
  { id: 'medium', label: 'Medium', color: '#D19E78' },
  { id: 'dark', label: 'Dark', color: '#7A5238' },
];
const SUITS = [
  { id: 'orange', label: 'Orange', color: '#FF7326' },
  { id: 'blue', label: 'Blue', color: '#338CFF' },
  { id: 'red', label: 'Red', color: '#E63840' },
];
const STEPS = ['Crew ID', 'Astronaut', 'Mission', 'Launch'];

const findAvatar = (bodyType, skinTone, suitColor) =>
  avatars.find((a) => a.bodyType === bodyType && a.skinTone === skinTone && a.suitColor === suitColor);

// eslint-disable-next-line no-unused-vars
function Swatches({ label, options, value, onChange }) {
  return (
    <div className="cc-field">
      <p className="cc-label" id={`cc-${label}`}>{label}</p>
      <div className="cc-swatches" role="radiogroup" aria-labelledby={`cc-${label}`}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            aria-label={o.label}
            title={o.label}
            className={`cc-swatch${value === o.id ? ' selected' : ''}`}
            style={{ '--swatch': o.color }}
            onClick={() => onChange(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Creator({ engine, refresh, goTo, goBack, canGoBack }) {
  const saved = engine.getProfile();
  const [name, setName] = useState(saved?.name ?? '');
  const [bodyType, setBodyType] = useState(saved?.bodyType ?? 'female');
  const [skinTone, setSkinTone] = useState(saved?.skinTone ?? 'medium');
  const [suitColor, setSuitColor] = useState(saved?.suitColor ?? 'orange');

  const avatar = findAvatar(bodyType, skinTone, suitColor);
  const suitLabel = SUITS.find((s) => s.id === suitColor).label;
  const displayName = name.trim() || 'Your astronaut';

  function save() {
    sound.play('success');
    engine.setProfile({ name, bodyType, skinTone, suitColor });
    if (saved) goBack(); // editing from the Menu or from Launch
    else goTo('launch'); // first time: next stop is the launch pad
    refresh();
  }

  const Pick = ({ title, options, value, onChange }) => (
    <div className="cr-field">
      <p className="cy-step">{title}</p>
      <div className="cr-options">
        {options.map((o) => (
          <button key={o.id} type="button" className={`cr-option${value === o.id ? ' on' : ''}`} aria-pressed={value === o.id} onClick={() => { sound.play('select'); onChange(o.id); }}>
            <i style={{ background: o.color }} />{o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Stage background="/media/bg/bg-trip.jpg" className="mc cr">
      <header className="mc-top glass cy-top">
        <p className="mc-brand">HUMAN ROVER</p>
        <ol className="ln-steps"><li className="on">1 · Your explorer</li><li>2 · Launch</li></ol>
        <NavButtons home={false} />
      </header>
      <p className="cy-kicker">STEP 1 OF 2 · YOUR EXPLORER</p>
      <h1 className="cy-title">Create your astronaut</h1>
      <p className="ln2-sub cr-sub">Your look is just for fun. Your health comes from your check-ins.</p>

      <section className="cr-left glass">
        <div className="cr-field">
          <label className="cy-step" htmlFor="cc-name">ASTRONAUT NAME</label>
          <input id="cc-name" className="cr-input" value={name} maxLength={24} placeholder="Type your name" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="cr-field">
          <p className="cy-step">BODY · USED IN YOUR 3D BODY SCAN</p>
          <div className="cr-bodies">
            {BODIES.map((b) => (
              <button key={b.id} type="button" className={`cr-body${bodyType === b.id ? ' on' : ''}`} aria-pressed={bodyType === b.id} onClick={() => { sound.play('select'); setBodyType(b.id); }}>
                <img src={findAvatar(b.id, skinTone, suitColor)?.src} alt="" />
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Pick title="SKIN TONE" options={SKIN_TONES} value={skinTone} onChange={setSkinTone} />
      </section>

      <div className="cr-center">
        {avatar && <img className="cr-avatar" src={avatar.src} alt={`${displayName}: ${bodyType} astronaut, ${skinTone} skin, ${suitColor} suit`} />}
        <div className="cr-tag glass"><strong>{displayName}</strong><span>{suitLabel} suit</span></div>
      </div>

      <section className="cr-right glass">
        <Pick title="SUIT STRIPES" options={SUITS} value={suitColor} onChange={setSuitColor} />
        <p className="mc-hand cr-note">you can change your look anytime from the Menu</p>
      </section>

      <div className="cy-laika">
        <img src="/media/bg/laika-circle.jpg" alt="Laika" />
        <div className="mc-bubble glass">
          <p className="mc-bubble-name">Laika</p>
          <p>Looking sharp! The body you pick is the 3D body you&apos;ll check every month.</p>
          <p className="mc-next">Next → {name.trim() ? 'Tap Continue' : 'Type your name'}</p>
        </div>
      </div>
      <div className="cy-actions">
        {canGoBack && <button type="button" className="cy-btn ghost" onClick={() => { sound.play('click'); goBack(); }}>← Back</button>}
        <button type="button" className="cy-btn" disabled={!name.trim()} onClick={save}>{saved ? 'Save changes →' : 'Continue → Launch'}</button>
      </div>
    </Stage>
  );
}
