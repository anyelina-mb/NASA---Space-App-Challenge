// Every game screen is designed on a 900-px-high canvas (same as Figma: 1440 × 900).
// On wide monitors the canvas gets wider (up to 1700 px) instead of leaving empty bars,
// then it is scaled to fit the window, like a video game.
import { useEffect, useState } from 'react';

const H = 900;
const MIN_W = 1440;
const MAX_W = 1700;

function measure() {
  if (typeof window === 'undefined') return { w: MIN_W, scale: 1 };
  const ratio = window.innerWidth / window.innerHeight;
  const w = Math.round(Math.min(MAX_W, Math.max(MIN_W, ratio * H)));
  return { w, scale: Math.min(window.innerWidth / w, window.innerHeight / H) };
}

export default function Stage({ background, className = '', children }) {
  const [{ w, scale }, set] = useState(measure);
  useEffect(() => {
    const onResize = () => set(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className={`stage-outer ${className}`} style={background ? { backgroundImage: `url(${background})` } : undefined}>
      <div className="stage-shade" aria-hidden="true" />
      {/* Space Apps rule: AI-generated images and videos must say so where people can see it */}
      <p className="ai-note">Images and videos: AI-generated (ChatGPT, Dreamina)</p>
      <div className="stage" style={{ width: w, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
