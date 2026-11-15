// Top-right buttons on every inner screen: Back, straight home to Mission Control, and sound.
import { sound } from '../audio/sound.js';
import SoundToggle from '../audio/SoundToggle.jsx';

const Arrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const House = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>;

export default function NavButtons({ goBack, goHome, home = true }) {
  return (
    <div className="nav-btns">
      <SoundToggle />
      {goBack && <button type="button" className="nav-btn" onClick={() => { sound.play('click'); goBack(); }}><Arrow />Back</button>}
      {home && goHome && <button type="button" className="nav-btn" onClick={() => { sound.play('click'); goHome(); }}><House />Mission Control</button>}
    </div>
  );
}
