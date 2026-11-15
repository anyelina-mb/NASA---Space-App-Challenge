// "Show data structures" (Menu): small tags that point at the structure behind each part.
// Hidden by default; turn it on for the demo video and the pitch.
import { useEffect, useState } from 'react';

let on = false;
try { on = localStorage.getItem('hr-ds') === '1'; } catch { /* private mode */ }
const listeners = new Set();

export function setDsMode(v) {
  on = v;
  try { localStorage.setItem('hr-ds', v ? '1' : '0'); } catch { /* private mode */ }
  listeners.forEach((fn) => fn(v));
}
export function useDsMode() {
  const [v, setV] = useState(on);
  useEffect(() => { listeners.add(setV); return () => listeners.delete(setV); }, []);
  return v;
}
export function DsTag({ children, style }) {
  const v = useDsMode();
  if (!v) return null;
  return <span className="ds-tag" style={style}>{children}</span>;
}
