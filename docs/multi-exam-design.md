# Multi-exam support: design

Status: proposal, not started. Owner: Ythalo Saldanha.

## Why

Study Coach is meant to cover other Microsoft certifications later, and contributors should be able to add one. Today that takes code changes in a dozen places:

- **The exam name is written into prompts:** "AZ-104" appears in `src/agents/coach.ts`, `src/subagents/specialists.ts`, `src/agents/question-writer.ts` and `src/agents/fact-sheet-writer.ts`, and in the Home heading (`web/src/screens/Home.tsx`).
- **Exam data is TypeScript:** `src/coach/exam/seed.ts` (areas, skills, `GUIDE_VERSION`) and `src/coach/exam/instructors.ts` hold one exam. `SpecialistId` is a type built from that list, so the type system is tied to AZ-104's instructors.
- **The web keeps a second copy of the instructors** (`web/src/lib/instructors.ts`), plus one CSS colour per instructor id.
- **No exam level in paths:** `content/fact-sheets/`, `content/questions/` and `data/coach.db` assume a single exam.
- **The docs corpus knows two repositories** (`DocRepo = "azure-docs" | "entra-docs"` in `src/coach/docs/corpus.ts`). Other exams need other MicrosoftDocs repositories.

Goal: adding an exam is a pull request of **data and content only**, with no TypeScript changes, and an agent can do it by following a CONTRIBUTING recipe.

Out of scope: non-Microsoft exams. Microsoft Learn stays the only source, and the fact-sheet and question checks assume it.

## Design

### 1. One folder per exam

```
exams/
  az-104/
    exam.json         id, name, code, study-guide URL, guide version, doc repositories
    areas.json        id, name, weight range, position
    instructors.json  id, area, title, description, display name, initials, topic
    skills.json       id, instructor, name, Learn URLs
content/
  az-104/
    fact-sheets/<skill>.md
    questions/<skill>.json
```

- JSON, not TypeScript, so contributors and agents edit data without touching code, and a schema can check it.
- A loader (`src/coach/exam/load.ts`) reads `exams/<id>/`, validates it with valibot (already a dependency), and returns an `Exam` object. The current `AREAS`, `SKILLS` and `SPECIALISTS` exports become fields of that object.
- Checks done at load time and in a test that runs over every `exams/*/`:
  - ids are unique;
  - every skill names a known instructor, and every instructor a known area;
  - each skill id starts with its area prefix;
  - URLs are Learn URLs.
- `SpecialistId` becomes `string`, checked at load time instead of by the compiler. That's the price of keeping exam data out of code.

### 2. One database per exam

`data/<exam>/coach.db` instead of an `exam_id` column on every table.

- **No schema change.** Progress, attempts, sessions and flags stay separate per exam for free, and skill ids only need to be unique within an exam.
- `getCoachDb(examId)` keeps one open database per exam. `COACH_DB_PATH` still overrides it for tests and scripts.
- `flue.db` (conversations) stays shared. Conversation ids are already unique, and each session row in the exam's database points to its conversation.

### 3. Which exam is active

- The server reads `STUDY_EXAM` (default: the only exam, or `az-104`).
- The API gains `GET /api/exams` (the list, for a picker) and `GET /api/exam` (the active exam: name, areas and instructors). Every existing route stays per active exam.
- **Phase 4** adds an exam picker on Home. Routes then take the exam from the URL (`/api/exams/:id/...`) instead of the environment.

### 4. Prompts and UI take the exam from data

- Agent prompts get `exam.name` and `exam.code` from the loaded exam. Instructor descriptions already come from data.
- The web loads the instructors from `GET /api/exam` and drops `web/src/lib/instructors.ts`, which removes the copy and the test that keeps the two lists in sync.
- Instructor colours come from a fixed palette by position, instead of one `--c-<id>` token per instructor.

### 5. Scripts take `--exam`

Every script that touches exam data or content gets `--exam <id>`, defaulting like the server. Paths come from the exam: `content/<exam>/…`, `data/<exam>/…`. The docs corpus reads its repository list from `exam.json`, so `DocRepo` becomes a string, and `data/docs/` stays shared between exams.

### 6. Moving AZ-104 over

- `git mv` the fact sheets and questions into `content/az-104/`, and convert `seed.ts` and `instructors.ts` into `exams/az-104/*.json` with a one-off script. Skill ids, question ids and the guide version don't change.
- On first start, an existing `data/coach.db` is moved to `data/az-104/coach.db` together with its `-wal` and `-shm` files. Nothing is reseeded, and the learner keeps their progress. A test pins this.

## Phases

Each phase leaves the app working, and can be merged on its own.

1. **Exam data as JSON.** Add `exams/az-104/`, the loader and its validation test. `seed.ts` and `instructors.ts` become thin wrappers over the loader. No visible change.
2. **No hard-coded exam in prompts or UI.** Prompts and the Home heading take the name from data. The web gets its instructors from `GET /api/exam`, and colours come from the palette.
3. **Per-exam paths.** Move content to `content/az-104/` and the database to `data/az-104/`, with the move of existing files and a test for it. Add `--exam` to the scripts and the doc repositories to `exam.json`.
4. **Picker and docs.** Add `GET /api/exams`, the picker on Home, and URL-scoped routes. Add an "Add an exam" recipe to CONTRIBUTING.md, update the README's Supported exams section, and add an example exam skeleton (an `exams/_template/` folder that the validation test skips).

## Verification

- Every phase: `npm test`, `npm run check:types`, `npm run questions:lint`, and `npm run evals` once before merging phases 2 and 3, which change prompts and paths.
- Phase 3: open a copy of a real `data/` folder from before the change. Attempts, sessions, flags and readiness must be unchanged after the move.
- Phase 4: add a throwaway second exam with one area, one skill and a hand-written fact sheet, and check that the picker, lessons and practice keep the two exams apart.

## Open decisions

- **Exam picker now or later?** The plan defers it to phase 4. Phases 1–3 alone already let a contributor add an exam that runs with `STUDY_EXAM=<id>`.
- **JSON or TypeScript for exam data?** JSON is recommended above. TypeScript would keep compile-time ids but needs code review for every exam.
- **Where the question targets live.** `COVERAGE_TARGET` (8/6/6 per skill) stays global unless an exam needs different formats.
