# HUMAN ROVER — What living on Mars does to the human body

NASA Space Apps 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*
Also our Data Structures final project.

**▶ Try it live: [human-rover.netlify.app](https://human-rover.netlify.app/)** (works best on a laptop or desktop, with sound on)

**In 30 seconds:** on Mars, a message to the doctor on Earth can take up to 22 minutes each way, so astronauts must
check their own health. HUMAN ROVER is an educational simulation with game elements: you live a 36-month mission to
Mars with Laika as your guide, log your health every month, check symptoms on a 3D body, and learn what NASA knows
about each risk at each stage of the trip.

An educational experience about a 36-month crewed mission to Mars, focused on **life on Mars**.
It has two modes, both on the same 3D body:

1. **Learn:** pick a month and a body part, and Laika explains what NASA has learned on long
   space station missions, or expects for Mars, with the NASA source. Lessons follow NASA's
   5 hazards of human spaceflight (radiation, isolation, distance, gravity, closed environment).
2. **Check yourself:** practice the self-check astronauts will need on Mars, where a message to
   Earth takes up to about 22 minutes each way. The result is green / yellow / red and says
   when to contact the crew or flight surgeons. How likely each cause is depends on **when**
   in the mission you are.

> No human has lived on Mars yet. This is an educational experience and self-check practice,
> **not a medical diagnosis**.

## Assumptions and limits

- **Not a medical device.** Green / yellow / red use demo limits (temperature ±0.5 °C / ±1.5 °C, sleep 1 h / 3 h less,
  others 15% / 30% change from your Earth baseline). NASA does not publish these limits; in a real mission flight
  surgeons would set them for each astronaut. The app says this on screen.
- **No human has lived on Mars yet.** Lessons are labeled `iss` (learned on the space station), `expected` (what NASA
  expects for Mars) or `fact` (measured Mars facts).
- The Earth baseline starts with example values until the player enters their own (Menu › My Earth baseline).
- "Show an example mission" in Trends draws made-up months as hollow dots; they are never saved as real check-ins.
- Values are typed in by the astronaut; real sensors would be the next step.
- Women-specific content is used only where NASA has data (one lesson, NTRS 20040088708).
- Progress is saved in the browser (localStorage), so it stays on that device and browser.

## Backup

If the live site or the connection fails during the presentation: `npm install && npm run dev` runs it offline from
this repo, and the demo video is the second backup.

## Run it

```bash
npm install
npm run dev      # opens the app at http://localhost:5173
npm test         # runs the data-structure and engine tests (no extra packages needed)
```

## Folders

| Folder | What's inside | Who |
|---|---|---|
| `src/ds/` | Our own data structures (no libraries) | Data / engine |
| `src/engine/` | The engine: mission clock, ranking, decision trees | Data / engine |
| `src/data/` | JSON data from NASA sources (stages, risks, symptoms, questions, body parts) | Data |
| `src/three/` | 3D body viewer (React Three Fiber) | Frontend |
| `src/ui/screens/` | Screens (Mission Control, Body Scan, …) | Frontend |
| `public/models/` | `body.glb` from Blender | Frontend |
| `public/media/` | Backgrounds, launch video | Frontend |
| `tests/` | `node:test` tests | Everyone |

## Data structures (rubric)

| Structure | Used for | Main operations | Complexity |
|---|---|---|---|
| **Decision tree** (non-linear, central) | Symptom questions → result | `traverse` root → leaf | O(h) time, O(n) space |
| **Max-heap** (non-linear) | Rank possible causes this month; order alerts by urgency; pick the top 3 Learn topics of a month | `insert`, `extract` | O(log n) |
| Queue | Monthly tasks; reports waiting to be sent to Earth (FIFO) | `enqueue`, `dequeue` | O(1) |
| Stack | Screen navigation (Back) | `push`, `pop` | O(1) |
| Sorted array | Diary by month and Learn lessons by month, binary search | `insert` O(n), `findByKey` / `upTo` O(log n + k) | O(n) space |

**Save and load.** After every change the engine is saved in the browser (`localStorage`), so a page refresh keeps the mission.
`snapshot()` turns each structure into a plain array: O(n). `restore()` rebuilds them by inserting again:
heap and sorted array O(n log n), queues O(n).

**What if we swapped them?** A plain list instead of the heap would need O(n) to find the most urgent alert each time.
A long `if/else` instead of the tree can't be edited as data and is not a structure we can traverse or measure.

## What the challenge asked for, and where it is

| Challenge suggestion | In HUMAN ROVER |
|---|---|
| Insights for different environments | The month slider moves through 4 stages (trip to Mars, Mars base, trip home, Earth). Lessons, likely causes, tasks, music and backgrounds change with the stage |
| Measurements and actions as part of the routine | "Today" task queue every month (check-in, exercise, diary / report, balance check) |
| Gamification | XP, check-in streak, lessons learned, mission patches, "Mission complete" screen |
| Dynamic charts | Trends: sleep, resting heart rate and mood over the 36 months, with your Earth baseline |
| Color coding | Green / yellow / red in the check-in, self-check, alerts and body systems |
| Simple instructions and explanations | Every measurement says *how* to take it; every result says what to do and links the NASA source; Laika explains each screen |

## Tests

`npm test` runs 27 tests (Node's built-in runner): every structure, their edge cases (empty heap, empty queue,
month outside 1–36, empty diary entry, broken save…) and the engine rules (40 °C is red, red flags skip the tree,
demo months are added only once, a saved mission loads back the same).

## How an assessment works

1. `getStage(month)` → stage (first month, journey, Mars, return, Earth).
2. Each possible cause gets a **score** = stage weight (1–3) + check-in variation + "ongoing" bonus.
3. The **max-heap** ranks causes; the top one answers the tree's first question (`topCause`).
4. The **decision tree** asks the remaining questions and reaches a leaf (result + NASA source).
5. Rules: red-flag symptoms → red immediately; *Severe* raises yellow → red; *Ongoing* raises green → yellow.
6. Non-green results → alerts heap · red → reports queue · everything → diary.

Example: the same headache in month 1 → *"Your body is adapting"* (vestibular);
in month 32 → eye/brain change (SANS) questions.

## The contract (what the screens call)

`engine.getStage()` · `setMonth(m)` · `saveCheckin(values)` · `getBodyAreas(meshNames)` ·
`assess({ symptomIds, answers, commit })` · `getAlerts()` / `resolveTopAlert()` · `getTasks()` / `finishTask(id)` ·
`getOutbox()` / `sendOldestReport()` · `addDiary(text, month)` / `searchDiary(month)` · `getLessons()` / `getTopTopics()` ·
`logExercise()` · `getStats()` · `isMissionDone()` · `snapshot()` / `restore(save)`

## Adding data

Follow the **Symptom Data Guide** doc. Every leaf needs `color`, `title`, `cause`, `action` and a NASA `source` link.
Paraphrase NASA text, don't copy it. Don't invent medical limits; the check-in limits in
`createEngine.js` are **demo placeholders** and are labeled as such.

## 3D model

Export from Blender as `public/models/body.glb`. Each body part must be a **separate object** named exactly like
`src/data/body-parts.json` (`head`, `chest`, `arm_L`, `knee_R`, …). Until the file exists, the app shows a simple
placeholder body with the same names.

## Learn data

`src/data/lessons.json`: one lesson per NASA hazard and moment of the mission, each with a NASA link and a `basis`
(`iss` = learned on the space station, `expected` = what NASA expects for Mars, `fact` = measured Mars fact).
`engine.getLessons({ month, area })` finds them with binary search; `engine.getTopTopics(month)` ranks them with the max-heap.

## Credits

- NASA Human Research Program risk pages (linked in each data record).
- Question format inspired by DDXPlus (Fansi Tchango et al., 2022, CC-BY 4.0). We use only its evidence format, not its diseases.
- Women's data: NASA Technical Reports Server 20040088708 (standing up after flight). Exercise devices: NTRS 20170011470.
- Sounds and music: see `public/media/sound/CREDITS.md` (Kenney CC0 and Pixabay Content License).
- 3D body models: Innerscene, "Human Base Mesh with Editable 53-Bone Rig" and "Female Base Mesh 3D Person Rigged A-Pose", built from MakeHuman assets. License: CC0 (public domain). We cut them into clickable body parts in Blender.
- Launch and Mars videos: generated with Dreamina (AI video).
- No NASA logo is used.
