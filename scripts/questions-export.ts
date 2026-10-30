// Writes the verified questions of the local database to content/questions/.
// Usage: npm run questions:export
import { openCoachDb } from "../src/coach/db.ts";
import { exportQuestionBank } from "../src/coach/questions/question-bank.ts";

const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
// One JSON file per skill
const { skills, questions } = exportQuestionBank(db);
console.log(`Exported ${questions} verified questions for ${skills} skills to content/questions/.`);
