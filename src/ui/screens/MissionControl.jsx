// Mission Control: month, stage, Laika's line, next task, alerts and outbox.
// Visual design lives in Figma (Final Screens); this is the working skeleton.
export default function MissionControl({ engine, refresh, goTo }) {
  const stage = engine.getStage();
  const task = engine.nextTask();
  const alerts = engine.getAlerts();
  const outbox = engine.getOutbox();

  return (
    <section className="screen" style={{ backgroundImage: `url(${stage.background})` }}>
      <header className="hud">
        <div>
          <p className="label">Mission month</p>
          <p className="big">{engine.state.month} / 36</p>
        </div>
        <div>
          <p className="label">Stage</p>
          <p className="big">{stage.name}</p>
          <p className="muted">Gravity: {stage.gravity}</p>
        </div>
      </header>

      <div className="laika">
        <img className="laika-float" src="/media/laika/laika_happy.png" width="96" height="96" alt="Laika" />
        <p className="bubble">{stage.laika}</p>
      </div>

      <div className="grid">
        <article className="card">
          <h2>Next task</h2>
          {task ? <p>{task.text}</p> : <p className="muted">All tasks done this month.</p>}
          <button disabled={!task} onClick={() => { engine.completeTask(); refresh(); }}>Done</button>
        </article>

        <article className="card">
          <h2>Alerts</h2>
          {alerts.length === 0 && <p className="muted">No alerts.</p>}
          <ul>
            {alerts.slice(0, 5).map((a) => (
              <li key={a.order} className={`dot ${a.color}`}>Month {a.month}: {a.title}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Reports to Earth</h2>
          <p className="muted">{outbox.length} waiting</p>
          <button disabled={!outbox.length} onClick={() => { engine.sendOldestReport(); refresh(); }}>Send oldest</button>
        </article>
      </div>

      <nav className="actions">
        <button className="primary" onClick={() => goTo('learn')}>Learn: life on Mars</button>
        <button onClick={() => goTo('scan')}>Check yourself (body scan)</button>
        <button onClick={() => { engine.advanceMonth(); refresh(); }}>Next month →</button>
        <button onClick={() => goTo('creator')}>Edit astronaut</button>
      </nav>
      <p className="disclaimer">Educational experience and self-check practice, not a medical diagnosis. Data based on NASA Human Research Program resources.</p>
    </section>
  );
}
