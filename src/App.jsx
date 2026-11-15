// App shell. Navigation uses our own Stack (Back = pop).
// A new player starts in the Character Creator; once a profile exists, at Mission Control.
import { useEffect, useReducer, useRef } from 'react';
import { engine, loadSave, writeSave } from './engine/index.js';
import { Stack } from './ds/index.js';
import { sound, musicFor } from './audio/sound.js';
import Creator from './ui/screens/Creator.jsx';
import MissionControl from './ui/screens/MissionControl.jsx';
import BodyScan from './ui/screens/BodyScan.jsx';
import Learn from './ui/screens/Learn.jsx';
import ComingSoon from './ui/screens/ComingSoon.jsx';
import Home from './ui/screens/Home.jsx';
import Launch from './ui/screens/Launch.jsx';
import CheckIn from './ui/screens/CheckIn.jsx';
import Trends from './ui/screens/Trends.jsx';
import Diary from './ui/screens/Diary.jsx';
import Exercise from './ui/screens/Exercise.jsx';
import Menu from './ui/screens/Menu.jsx';
import Complete from './ui/screens/Complete.jsx';

const SCREENS = {
  home: Home,
  creator: Creator,
  launch: Launch,
  checkin: CheckIn,
  trends: Trends,
  diary: Diary,
  exercise: Exercise,
  menu: Menu,
  complete: Complete,
  learn: Learn,
  scan: BodyScan,
  control: MissionControl,
};

export default function App() {
  const [, refresh] = useReducer((n) => n + 1, 0);
  const history = useRef(null);
  if (!history.current) {
    // Load the saved mission (if any) and put the player back on the screen they were on
    history.current = new Stack();
    const save = loadSave();
    // Mission Control is always at the bottom; the start screens and pop-ups are not restored
    const screens = (save?.screens ?? []).filter((s) => SCREENS[s] && !['home', 'creator', 'launch', 'menu', 'control'].includes(s));
    if (engine.getProfile()) ['control', ...screens].forEach((s) => history.current.push(s));
    else history.current.push('home');
  }

  const screen = history.current.peek();
  // replace: swap the current screen (e.g. a saved check-in becomes its trends, so Back skips the old form)
  const goTo = (name, { replace = false } = {}) => { if (replace && history.current.size() > 1) history.current.pop(); history.current.push(name); refresh(); };
  const goBack = () => { if (history.current.size() > 1) history.current.pop(); refresh(); };
  const goHome = () => { while (history.current.size() > 1) history.current.pop(); if (history.current.peek() !== 'control') history.current.push('control'); refresh(); };

  // Browsers only allow sound after the first click
  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  // Mars music on Mission Control during the Mars stay, ship music everywhere else
  const stageId = engine.getStage().id;
  useEffect(() => { sound.playMusic(musicFor(stageId)); }, [screen, stageId]);

  // Save after every change (each refresh() re-renders the app)
  useEffect(() => { if (engine.getProfile()) writeSave(history.current.toArray()); });

  const Screen = SCREENS[screen];
  const props = { engine, refresh, goTo, goBack, goHome, canGoBack: history.current.size() > 1 };
  if (Screen) return <Screen {...props} />;
  return <ComingSoon name={screen} {...props} />;
}
