// Browser entry: loads the data files (Vite imports JSON) and creates one engine for the app.
import stages from '../data/stages.json';
import risks from '../data/risks.json';
import symptoms from '../data/symptoms.json';
import bodyParts from '../data/body-parts.json';
import lessons from '../data/lessons.json';
import { createEngine } from './createEngine.js';

export const engine = createEngine({ stages, risks, symptoms, bodyParts, lessons });
