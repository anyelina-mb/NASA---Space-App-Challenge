// Browser entry: loads the data files (Vite imports JSON) and creates one engine for the app.
import stages from '../data/stages.json';
import risks from '../data/risks.json';
import symptoms from '../data/symptoms.json';
import bodyParts from '../data/body-parts.json';
import lessons from '../data/lessons.json';
import { createEngine } from './createEngine.js';

export const engine = createEngine({ stages, risks, symptoms, bodyParts, lessons });

// Until the Earth baseline screen is filled, compare with typical example values (labeled as demo in the UI)
export const DEMO_BASELINE = { heartRate: 64, systolic: 118, diastolic: 76, temperature: 36.6, sleepHours: 7.5, bloodSugar: 92, demo: true };
engine.setBaseline(DEMO_BASELINE);

// ---------- Keep the mission after a page refresh ----------
// The engine is saved in the browser (localStorage) after every change and loaded back on start.
const SAVE_KEY = 'human-rover-save-v1';
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    return engine.restore(save.engine) ? save : null;
  } catch { return null; }
}
export function writeSave(screens) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify({ engine: engine.snapshot(), screens })); } catch { /* private mode: just don't save */ }
}
// "Start a new mission": forget the save and start again from the start screen
export function restartMission() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* nothing saved */ }
  window.location.reload();
}
