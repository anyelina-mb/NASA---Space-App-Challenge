// App shell. Navigation uses our own Stack (Back = pop), like the zoom/back idea in the plan.
// A new player starts in the Character Creator; once a profile exists, at Mission Control.
import { useReducer, useRef } from 'react';
import { engine } from './engine/index.js';
import { Stack } from './ds/index.js';
import Creator from './ui/screens/Creator.jsx';
import MissionControl from './ui/screens/MissionControl.jsx';
import BodyScan from './ui/screens/BodyScan.jsx';
import Learn from './ui/screens/Learn.jsx';

export default function App() {
  const [, refresh] = useReducer((n) => n + 1, 0);
  const history = useRef(new Stack());
  if (history.current.isEmpty()) history.current.push(engine.getProfile() ? 'control' : 'creator');

  const screen = history.current.peek();
  const goTo = (name) => { history.current.push(name); refresh(); };
  const goBack = () => { if (history.current.size() > 1) history.current.pop(); refresh(); };

  if (screen === 'creator') return <Creator engine={engine} refresh={refresh} goTo={goTo} goBack={goBack} canGoBack={history.current.size() > 1} />;
  if (screen === 'learn') return <Learn engine={engine} refresh={refresh} goTo={goTo} goBack={goBack} />;
  if (screen === 'scan') return <BodyScan engine={engine} refresh={refresh} goBack={goBack} />;
  return <MissionControl engine={engine} refresh={refresh} goTo={goTo} />;
}
