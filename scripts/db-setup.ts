// Creates the local database from the committed exam data and question bank.
// Running it again keeps your questions and progress, and only adds new areas and skills.
//
// Usage: npm run db:setup [-- --reset]
//   --reset  back up the current database to <path>.bak-<time>, then build a new one (stop `npm run dev` first)
//
// Reads:  src/coach/exam/seed.ts (areas, skills), content/questions/*.json
// Writes: data/coach.db (COACH_DB_PATH)
// Needs:  nothing (no API key, no network)
import { existsSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import { openCoachDb } from "../src/coach/db.ts";

const { values } = parseArgs({ options: { reset: { type: "boolean" } } });
const path = process.env.COACH_DB_PATH ?? "./data/coach.db";

if (values.reset && existsSync(path)) {
	// VACUUM INTO writes one self-contained copy, including anything still in the WAL file
	const backup = `${path}.bak-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
	const old = new DatabaseSync(path);
	old.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
	old.close();
	// Remove the database and its WAL companions so the next open starts empty
	for (const file of [path, `${path}-wal`, `${path}-shm`]) rmSync(file, { force: true });
	console.log(`Backed up the old database to ${backup}`);
}

const existed = existsSync(path);
// Creates the file if missing, adds any new areas and skills, and loads the bank when there are no questions
const db = openCoachDb(path);
const count = (table: string) => (db.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
console.log(`${existed ? "Updated" : "Created"} ${path}: ${count("skills")} skills, ${count("questions")} questions.`);
if (existed) console.log("Existing questions and progress were kept; run with --reset to start over.");
db.raw.close();
