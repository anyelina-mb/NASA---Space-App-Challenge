// Sound for HUMAN ROVER: one background track that loops, plus short effects.
// Browsers block audio until the user clicks once, so call sound.unlock() on the first click
// (the "Start exploring" button) and the music starts from there.
const BASE = '/media/sound/';

const EFFECTS = {
  click: 'click.mp3',     // buttons
  select: 'select.mp3',   // picking a body part or an option
  success: 'success.mp3', // XP, lesson learned, task done
  alert: 'alert.mp3',     // yellow and red results
  launch: 'launch.mp3',   // liftoff at T-0
};

const MUSIC = {
  ship: 'music-ship.mp3', // default background (trip, Earth, menus)
  mars: 'music-mars.mp3', // Mission Control while on Mars
};

const MUSIC_VOLUME = 0.3;
const EFFECT_VOLUME = { click: 0.18, select: 0.12, success: 0.3, alert: 0.25, launch: 0.5 };

function readMuted() {
  try { return localStorage.getItem('hr-muted') === '1'; } catch { return false; }
}

class SoundManager {
  constructor() {
    this.muted = readMuted();
    this.unlocked = false;
    this.current = null; // 'ship' | 'mars'
    this.wanted = 'ship';
    this.tracks = {};
    this.listeners = new Set();
  }

  // Call once from a click handler
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playMusic(this.wanted);
  }

  // Switch background music with a short crossfade. Same track = nothing happens.
  playMusic(name) {
    this.wanted = name;
    if (!this.unlocked) return;
    if (this.current === name) {
      // same track: make sure it is still playing (e.g. after coming back to a screen)
      const t = this.tracks[name];
      if (t && !this.muted && t.paused) { this.cancelFade(t); t.volume = MUSIC_VOLUME; t.play().catch(() => {}); }
      return;
    }
    const prev = this.current ? this.tracks[this.current] : null;
    let next = this.tracks[name];
    if (!next) {
      next = new Audio(BASE + MUSIC[name]);
      next.loop = true;
      next.preload = 'auto';
      this.tracks[name] = next;
    }
    this.current = name;
    if (this.muted) { if (prev) { this.cancelFade(prev); prev.pause(); } return; }
    next.volume = 0;
    next.play().catch(() => {});
    this.fade(next, MUSIC_VOLUME);
    if (prev) this.fade(prev, 0, () => prev.pause());
  }

  cancelFade(audio) { if (audio._fade) { clearInterval(audio._fade); audio._fade = null; } }

  fade(audio, to, done) {
    this.cancelFade(audio);
    const from = audio.volume;
    const steps = 20;
    let i = 0;
    audio._fade = setInterval(() => {
      i += 1;
      audio.volume = Math.min(1, Math.max(0, from + ((to - from) * i) / steps));
      if (i >= steps) { this.cancelFade(audio); if (done) done(); }
    }, 40);
  }

  play(effect) {
    if (this.muted || !this.unlocked || !EFFECTS[effect]) return;
    const a = new Audio(BASE + EFFECTS[effect]);
    a.volume = EFFECT_VOLUME[effect] ?? 0.2;
    a.play().catch(() => {});
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem('hr-muted', muted ? '1' : '0'); } catch { /* private mode */ }
    const track = this.current && this.tracks[this.current];
    if (muted) {
      // stop EVERY track, also one that was still fading out after a music change
      Object.values(this.tracks).forEach((t) => { this.cancelFade(t); t.pause(); });
    } else if (track) {
      this.cancelFade(track);
      track.volume = MUSIC_VOLUME; track.play().catch(() => {});
    } else if (!muted && this.unlocked) {
      const name = this.wanted; this.current = null; this.playMusic(name);
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  toggleMuted() { this.setMuted(!this.muted); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

// One sound manager for the whole page. Kept on window so a hot reload while developing
// never leaves an old copy playing music that the mute button can't reach.
const old = typeof window !== 'undefined' ? window.__hrSound : null;
if (old) Object.values(old.tracks).forEach((t) => t.pause());
export const sound = new SoundManager();
if (typeof window !== 'undefined') {
  window.__hrSound = sound;
  // Same app open in another tab: muting in one tab mutes all of them
  window.addEventListener('storage', (e) => {
    if (e.key === 'hr-muted') sound.setMuted(e.newValue === '1');
  });
}

// Which track fits the month: Mars music during the whole Mars stay (every screen), ship music otherwise.
export function musicFor(stageId) {
  return stageId === 'mars' ? 'mars' : 'ship';
}
