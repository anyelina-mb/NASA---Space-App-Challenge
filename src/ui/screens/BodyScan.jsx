// Body scan: pick parts on the 3D body → pick symptoms → answer questions → result.
import { useMemo, useState } from 'react';
import BodyViewer from '../../three/BodyViewer.jsx';
import questions from '../../data/questions.json';

export default function BodyScan({ engine, refresh, goBack }) {
  const [parts, setParts] = useState([]);
  const [symptomIds, setSymptomIds] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const toggle = (list, setList) => (value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const areas = engine.getBodyAreas(parts);
  const symptoms = useMemo(() => {
    const map = new Map();
    areas.forEach((a) => a.symptoms.forEach((s) => map.set(s.id, s)));
    return [...map.values()];
  }, [areas]);

  const questionIds = [...new Set(symptoms.filter((s) => symptomIds.includes(s.id)).flatMap((s) => s.questions))];

  function run() {
    setResult(engine.assess({ symptomIds, answers }));
    refresh();
  }

  return (
    <section className="screen scan">
      <div className="viewer">
        <BodyViewer selected={parts} onToggle={toggle(parts, setParts)} />
      </div>

      <aside className="panel">
        <button onClick={goBack}>← Mission Control</button>
        <h2>Where does it hurt?</h2>
        <p className="muted">{areas.length ? areas.map((a) => a.label).join(', ') : 'Click one or more body parts.'}</p>

        {symptoms.length > 0 && <h3>What do you feel?</h3>}
        {symptoms.map((s) => (
          <label key={s.id} className="check">
            <input type="checkbox" checked={symptomIds.includes(s.id)} onChange={() => toggle(symptomIds, setSymptomIds)(s.id)} />
            {s.label} {s.redFlag && <span className="tag red">urgent</span>}
          </label>
        ))}

        {questionIds.map((id) => {
          const q = questions.find((x) => x.id === id);
          if (!q) return null;
          return (
            <fieldset key={id}>
              <legend>{q.text}</legend>
              {q.options.map((opt) => (
                <label key={opt} className="check">
                  <input type="radio" name={id} checked={answers[id] === opt} onChange={() => setAnswers({ ...answers, [id]: opt })} />
                  {opt}
                </label>
              ))}
            </fieldset>
          );
        })}

        <button className="primary" disabled={!symptomIds.length} onClick={run}>Check</button>

        {result?.results.map((r) => (
          <article key={r.symptomId} className={`result ${r.leaf.color}`}>
            <h3>{r.leaf.title}</h3>
            <p>{r.leaf.cause}</p>
            <p><strong>What to do:</strong> {r.leaf.action}</p>
            <a href={r.leaf.source} target="_blank" rel="noreferrer">NASA source</a>
            <details>
              <summary>How we got here (tree path)</summary>
              <ol>{r.path.map((step, i) => <li key={i}>{step}</li>)}</ol>
              {result.ranking.length > 0 && (
                <p className="muted">Heap ranking this month: {result.ranking.map((x) => `${x.name} (${x.score})`).join(' > ')}</p>
              )}
            </details>
          </article>
        ))}
      </aside>
    </section>
  );
}
