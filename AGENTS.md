# AGENTS.md

Study Coach is a [Flue](https://flueframework.com) project: agents are TypeScript functions. See `README.md` for what the app does and how to run it.

## Layout

- `src/agents/` — agent modules. A module whose first line is the `'use agent'` directive exports agents: every exported capitalized function is one, and the function name is its durable identity.
- `src/subagents/` — the area instructors the lead Coach delegates to.
- `src/tools/` — tools the agents call.
- `src/coach/` — the app's data layer and pure logic (skills and areas in `seed.ts`, instructors in `instructors.ts`, questions, answer checking, readiness, docs corpus).
- `src/app.ts` — the server: coach conversation routes and the JSON API.
- `src/db.ts` — the persistence adapter for durable conversations.
- `scripts/` — command-line jobs: docs sync, fact sheets, question generation.
- `web/` — the React web app (Vite).
- `content/fact-sheets/` — committed fact sheets, one per skill.
- `test/` — unit tests; live-model evals are in `src/evals/`.

## Commands

- `npm test` — unit tests, no model calls.
- `npm run check:types` — typecheck the server and the web app.
- `npm run dev` — run the app at http://127.0.0.1:5173.
- `npm run evals -- --maxConcurrency 2` — live-model checks of the coach (needs an API key in `.env`).
- `npx flue run src/agents/<agent>.ts --message "Hi"` — run an agent locally, no server.
- `npx flue docs search <query>` — search the Flue docs from the terminal (then `flue docs read <path>`).

## Conventions

- Run `npm test` and `npm run check:types` before every commit.
- Keep exam-specific facts (areas, skills, instructors, documentation pages) in data, not in prompts or code paths, so other certifications can be added later.
- Fact sheets and questions must be original wording, every fact linked to its Microsoft Learn page; never copy text from books, exam dumps or third-party question sites.
- Never commit secrets or local data: `.env` and `data/` are git-ignored; `.env.sample` documents the settings.
