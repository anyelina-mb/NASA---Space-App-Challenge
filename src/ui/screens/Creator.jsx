// Character Creator (Figma: Final Screens › "03 Character Creator").
// Pick name, body, skin tone and suit color; the matching picture comes from avatars.json.
// Continue saves the choice in the engine as the player profile (Body Scan uses bodyType).
import { useState } from 'react';
import avatars from '../../data/avatars.json';

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
    engine.setProfile({ name, bodyType, skinTone, suitColor });
    if (canGoBack) goBack();
    else goTo('control');
    refresh();
  }

  return (
    <section className="creator">
      <header className="cc-topbar cc-glass">
        <p className="cc-brand">HUMAN ROVER</p>
        <ol className="cc-steps" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === 0 ? 'done' : i === 1 ? 'current' : ''} aria-current={i === 1 ? 'step' : undefined}>
              <span className="cc-step-num">{i === 0 ? '✓' : i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </header>

      <div className="cc-heading">
        <h1>CREATE YOUR ASTRONAUT</h1>
        <p>Your look is just for fun. Your health comes from your check-ins.</p>
      </div>

      <div className="cc-layout">
        <div className="cc-panel cc-glass">
          <div className="cc-field">
            <label className="cc-label" htmlFor="cc-name">Astronaut name</label>
            <input
              id="cc-name"
              className="cc-input"
              value={name}
              maxLength={24}
              placeholder="Cmdr. Anyi"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="cc-field">
            <p className="cc-label" id="cc-body">Body · used in your 3D body scan</p>
            <div className="cc-bodies" role="radiogroup" aria-labelledby="cc-body">
              {BODIES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={bodyType === b.id}
                  className={`cc-body-card${bodyType === b.id ? ' selected' : ''}`}
                  onClick={() => setBodyType(b.id)}
                >
                  <img src={findAvatar(b.id, skinTone, suitColor)?.src} alt="" />
                  <span className="cc-caption">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Swatches label="Skin tone" options={SKIN_TONES} value={skinTone} onChange={setSkinTone} />
        </div>

        <div className="cc-preview">
          <div className="cc-avatar">
            {avatar && <img src={avatar.src} alt={`${displayName}: ${bodyType} astronaut, ${skinTone} skin, ${suitColor} suit`} />}
          </div>
          <img className="cc-platform" src="/media/creator/glow-platform.svg" width="440" height="130" alt="" />
          <div className="cc-nametag cc-glass">
            <p className="cc-nametag-name">{displayName}</p>
            <p className="cc-nametag-sub">{suitLabel} suit</p>
          </div>
        </div>

        <div className="cc-panel cc-glass">
          <Swatches label="Suit stripes" options={SUITS} value={suitColor} onChange={setSuitColor} />
        </div>
      </div>

      <footer className="cc-footer">
        <div className="cc-laika">
          <img src="/media/creator/laika.png" width="148" height="148" alt="Laika, the mission dog" />
          <div className="cc-bubble cc-glass">
            <p className="cc-bubble-name">Laika</p>
            <p>Looking sharp! The body you pick is the 3D body you'll scan every month.</p>
          </div>
        </div>
        <nav className="cc-nav">
          {canGoBack && <button type="button" className="cc-btn secondary" onClick={goBack}>←&nbsp; Back</button>}
          <button type="button" className="cc-btn primary" disabled={!name.trim()} onClick={save}>
            Continue&nbsp; →&nbsp; Mission control
          </button>
        </nav>
      </footer>
    </section>
  );
}
