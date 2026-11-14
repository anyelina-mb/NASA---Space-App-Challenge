# HUMAN ROVER — What living on Mars does to the human body

NASA Space Apps 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*
Also our Data Structures final project.

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

**What if we swapped them?** A plain list instead of the heap would need O(n) to find the most urgent alert each time.
A long `if/else` instead of the tree can't be edited as data and is not a structure we can traverse or measure.

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

`engine.getStage()` · `advanceMonth()` · `saveCheckin(values)` · `getBodyAreas(meshNames)` ·
`assess({ symptomIds, answers })` · `getAlerts()` · `nextTask()` / `completeTask()` ·
`getOutbox()` / `sendOldestReport()` · `searchDiary(month)`

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
- No NASA logo is used.
