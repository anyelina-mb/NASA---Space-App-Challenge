// Learn mode (Figma: Final Screens › "11 Learn").
// Pick a month and a body part; Laika explains what NASA has learned or expects, with the source.
// Lessons come from engine.getLessons (binary search by month); the top topics from engine.getTopTopics (max-heap).
import { useState } from 'react';
import BodyViewer from '../../three/BodyViewer.jsx';
import lessonsData from '../../data/lessons.json';

const BASIS = {
  iss: 'Learned on long space station missions',
  expected: 'What NASA expects for Mars',
  fact: 'Mars fact',
};

function LessonCard({ lesson, done, onLearned }) {
  const [picked, setPicked] = useState(null);
  const correct = picked === lesson.quiz?.answer;
  return (
    <article className="lr-lesson cc-glass">
      <p className="lr-hazard">{lessonsData.hazards[lesson.hazard]} · {BASIS[lesson.basis]}</p>
      <h3>{lesson.title}</h3>
      <p>{lesson.text}</p>
      <a href={lesson.source} target="_blank" rel="noreferrer">{lesson.sourceName} ›</a>
      {lesson.quiz && (
        <fieldset className="lr-quiz">
          <legend>Quick check: {lesson.quiz.q}</legend>
          {lesson.quiz.options.map((o, i) => (
            <button
              key={o}
              type="button"
              className={`lr-option${picked === i ? (correct ? ' right' : ' wrong') : ''}`}
              onClick={() => { setPicked(i); if (i === lesson.quiz.answer) onLearned(lesson.id); }}
            >
              {o}
            </button>
          ))}
          {picked !== null && <p className="lr-feedback">{correct ? 'Correct! Lesson learned.' : 'Not quite, try again.'}</p>}
        </fieldset>
      )}
      {done && <p className="lr-done">✓ Learned</p>}
    </article>
  );
}

export default function Learn({ engine, refresh, goTo, goBack }) {
  const [month, setMonth] = useState(engine.state.month);
  const [mesh, setMesh] = useState(null);
  const area = mesh ? engine.getBodyAreas([mesh])[0] : null;

  const stage = engine.getStage(month);
  const top = engine.getTopTopics(month, 3);
  const { lessons } = engine.getLessons({ month, area: area?.area ?? null });
  const shown = area ? lessons : top;
  const progress = engine.getProgress();
  const laikaImg = shown[0]?.laika ?? 'laika_guide.png';
  const bodyType = engine.getProfile()?.bodyType ?? 'female';

  return (
    <section className="creator learn">
      <header className="cc-topbar cc-glass">
        <p className="cc-brand">HUMAN ROVER</p>
        <p className="lr-progress">Lessons learned: {progress.learned} / {progress.total}</p>
        <button type="button" className="cc-btn secondary lr-small" onClick={goBack}>← Back</button>
      </header>

      <div className="cc-heading">
        <h1>LEARN · LIFE ON MARS</h1>
        <p>Pick a month and a part of the body. Laika explains what space does there, with the NASA source.</p>
      </div>

      <div className="lr-month cc-glass">
        <label htmlFor="lr-month">Month {month} of 36 · {stage.name} · gravity {stage.gravity}</label>
        <input id="lr-month" type="range" min="1" max="36" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
      </div>

      <div className="lr-layout">
        <div className="lr-body cc-glass">
          <BodyViewer
            selected={mesh ? [mesh] : []}
            onToggle={(m) => setMesh(m === mesh ? null : m)}
            modelUrl={bodyType === 'male' ? '/models/body.glb' : '/models/body_female.glb'}
          />
          <p className="lr-hint">{area ? `Selected: ${area.label} (click again to clear)` : 'Click a body part to filter the lessons'}</p>
        </div>

        <div className="lr-side">
          <div className="lr-laika">
            <img className="laika-float" src={`/media/laika/${laikaImg}`} width="150" height="150" alt="Laika, your guide" />
            <div className="cc-bubble cc-glass">
              <p className="cc-bubble-name">Laika</p>
              <p>{area
                ? (lessons.length ? `Here's what happens to your ${area.label.toLowerCase()} in month ${month}.` : `Nothing special for your ${area.label.toLowerCase()} this month. Try another part!`)
                : `Top ${shown.length} topics for month ${month}, picked by importance.`}</p>
            </div>
          </div>

          {shown.map((l) => (
            <LessonCard key={`${l.id}-${month}`} lesson={l} done={progress.ids.includes(l.id)} onLearned={(id) => { engine.markLearned(id); refresh(); }} />
          ))}

          <button type="button" className="cc-btn primary" onClick={() => goTo('scan')}>Practice the self-check →</button>
        </div>
      </div>
      <p className="disclaimer">Educational experience, not a medical diagnosis. Facts paraphrased from NASA pages; no human has lived on Mars yet.</p>
    </section>
  );
}
