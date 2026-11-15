// Home / Intro (Figma: 01). First screen of the game.
import Stage from '../Stage.jsx';
import { sound } from '../../audio/sound.js';
import SoundToggle from '../../audio/SoundToggle.jsx';

const FACTS = [
  ['36', 'months away'],
  ['38%', "of Earth's gravity"],
  ['5', 'NASA hazards'],
  ['22 min', 'max message delay'],
];

export default function Home({ goTo }) {
  const go = (s) => { sound.unlock(); sound.play('click'); goTo(s); };
  return (
    <Stage background="/media/bg/bg-orbit.jpg" className="mc home">
      <div className="home-shade" aria-hidden="true" />
      <div className="home-sound"><SoundToggle /></div>
      <h1 className="home-title">HUMAN<br />ROVER</h1>
      <p className="home-sub">What would living on Mars do to your body?<br />Explore it month by month with Laika.</p>
      <div className="home-actions">
        <button type="button" className="cy-btn home-start" onClick={() => go('creator')}>Start exploring →</button>
        <p className="mc-hand home-hint">start here</p>
      </div>
      <dl className="home-facts glass">
        {FACTS.map(([n, l]) => <div key={l}><dt>{n}</dt><dd>{l}</dd></div>)}
      </dl>
      <div className="home-laika">
        <div className="mc-bubble glass">
          <p className="mc-bubble-name">Laika</p>
          <p>Woof! I&apos;m Laika, your guide. Together we&apos;ll see what living on Mars does to your body.</p>
          <p className="mc-next">Next → Tap Start exploring to create your astronaut</p>
        </div>
        <img src="/media/bg/laika-circle.jpg" alt="Laika in her space helmet" />
      </div>
      <p className="mc-disclaimer">Educational experience and self-check practice, not a medical diagnosis · Facts from NASA pages · No human has lived on Mars yet</p>
    </Stage>
  );
}
