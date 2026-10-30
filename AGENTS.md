# AGENTS.md

Study Coach is a [Flue](https://flueframework.com) project: agents are TypeScript functions. See `README.md` for what the app does and how to run it.

## Layout

- `src/agents/` — agent modules. A module whose first line is the `'use agent'` directive exports agents: every exported capitalized function is one, and the function name is its durable identity.
- `src/subagents/` — the area instructors the lead Coach delegates to.
- `src/tools/` — tools the agents call.
- `src/coach/` — the app's data layer and pure logic: `db.ts` (schema and seeding), readiness, progress and the JSON API.
  - `exam/` — exam-specific data: areas and skills in `seed.ts`, instructors in `instructors.ts`, shared types.
  - `questions/` — question schema, answer checking, admission checks (leak, similarity), the bank and its lint.
  - `docs/` — the docs corpus, Learn page fetching and rendering, fact sheets.
- `src/app.ts` — the server: coach conversation routes and the JSON API.
- `src/db.ts` — the persistence adapter for durable conversations.
- `scripts/` — command-line jobs: database setup, docs sync, fact sheets, question generation and review. `scripts/README.md` maps them all.
- `web/` — the React web app (Vite).
- `content/fact-sheets/` — committed fact sheets, one per skill.
- `content/questions/` — the committed question bank, one JSON file per skill, loaded on first run (`src/coach/questions/question-bank.ts`).
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

- Ask before running `docs:sheets`, `generate` or `evals`: they spend the contributor's model quota.
- Never set `reviewed: true` on a question yourself; only a person who checked the Learn pages does.
- Stop at the recipe's "done when" and report; show the diff before committing.
- Only AZ-104 is supported; the multi-exam plan is `docs/multi-exam-design.md`.

## Conventions

- Run `npm test` and `npm run check:types` before every commit.
- Keep exam-specific facts (areas, skills, instructors, documentation pages) in data, not in prompts or code paths, so other certifications can be added later.
- Fact sheets and questions must be original wording, every fact linked to its Microsoft Learn page; never copy text from books, exam dumps or third-party question sites.
- Questions are edited in `content/questions/*.json` and carry a `reviewed` flag; set it only after checking against the linked Learn pages.
- Every script starts with the standard header (what it does, usage and flags, reads, writes, needs) shown in `scripts/README.md`; a new script also gets a row in that file's table.
- Never commit secrets or local data: `.env` and `data/` are git-ignored; `.env.sample` documents the settings.
