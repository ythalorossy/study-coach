# Contributing

Thanks for helping. This project is built with AI coding agents (Claude Code, Codex, Cursor and similar), and you're welcome to work the same way. Each recipe below is written as numbered steps, with a "done when" check, so a person or an agent can follow it. Agents also read [AGENTS.md](AGENTS.md), which holds the project's rules.

## Ways to help

| What | Needs | Where to start |
|---|---|---|
| Review questions and fact sheets against Microsoft Learn | no API key | [Review a skill](#review-a-skill) |
| Fix a wrong or unclear question | no API key | [Fix a question](#fix-a-question) |
| Fill or rewrite a skill's questions | API key, model quota | [Generate questions for a skill](#generate-questions-for-a-skill) |
| Add an area (for a future exam) | API key, model quota | [Add an area](#add-an-area) |
| Add another exam | not possible yet | [Other exams](#other-exams) |

Reviewing is the most useful contribution: all 1,639 questions are written and checked by AI agents, and only a few skills carry `"reviewed": true`. Nobody with Azure expertise has reviewed the bank yet.

## Set up

1. `npm install`
2. `cp .env.sample .env`. Add an API key only if you'll run the model steps; see [Choose models](README.md#choose-models).
3. `npm run db:setup`, then `npm run dev` and open http://127.0.0.1:5173.

[scripts/README.md](scripts/README.md) lists every command, what it needs and what it writes, and shows how they fit together.

## Ground rules

- **Original wording only.** Fact sheets and questions are written in our own words, and every fact links to its Microsoft Learn page. Never copy from books, exam dumps or third-party question sites.
- **Exam facts live in data**, never in prompts or code paths: areas and skills in `src/coach/exam/seed.ts`, instructors in `src/coach/exam/instructors.ts`.
- **`reviewed: true` means the facts were checked against the linked Learn pages and the maintainer approved the evidence.** So far that check is done by an AI agent, not by an Azure specialist; if you are one and you check more, say so in your pull request.
- **Model steps cost money.** `docs:sheets`, `docs:review`, `generate` and `evals` use your own API quota. `generate` prints an estimated cost at the end of a run.
- **Before every commit:** `npm test` and `npm run check:types`. For content changes, also `npm run questions:lint`.
- **Never commit** `.env` or anything in `data/`.

## Working with an AI agent

Point your agent at this file and name the recipe, for example: "Follow CONTRIBUTING.md, Review a skill, for storage.blob-tiers." The agent should:

- ask before running `docs:sheets`, `docs:review`, `generate` or `evals`, because they spend your quota;
- never set `reviewed: true` without showing you the evidence (each claim next to the page text) and getting your approval;
- keep the diff to what the recipe names, and show you the diff before committing;
- stop at "done when" and report, rather than going on to the next thing.

## Recipes

### Review a skill

1. `npm run review:sheet -- --skill <id>` writes `data/review/<id>.md`: the fact sheet next to sample questions (`--count <n>` for more).
2. Check each fact and each answer against the Learn pages they link. The question file is `content/questions/<id>.json`.
3. Fix what's wrong ([Fix a question](#fix-a-question)), or correct the fact sheet in `content/fact-sheets/<id>.md`.
4. `npm run questions:review -- --skill <id>` marks the skill's questions reviewed. Add `--id <questionId>` to mark only the ones you checked.

**Done when:** the diff touches only `content/`, `npm run questions:lint` shows nothing new for the skill, and your PR says which pages you checked.

### Fix a question

1. Edit the question in `content/questions/<skill>.json`. Keep its `id`. If the fix changes the answer, update `key` and `explanation` too.
2. Run `npm run questions:lint -- --skill <skill>`.
3. To see the change in the app, rebuild your local database with `npm run db:setup -- --reset`. Your progress is backed up to `data/coach.db.bak-<time>` and starts again. The app only loads the bank into an empty database.

**Done when:** lint is clean for the skill, and the PR says what was wrong and which Learn page shows it.

### Generate questions for a skill

Use this when a skill is under its target of 8 multiple-choice, 6 drag-drop and 6 complete-sentence questions, for example after removing bad ones.

1. Make sure the skill's fact sheet is current: `npm run docs:sync` lists stale sheets, and `npm run docs:sheets -- --skill <id>` rebuilds one.
2. `npm run generate -- --skill <id> --until-target`. Only questions that pass the checks and the verifier are saved to your `data/coach.db`.
3. `npm run questions:export` writes the bank files.
4. Check `git diff content/questions/`. Export writes everything verified in your database, so questions you flagged in the app drop out of the files. Keep that only if it's what you meant.
5. `npm run questions:lint -- --skill <id>`

**Done when:** the skill's file has its new questions, all `reviewed: false`, the lint is clean, and the diff touches only that skill's file.

### Add an area

All five AZ-104 areas are built, so this recipe now applies to a new exam's areas once the multi-exam work lands (see [Other exams](#other-exams)), or to restructuring an existing area. The networking and monitoring areas were the last built this way; their skills in `seed.ts` and instructors in `instructors.ts` are the examples to follow.

1. **Skills.** Add the area's skills to `SKILLS` in `src/coach/exam/seed.ts`, from the [AZ-104 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104). Each skill needs an id prefixed with the area (`networking.vnet-peering`), its instructor, a name, and the Learn pages that teach it.
2. **Instructors.** Add the area's specialists to `SPECIALISTS` in `src/coach/exam/instructors.ts`, the same list in `web/src/lib/instructors.ts` (a test checks they match), and a `--c-<id>` colour for each in `web/src/styles.css`.
3. **Tests.** Add the area to `test/coach/seed.test.ts`, like the other areas. Run `npm test` and `npm run check:types`.
4. **Links.** `npm run check:doc-urls` must pass.
5. **Fact sheets.** `npm run docs:sync`, then `npm run docs:sheets`, which builds only the missing sheets. Run `npm run docs:review -- --area <prefix>` over new sheets and fix what it flags (it varies between runs, so a clean result is not proof), then read them before going on: questions are written from these sheets.
6. **Questions.** `npm run generate -- --until-target`, then `npm run questions:export` and `npm run questions:lint`.
7. **Try it.** `npm run db:setup` adds the new skills to your database. Then teach yourself a lesson in the new area with `npm run dev`. To run the live checks: `EVAL_SWEEP_AREA=<area> npm run evals -- -t "area sweep" --maxConcurrency 2`
8. **Docs.** Update the Supported exams table in `README.md`.

**Done when:** every new skill has a fact sheet and 20 questions, the tests, typecheck, lint and link check pass, and the area shows as supported on Home. One PR per area, with the code and its content committed separately, is easiest to review.

### Other exams

The project aims to support other Microsoft certifications. Today the app is built for AZ-104 only: the exam name is written into the agent prompts, and the data has no exam level. The plan to change that is in [docs/multi-exam-design.md](docs/multi-exam-design.md). Until it lands, open an issue if you'd like to start on an exam, so we can line it up with that work.

## Pull requests

- Commit messages follow the existing style: `feat(content): …`, `fix(questions): …`, `docs(scripts): …`.
- Keep content (`content/`) and code in separate commits.
- Say which recipe you followed and anything you weren't sure about.
