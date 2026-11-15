# AGENTS.md

Study Coach is a [Flue](https://flueframework.com) project: agents are TypeScript functions. See `README.md` for what the app does and how to run it.

## Layout

- `src/agents/` — agent modules. A module whose first line is the `'use agent'` directive exports agents: every exported capitalized function is one, and the function name is its durable identity.
- `src/subagents/` — the area instructors the lead Coach delegates to.
- `src/tools/` — tools the agents call.
- `src/coach/` — the app's data layer and pure logic: `db.ts` (schema and seeding), readiness, progress and the JSON API.
  - `exam/` — exam-specific data: areas and skills in `seed.ts`, instructors in `instructors.ts`, shared types.
  - `questions/` — question schema, answer checking, admission checks (leak, similarity), the bank and its lint, and the re-check of stored questions against a sheet (`reverify.ts`).
  - `docs/` — the docs corpus and its repo mapping (`corpus.ts`), Learn page fetching and rendering, fact sheets, and the fact check behind the reviewer (`fact-check.ts`).
- `src/app.ts` — the server: coach conversation routes and the JSON API.
- `src/db.ts` — the persistence adapter for durable conversations.
- `scripts/` — command-line jobs: database setup, docs sync, fact sheets, question generation and review. `scripts/README.md` maps them all.
- `web/` — the React web app (Vite).
- `content/fact-sheets/` — committed fact sheets, one per skill.
- `content/questions/` — the committed question bank, one JSON file per skill, loaded for any skill that has no questions (`src/coach/questions/question-bank.ts`).
- `test/` — unit tests; live-model evals are in `src/evals/`.

## Commands

- `npm test` — unit tests, no model calls.
- `npm run check:types` — typecheck the server and the web app.
- `npm run db:setup` — create `data/coach.db` from the committed bank (`-- --reset` backs it up and rebuilds it).
- `npm run dev` — run the app at http://127.0.0.1:5173.
- `npm run evals -- --maxConcurrency 2` — live-model checks of the coach (needs an API key in `.env`).
- `npx flue run src/agents/<agent>.ts --message "Hi"` — run an agent locally, no server.
- `npx flue docs search <query>` — search the Flue docs from the terminal (then `flue docs read <path>`).

## Contributing recipes

Task recipes (review a skill, fix a question, generate questions, add an area) are numbered steps with a "done when" check in `CONTRIBUTING.md`. Follow the matching recipe rather than improvising. In particular:

- Ask before running `docs:sheets`, `docs:review`, `questions:reverify`, `generate` or `evals`: they spend the contributor's model quota.
- `reviewed: true` means an AI agent compared the skill's facts with the linked Learn pages and the maintainer approved the evidence (claim next to page text). Never set it without showing that evidence and getting the maintainer's approval.
- Stop at the recipe's "done when" and report; show the diff before committing.
- Only AZ-104 is supported; the multi-exam plan is `docs/multi-exam-design.md`.

## Conventions

- Run `npm test` and `npm run check:types` before every commit.
- Keep exam-specific facts (areas, skills, instructors, documentation pages) in data, not in prompts or code paths, so other certifications can be added later.
- Fact sheets and questions must be original wording, every fact linked to its Microsoft Learn page; never copy text from books, exam dumps or third-party question sites.
- Questions are edited in `content/questions/*.json` and carry a `reviewed` flag; set it only as described above, after checking against the linked Learn pages.
- Every script starts with the standard header (what it does, usage and flags, reads, writes, needs) shown in `scripts/README.md`; a new script also gets a row in that file's table.
- Never commit secrets or local data: `.env` and `data/` are git-ignored; `.env.sample` documents the settings.
- Never rebuild fact sheets in bulk. Sheets are corrected by hand after review, and `docs:sheets` replaces the whole file; "stale" usually means Microsoft edited a page, not that the sheet is wrong. Rebuild one skill at a time (`--skill <id>`), read the diff, and then run `npm run questions:reverify -- --skill <id>`, because its questions were verified against the old sheet.
- After correcting a fact sheet by hand, run `questions:reverify` on that skill for the same reason, and flag a question whose key the corrected sheet no longer supports rather than rewriting its explanation.
- An edit to `content/questions/*.json` does not reach a database that already has that skill's questions; the bank is imported only for skills with none. Use `npm run db:setup -- --reset` to see the edit locally.
- Each skill links 2 to 5 Learn pages (a test enforces it). A page in a Microsoft repository the sync doesn't know needs a `PRODUCTS` entry in `src/coach/docs/corpus.ts`, then `npm run docs:sync`; `npm run check:doc-urls` must pass after any link change.
- Explanations must never refer to a choice by letter or position; choices are shuffled at delivery, and `questions:lint` flags it.
