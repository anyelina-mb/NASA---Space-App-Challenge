// Check yourself (Figma: 07, 07b, 07c).
// 1. Pick the body part on the 3D body  2. Pick what you feel  3. Answer Laika's questions
// → the result appears live (green / yellow / red) with what to do, why it happens (NASA hazard)
//   and who can help. Red flags skip every question.
// Under the hood: the MaxHeap ranks the most likely cause for this month, the DecisionTree
// walks your answers, and "Add to my report" puts it in the outbox Queue to Earth.
import { useMemo, useState } from 'react';
import BodyViewer from '../../three/BodyViewer.jsx';
import Stage from '../Stage.jsx';
import NavButtons from '../NavButtons.jsx';
import questions from '../../data/questions.json';
import { sound } from '../../audio/sound.js';
import { DsTag } from '../dsMode.jsx';
import { hazardOf, HAZARD_LABEL } from '../hazards.js';

const SCENE_TITLE = { trip: 'Trip to Mars', mars: 'Life on Mars', home: 'Trip home', earth: 'Back on Earth' };
// How long a message to the doctors on Earth takes (NASA NTRS: 0 to ~22 min one way at Mars)
const DELAY = { trip: 'message delay to Earth grows each week', mars: 'message delay to Earth up to ~22 min', home: 'message delay to Earth shrinks each week', earth: 'no delay · doctors are here' };
const COLOR_TITLE = { green: "Green · you're okay", yellow: 'Yellow · keep an eye on it', red: 'Red · get help now' };
const LAIKA = {
  start: ['Tap the part of the body that feels different. Use Front and Back to turn the body.', 'Tap a body part'],
  feel: ['Look at the card under the body: it tells you what space can do there. Now, what do you feel?', 'Pick what you feel'],
  ask: ['A few quick questions so I can help.', 'Answer the questions'],
  ready: ['Thanks! Now I can tell you what this could be.', 'Tap Analyze'],
  green: ['Green! Still, good job checking. Noticing early is the whole point.', 'Save it to your diary'],
  yellow: ['Good job checking. Noticing early is the whole point.', 'Read what to do, then add it to your report'],
  red: ["I'm right here with you. Stop what you're doing and tell the crew.", 'Call your crew medical officer now'],
};
const RED_FLAG = 'Chest pain, fainting, shortness of breath or sudden vision change';

