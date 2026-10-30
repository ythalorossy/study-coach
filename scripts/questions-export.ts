// Writes the verified questions of the local database to content/questions/,
// one JSON file per skill. A question keeps its `reviewed` mark from the file it replaces.
//
// Usage: npm run questions:export   (no flags)
//
// Reads:  data/coach.db (COACH_DB_PATH), the current content/questions/*.json for `reviewed` marks
// Writes: content/questions/<skill>.json (committed)
// Needs:  nothing (no API key, no network)
import { openCoachDb } from "../src/coach/db.ts";
import { exportQuestionBank } from "../src/coach/questions/question-bank.ts";

const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
// One JSON file per skill
const { skills, questions } = exportQuestionBank(db);
console.log(`Exported ${questions} verified questions for ${skills} skills to content/questions/.`);
