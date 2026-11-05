# Study Coach

A local study coach for Microsoft certification exams, starting with AZ-104, built with [Flue](https://flueframework.com). Each exam area has its own team of instructors under one lead: they teach each skill with a scenario and a whiteboard diagram, then you practice with original questions checked against Microsoft Learn. The Docs screen shows each skill's fact sheet and its Microsoft documentation pages.

## Supported exams

**[AZ-104: Microsoft Azure Administrator](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104)**: 4 of its 5 areas are supported, about 70–90% of the exam by weight.

| Exam area | Weight | Status | Skills | Instructors |
|---|---|---|---|---|
| Manage Azure identities and governance | 20–25% | Supported | 15 | Identity, Access, Governance |
| Implement and manage storage | 15–20% | Supported | 17 | Storage security, Storage accounts, Files and blobs |
| Deploy and manage Azure compute resources | 20–25% | Supported | 24 | Templates, Virtual machines, Containers, App Service |
| Implement and manage virtual networking | 15–20% | Supported | 13 | Virtual networks, Network security, DNS and load balancing |
| Monitor and maintain Azure resources | 10–15% | Planned | — | — |

Every supported skill has a fact sheet in `content/fact-sheets/` and a bank of up to 20 questions in `content/questions/` (1,380 in all). Planned areas appear on Home as coming later. Other Microsoft certifications may follow; see [CONTRIBUTING.md](CONTRIBUTING.md) to help.

## The agents

| Agent | Runs | What it does |
|---|---|---|
| Coach, the lead instructor (`src/agents/coach.ts`) | in every lesson, in the Room screen | Picks the skill when you let the lead choose (staying in that area), and moves the lesson through intro, scenario, check and done. It speaks, draws the whiteboard diagram and hands the scenario to the skill's instructor. Then it presents a check question from the bank and waits for your answer. A wrong answer gets the instructor's explanation and one follow-up question. |
| Area instructors (`src/subagents/specialists.ts`) | when the lead hands over | One per instructor: Identity, Access and Governance; Storage security, Storage accounts, and Files and blobs; Templates, Virtual machines, Containers and App Service; Virtual networks, Network security, and DNS and load balancing. Each explains its skills with a fictional company scenario in at most 150 words, checking facts against its Learn pages. They stay idle while a question waits for your answer. |
| Question writer (`src/agents/question-writer.ts`) | `npm run generate`, one run per question | Writes one original question for a skill and format from the skill's fact sheet. Before saving, it checks the question's shape and cited pages, and that it neither gives the answer away nor repeats another question. |
| Verifier | inside each question writer run | A separate model call that answers the new question from the fact sheet alone, without the key. The question is saved only if its answer matches. |
| Fact-sheet writer (`src/agents/fact-sheet-writer.ts`) | `npm run docs:sheets` | Reads a skill's downloaded Microsoft pages and writes its fact sheet in original wording, every fact linked to its page. A sheet that is too long, has too few linked facts or copies Microsoft's wording is sent back. |
| Assistant (`src/agents/assistant.ts`) | not used | The starter agent from the Flue project template, still served at `/agents/assistant`. |

## Requirements

- Node.js 22.18 or later (the scripts run TypeScript directly and use `node:sqlite`).
- An API key for a model provider. Every role defaults to `minimax/MiniMax-M3`; see [Choose models](#choose-models) to use another provider.
- Git, for `npm run docs:sync`.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy the sample settings and add your API key (`.env` is git-ignored):

   ```sh
   cp .env.sample .env
   ```

3. Create the local database. This loads the committed question bank (`content/questions/`; see [Question bank](#question-bank)) into `data/coach.db`, which also holds your progress and stays on your machine. The app does the same on its first start if you skip this step.

   ```sh
   npm run db:setup
   ```

   To start over, stop the app and run `npm run db:setup -- --reset`. It saves the old database as `data/coach.db.bak-<time>` and builds a new one from the bank.

4. Start the app with `npm run dev` (see [Study](#study)). To read the source docs or fill gaps in the bank, see [Read the docs](#read-the-docs) and [Generate questions](#generate-questions).

## Choose models

Every agent runs on `minimax/MiniMax-M3` unless you pick another model in `.env`. Each role has its own setting, written as `provider/model`:

| Setting | Role | When unset |
|---|---|---|
| `COACH_MODEL` | lead instructor | MiniMax |
| `SPECIALIST_MODEL` | area instructors | same as `COACH_MODEL` |
| `WRITER_MODEL` | question writer (`npm run generate`) | MiniMax |
| `VERIFIER_MODEL` | blind re-answer of each new question | same as `WRITER_MODEL` |
| `FACT_SHEET_MODEL` | fact-sheet writer (`npm run docs:sheets`) | same as `WRITER_MODEL` |
| `REVIEWER_MODEL` | fact-sheet reviewer (`npm run docs:review`) | same as `WRITER_MODEL` |

Add the provider's key next to it. For example, `ANTHROPIC_API_KEY` for `anthropic/...`, `OPENAI_API_KEY` for `openai/...`, `GEMINI_API_KEY` for `google/...` or `OPENROUTER_API_KEY` for `openrouter/...`:

```sh
WRITER_MODEL=minimax/MiniMax-M3
VERIFIER_MODEL=anthropic/claude-sonnet-5-5
ANTHROPIC_API_KEY=your-key-here
```

A verifier on a different model from the writer catches more wrong answer keys. After switching the coach to a new model, run `npm run evals` once to confirm the lessons still behave.

## Study

```sh
npm run dev
```

Then open http://127.0.0.1:5173. Both servers listen on 127.0.0.1 only: the page on port 5173 and the coach API on 8787. Stop them with Ctrl+C.

Home lists every exam area with its weight and its own Ready badge; the top shows how many areas are ready. An area is "Ready" when every skill in it scores at least 80% over your recent answers: a study rule of thumb, not Microsoft's scaled score. "Let the lead choose" in an area starts a lesson on that area's weakest untaught skill.

## Read the docs

```sh
npm run docs:sync
```

This downloads the Markdown of the Microsoft documentation the skills use, from [MicrosoftDocs/azure-docs](https://github.com/MicrosoftDocs/azure-docs), [MicrosoftDocs/azure-monitor-docs](https://github.com/MicrosoftDocs/azure-monitor-docs) and [MicrosoftDocs/entra-docs](https://github.com/MicrosoftDocs/entra-docs), into `data/docs/` (about 100 MB, no images). Rerun it to pick up Microsoft's updates. The azure-docs and azure-monitor-docs content is licensed CC BY 4.0 and the entra-docs content MIT; each page in the Docs screen names its source and license. A few skill pages live in other Microsoft repositories; the app reads those live from Learn.

To check that every Learn page the skills link to still loads, run `npm run check:doc-urls`. It lists the failures and exits with an error if any link is dead.

```sh
npm run docs:sheets
```

This writes a fact sheet per skill into `content/fact-sheets/`: the settings, limits, comparisons and which-one-to-use points the exam tests, in original wording, every fact linked to its Learn page. It builds only the sheets that are missing or whose source pages changed since the last sync; `--skill <id>` builds one, `--all` rebuilds every sheet, and `--parallel <n>` sets how many run at once. The sheets are committed, so a rebuild shows up as a diff you can review. `npm run docs:sync` lists which sheets are out of date.

```sh
npm run docs:review -- --skill identity.sspr   # or --area <prefix>, --all
```

A reviewer agent (`src/agents/fact-sheet-reviewer.ts`) checks each bullet of a sheet against the Learn page it links to and writes the ones that look wrong, with the page's own text as evidence, to `data/review/fact-check/<skill>.md`. Set `REVIEWER_MODEL` to a different model from `WRITER_MODEL` for a more independent check. It narrows a person's review and does not replace it: it can miss errors, and it never marks anything reviewed.

Open the Docs screen to read a skill's fact sheet and its source pages. Links between downloaded pages stay in the app; other links open on Microsoft Learn.

## Generate questions

```sh
npm run generate -- --until-target
```

This fills the question bank to 8 multiple-choice, 6 drag-drop and 6 complete-sentence questions per skill. Each question is written in its own short conversation from the skill's fact sheet, and several skills are written at once: 6 by default, set with `--parallel <n>` or the `GENERATE_PARALLEL` environment variable. If the provider answers "too many requests", the run halves its parallelism and carries on, and the summary says so. A skill without a fact sheet is written from its Learn pages. You can stop and restart it at any time: it picks up from the questions already saved. Each question is kept only if an independent verifier answers it correctly from the fact sheet (or the cited pages) alone. Every result is logged to `data/generate-log.jsonl`, and the summary shows the time taken, questions per hour and each rejection reason's share of attempts.

A question that runs longer than 10 minutes (`--question-timeout <minutes>`), or whose model reply ends in an error, is stopped and retried once with `minimax/MiniMax-M3` (`--fallback-model <provider/model>`); the verifier stays the same. The summary counts these retries per skill, and ends with the tokens each model used and their estimated cost, in total and per saved question (every model call is logged to `data/generate-usage.jsonl`).

To fill one skill or format: `npm run generate -- --skill identity.sspr --format drag-drop`. The Coverage page shows how full the bank is.

To compare runs, `npm run generate:stats -- --area storage` prints an area's attempts, the share of each rejection reason and the share of its questions you flagged, read from `data/generate-log.jsonl` and `data/coach.db`.

## Question bank

The verified questions are committed as one JSON file per skill in `content/questions/`, so a fresh clone can study straight away. When `data/coach.db` is created and has no questions, `npm run db:setup` or the app loads them; a database that already has questions is left alone. Flagged questions are not included.

Every question carries `"reviewed": false` until a person has checked it, and the fact sheet it came from, against the linked Learn pages. Questions are written and verified by models, so treat unreviewed ones as unofficial practice material that can contain mistakes. These are original questions, not real exam items.

```sh
npm run review:sheet -- --skill storage.explorer-azcopy   # fact sheet + sample questions in data/review/ (--area <prefix>, --all, --count <n>)
npm run questions:lint   # structural checks over the whole bank (no model): missing exhibits, sources the fact sheet doesn't link, key-position skew
npm run questions:review -- --skill storage.explorer-azcopy   # mark a skill's questions reviewed (--id <q>, --undo)
npm run questions:export   # rewrite content/questions/ from your local database
```

To fix a question, edit its JSON file and open a pull request; the diff shows exactly what changed. Importing validates every question and skips invalid ones with a message.

## Tests and evals

```sh
npm test              # unit tests, no model calls
npm run check:types   # typecheck
npm run evals -- --maxConcurrency 2   # live-model checks of the coach (uses your key; results vary a little between runs)
EVAL_SWEEP_AREA=compute npm run evals -- -t "area sweep" --maxConcurrency 2   # one live lesson per skill of an area
```

## Back up

Everything you have done (questions, attempts, sessions and conversations) lives in `data/`. Stop `npm run dev` and any generation run first, then copy the folder:

```sh
cp -r data data-backup-$(date +%F)
```

The database runs in WAL mode, so `coach.db-wal` and `coach.db-shm` sit next to `coach.db`; copying the whole `data/` folder takes them along. Copy all three together, never `coach.db` alone.

To restore, stop the servers and copy the backup back to `data/`.

## Project layout

| Path | What it holds |
|---|---|
| `src/agents/` | Flue agents: the lead Coach, the question writer, the fact-sheet writer and the fact-sheet reviewer |
| `src/subagents/` | The area instructors the lead hands lessons to |
| `src/tools/` | Tools the agents call (lesson state, questions, Microsoft docs) |
| `src/coach/` | The app's data layer and logic: skills and areas, questions, answer checking, readiness, docs corpus |
| `src/app.ts` | The server: coach conversation routes and the JSON API |
| `scripts/` | Command-line jobs: database setup, docs sync, fact sheets, question generation and review; see [scripts/README.md](scripts/README.md) |
| `web/` | The React web app |
| `content/fact-sheets/` | One committed fact sheet per skill |
| `content/questions/` | The committed question bank, one JSON file per skill |
| `architecture-docs/` | C4 diagrams and an architecture report |
| `test/` | Unit tests; live-model evals are in `src/evals/` |

## License

The code is released under the [MIT License](LICENSE).

The fact sheets in `content/fact-sheets/` are original summaries of Microsoft Learn documentation, and every fact links to its source page. The source documentation belongs to Microsoft: [azure-docs](https://github.com/MicrosoftDocs/azure-docs) and [azure-monitor-docs](https://github.com/MicrosoftDocs/azure-monitor-docs) are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and [entra-docs](https://github.com/MicrosoftDocs/entra-docs) is licensed MIT. This project is not affiliated with or endorsed by Microsoft. Microsoft, Azure and AZ-104 are trademarks of Microsoft Corporation.
