// Temporary screen for parts of the Figma that are not coded yet.
const NAMES = {
  checkin: 'Monthly check-in', trends: 'Your trends', diary: 'Diary and reports', exercise: 'Log exercise',
  menu: 'Menu', complete: 'Mission complete',
};

export default function ComingSoon({ name, goBack }) {
  return (
    <section className="mc mc-soon">
      <div className="glass mc-soon-card">
        <p className="mc-mini">COMING NEXT</p>
        <h1>{NAMES[name] ?? name}</h1>
        <p>This screen is designed in Figma and is the next one we build.</p>
        <button type="button" className="mc-start" onClick={goBack}>← Back</button>
      </div>
    </section>
  );
}
