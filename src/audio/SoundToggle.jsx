// Mute button for the header and the Menu.
import { useEffect, useState } from 'react';
import { sound } from './sound.js';

export default function SoundToggle({ className = '' }) {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => sound.onChange(setMuted), []);
  return (
    <button
      type="button"
      className={`sound-toggle ${className}`}
      onClick={() => sound.toggleMuted()}
      aria-pressed={muted}
      aria-label={muted ? 'Turn sound on' : 'Mute sound'}
      title={muted ? 'Sound off' : 'Sound on'}
    >
      {muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6M17 9l6 6" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
      )}
      <span>{muted ? 'Sound off' : 'Sound on'}</span>
    </button>
  );
}