export default function BodyScan({ engine, refresh, goBack, goTo, goHome }) {
  const [parts, setParts] = useState([]);
  const [symptomIds, setSymptomIds] = useState([]);
  const [answers, setAnswers] = useState({});
  const [facing, setFacing] = useState('front');
  const [spin, setSpin] = useState(false);
  const [saved, setSaved] = useState(null); // { place } after "Add to my report"
  const [emergency, setEmergency] = useState(false);
  const [called, setCalled] = useState(false);
  const [analyzed, setAnalyzed] = useState(false); // result only after "Analyze"
  const [other, setOther] = useState(null); // free text when none of the options fits


  const stage = engine.getStage();
  const scene = stage.scene;
  const bodyType = engine.getProfile()?.bodyType ?? 'female';
  const areas = engine.getBodyAreas(parts);

  const symptoms = useMemo(() => {
    const map = new Map();
    areas.forEach((a) => a.symptoms.forEach((s) => map.set(s.id, s)));
    // red flags (chest pain, shortness of breath) are listed last, in red
    return [...map.values()].sort((a, b) => Number(a.redFlag) - Number(b.redFlag));
  }, [areas]);

  const picked = symptoms.filter((s) => symptomIds.includes(s.id) && !s.redFlag);
  const questionIds = [...new Set(picked.flatMap((s) => s.questions))];

  // Preview (no alerts or diary until the player saves it). The verdict shows after "Analyze".
  const preview = picked.length ? engine.assess({ symptomIds: picked.map((s) => s.id), answers, commit: false }) : null;
  const hasOther = other !== null && other.trim().length > 0;
  const answeredAll = questionIds.every((q) => answers[q]) && (picked.length > 0 || hasOther);
  const otherResult = { leaf: { color: 'yellow', title: 'Not in Laika\'s guide yet', cause: 'What you described is not one of the symptoms in our NASA-based guide. Something new is always worth telling the crew.', action: 'Tell your crew medical officer what you feel and add it to your report to Earth.', source: 'https://www.nasa.gov/hrp/risks/' }, path: [`You described: "${(other ?? '').trim()}"`] };
  const fromTree = analyzed && preview ? preview.results.reduce((a, r) => (rank(r.leaf.color) > rank(a.leaf.color) ? r : a)) : null;
  const worst = fromTree ?? (analyzed && hasOther ? otherResult : null);
  const shown = emergency
    ? { leaf: { color: 'red', title: 'Emergency symptom', cause: `${RED_FLAG} need an immediate medical evaluation.`, action: 'Stop, tell the crew and contact the flight surgeons now.', source: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/' }, path: ['Red flag → skip every question'] }
    : worst;
  // Clue card: after analyzing, the cause the heap picked; before, the strongest NASA risk of the tapped area
  const lastArea = areas.at(-1)?.area;
  const topRisk = worst?.riskId ? engine.getRisk(worst.riskId)
    : preview?.ranking?.[0] ? engine.getRisk(preview.ranking[0].id)
      : lastArea ? engine.getAreaInsight(lastArea) : null;
  const laikaKey = shown ? shown.leaf.color : (picked.length || hasOther) ? (answeredAll ? 'ready' : 'ask') : parts.length ? 'feel' : 'start';
  const [laikaText, laikaNext] = LAIKA[laikaKey];
  const outboxCount = engine.getOutbox().length;

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const changed = () => { setSaved(null); setAnalyzed(false); };
  const pickPart = (mesh) => { sound.play('select'); changed(); toggle(parts, setParts, mesh); };
  const pickSymptom = (s) => {
    if (s.redFlag) { pressEmergency(); return; }
    sound.play('select'); changed(); toggle(symptomIds, setSymptomIds, s.id);
  };
  const answer = (qid, opt) => { sound.play('click'); changed(); setAnswers({ ...answers, [qid]: opt }); };
  function analyze() {
    setAnalyzed(true);
    if (engine.finishTask('balance')) refresh(); // on Earth, the "Balance check" task is done by checking yourself
    const c = preview ? preview.results.reduce((a, r) => Math.max(a, rank(r.leaf.color)), 0) : 2;
    sound.play(c >= 2 ? 'alert' : 'success');
  }
  function reset() {
    sound.play('click');
    setParts([]); setSymptomIds([]); setAnswers({}); setOther(null); setAnalyzed(false); setSaved(null); setEmergency(false); setCalled(false); setFacing('front'); setSpin(false);
  }

  function pressEmergency() {
    if (emergency) return; // already raised: don't send the same alert twice
    sound.play('alert');
    engine.assess({ symptomIds: ['chest-pain'], answers: {} }); // red flag: alert heap + outbox queue
    setEmergency(true);
    refresh();
  }

  function save() {
    if (!shown || emergency) return;
    if (picked.length) engine.assess({ symptomIds: picked.map((x) => x.id), answers }); // commits: alerts heap, diary, XP (red also goes to the outbox)
    if (shown.leaf.color === 'yellow') engine.addToReport(shown === otherResult ? `Described: ${other.trim()}` : shown.leaf.title, 'yellow');
    const place = shown.leaf.color === 'green' ? null : engine.getOutbox().length;
    sound.play('success');
    setSaved({ place });
    refresh();
  }

  return (
    <Stage background={stage.background} className="mc cy">
      <header className="mc-top glass cy-top">
        <p className="mc-brand">HUMAN ROVER</p>
        <div className="cy-center cy-monthnav">
          <button type="button" aria-label="Previous month" disabled={engine.state.month <= 1} onClick={() => { engine.setMonth(engine.state.month - 1); changed(); refresh(); }}>‹</button>
          <span>MONTH {engine.state.month} OF 36 · {SCENE_TITLE[scene].toUpperCase()} · {DELAY[scene].toUpperCase()}</span>
          <button type="button" aria-label="Next month" disabled={engine.state.month >= 36} onClick={() => { engine.setMonth(engine.state.month + 1); changed(); refresh(); }}>›</button>
        </div>
        <NavButtons goBack={goBack} goHome={goHome} />
      </header>

      <p className="cy-kicker">CHECK YOURSELF · PRACTICE THE SELF-CHECK ASTRONAUTS DO</p>
      <h1 className="cy-title">Something feels different? Let&apos;s check it together.</h1>

      {/* Left: 3D body + hazard card */}
      <section className="cy-body glass" aria-label="3D body">
        <div className="cy-chip">{areas.length ? `${areas[0].label}${areas.length > 1 ? ` +${areas.length - 1}` : ''}` : 'Tap a body part'}{areas.length > 0 && <span>SELECTED</span>}</div>
        <div className="cy-canvas">
          <BodyViewer
            key={bodyType}
            selected={parts}
            onToggle={pickPart}
            modelUrl={bodyType === 'male' ? '/models/body.glb' : '/models/body_female.glb'}
            facing={facing}
            autoRotate={spin}
          />
        </div>
        {topRisk && !emergency ? (
          <article className="cy-hazard">
            <p className="cy-hz-kicker">{shown ? 'WHY IS THIS HAPPENING?' : 'WHAT SPACE CAN DO HERE'}{topRisk.hazard ? ` · NASA HAZARD: ${topRisk.hazard.toUpperCase()}` : ''}</p>
            <h3>{topRisk.why}</h3>
            <p>{topRisk.explain}</p>
            <div className="cy-links">
              <span>NASA RISK</span>
              <a href={topRisk.source} target="_blank" rel="noreferrer">{topRisk.name} ›</a>
              <a href="https://www.nasa.gov/hrp/hazards/" target="_blank" rel="noreferrer">5 Hazards ›</a>
            </div>
            {topRisk.research?.length > 0 && (
              <div className="cy-links">
                <span>RESEARCH NOW</span>
                {topRisk.research.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer">{n} ›</a>)}
              </div>
            )}
          </article>
        ) : (
          <p className="mc-hand cy-hint" hidden={Boolean(topRisk && !emergency)}>{parts.length ? 'now pick what you feel →' : 'tap the body where it feels different'}</p>
        )}
        <div className="cy-view">
          <button type="button" onClick={reset}>↺ Reset</button>
          <button type="button" className={facing === 'front' && !spin ? 'on' : ''} onClick={() => { setSpin(false); setFacing('front'); }}>Front</button>
          <button type="button" className={facing === 'back' && !spin ? 'on' : ''} onClick={() => { setSpin(false); setFacing('back'); }}>Back</button>
          <button type="button" className={spin ? 'on' : ''} onClick={() => setSpin(!spin)}>⟲ Rotate</button>
        </div>
      </section>

      {/* Middle: what you feel + questions + emergency */}
      <div className="cy-mid">
        <section className="cy-card glass">
          <p className="cy-step">1 · WHAT DO YOU FEEL?</p>
          {symptoms.length === 0 && <p className="mc-muted">Tap a body part first.</p>}
          <div className="cy-chips">
            {symptoms.map((s) => (
              <button key={s.id} type="button" className={`cy-pill${symptomIds.includes(s.id) ? ' on' : ''}${s.redFlag ? ' red' : ''}`} onClick={() => pickSymptom(s)}>
                {symptomIds.includes(s.id) ? '✓ ' : ''}{s.label}
              </button>
            ))}
            {parts.length > 0 && (
              <button type="button" className={`cy-pill dashed${other !== null ? ' on' : ''}`} onClick={() => { sound.play('select'); changed(); setOther(other === null ? '' : null); }}>
                {other !== null ? '✓ ' : '+ '}Something else
              </button>
            )}
          </div>
          {other !== null && (
            <textarea className="cy-other" value={other} maxLength={120} onChange={(e) => { changed(); setOther(e.target.value); }} placeholder="Describe it in your own words, e.g. 'my ear rings'" aria-label="Describe what you feel" />
          )}
        </section>

        <section className="cy-card glass">
          <p className="cy-step">2 · A FEW QUESTIONS {questionIds.length > 0 && <span>{Object.keys(answers).filter((k) => questionIds.includes(k)).length} of {questionIds.length}</span>}</p>
          {questionIds.length === 0 && !hasOther && <p className="mc-muted">Laika&apos;s questions appear here.</p>}
          {questionIds.map((id) => {
            const q = questions.find((x) => x.id === id);
            if (!q) return null;
            return (
              <fieldset key={id} className="cy-q">
                <legend>{q.text}</legend>
                <div className="cy-chips">
                  {q.options.map((opt) => (
                    <button key={opt} type="button" className={`cy-pill${answers[id] === opt ? ' on' : ''}`} onClick={() => answer(id, opt)}>{opt}</button>
                  ))}
                </div>
              </fieldset>
            );
          })}
          {(picked.length > 0 || hasOther) && (
            <button type="button" className="cy-analyze" disabled={!answeredAll || analyzed} onClick={analyze}>
              {analyzed ? '✓ Analyzed' : answeredAll ? 'Analyze →' : 'Answer all the questions to analyze'}
            </button>
          )}
        </section>

      </div>

      {/* Right: result + path + help */}
      <div className="cy-right">
        <section className={`cy-result glass ${shown ? shown.leaf.color : 'idle'}`} aria-live="polite">
          {shown ? (
            <>
              <p className="cy-res-kicker"><i className={`dot-i ${shown.leaf.color}`} />{COLOR_TITLE[shown.leaf.color]}</p>
              <h2>{shown.leaf.title}</h2>
              <p>{shown.leaf.cause}</p>
              <div className="cy-todo"><strong>What to do</strong><p>{shown.leaf.action}</p></div>
              <a href={shown.leaf.source} target="_blank" rel="noreferrer">NASA source ›</a>
            </>
          ) : (
            <>
              <p className="cy-res-kicker">YOUR RESULT</p>
              <p className="mc-muted">Pick what you feel, answer Laika&apos;s questions and tap Analyze. Green, yellow or red appears here.</p>
            </>
          )}
        </section>

        {shown && (
          <section className="cy-path glass">
            <p className="cy-step">HOW WE GOT HERE <DsTag>DECISION TREE + MAX-HEAP</DsTag></p>
            {!emergency && topRisk && <p><i className="dot-i cy-blue" />Most likely cause <strong>{topRisk.name}</strong>{hazardOf(topRisk) && <span className="cy-hz"> · NASA hazard: {HAZARD_LABEL[hazardOf(topRisk)]}</span>}</p>}
            {shown.path.filter((p) => !p.startsWith('Most likely')).map((p) => (
              <p key={p}><i className="dot-i cy-blue" />{p.replace(' → ', ' ')}</p>
            ))}
            <p><i className={`dot-i ${shown.leaf.color}`} />Result <strong>{shown.leaf.color} leaf</strong></p>
          </section>
        )}

        <section className="cy-help glass">
          <p className="cy-step">WHO CAN HELP <DsTag>QUEUE</DsTag></p>
          <button type="button" className={`cy-call${called ? ' done' : ''}`} onClick={() => { sound.play(called ? 'click' : 'alert'); setCalled(true); }}>
            {called ? '✓ Crew medical officer is on the way' : 'Call your crew medical officer · now'}
          </button>
          <p className="cy-earth">Report to flight surgeons on Earth</p>
          <div className="cy-track"><span style={{ width: `${Math.min(100, outboxCount * 30)}%` }} /></div>
          <p className="mc-mini">{outboxCount ? `${outboxCount} waiting to send` : 'nothing waiting'}</p>
        </section>
          <button type="button" className="cy-emergency" onClick={pressEmergency}>
            <small>EMERGENCY · TAP TO ALERT THE CREW NOW ›</small>
            <strong>{RED_FLAG}</strong>
          </button>
      </div>

      <div className="cy-laika">
        <img src="/media/bg/laika-circle.jpg" alt="Laika" />
        <div className="mc-bubble glass">
          <p className="mc-bubble-name">Laika</p>
          <p>{laikaText}</p>
          <p className="mc-next">Next → {laikaNext}</p>
        </div>
      </div>

      <div className="cy-actions">
        {topRisk && (
          <button type="button" className="cy-btn ghost cy-why" onClick={() => { sound.play('click'); engine.focusLearn({ hazard: hazardOf(topRisk), area: areas.at(-1)?.area ?? null }); goTo('learn'); }}>
            <small>WHY? NASA HAZARD</small>Learn about {HAZARD_LABEL[hazardOf(topRisk)] ?? shortName(topRisk.name)} →
          </button>
        )}
        {emergency ? (
          <button type="button" className="cy-btn red" onClick={() => { sound.play('click'); goBack(); }}>I&apos;m with the crew now →</button>
        ) : saved ? (
          <button type="button" className="cy-btn" onClick={() => { sound.play('click'); goBack(); }}>
            {saved.place ? `Added · ${ordinal(saved.place)} to send` : 'Saved to your diary'} · back →
          </button>
        ) : (
          <button type="button" className="cy-btn" disabled={!shown} onClick={save}>
            {shown?.leaf.color === 'green' ? 'Save to diary →' : 'Add to my report →'}
          </button>
        )}
      </div>

      <p className="mc-disclaimer cy-disc">Self-check practice, not a medical diagnosis · Red flags always go to the crew and flight surgeons</p>
    </Stage>
  );
}

function rank(c) { return c === 'red' ? 3 : c === 'yellow' ? 2 : 1; }
function ordinal(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`; }
function shortName(name) { return name.length > 22 ? name.split(' ').slice(0, 3).join(' ') : name; }
