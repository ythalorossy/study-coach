import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import * as v from "valibot";
import {
	makeListExistingTool,
	makeReadDocsTool,
	makeSaveQuestionTool,
	QuestionWriter,
	writerInstructions,
} from "../../src/agents/question-writer.ts";
import { buildVerifierPrompt } from "../../src/coach/questions/admit.ts";
import { openCoachDb } from "../../src/coach/db.ts";
import { mcCorrect, mcFixture } from "../coach/fixtures.ts";

describe("QuestionWriter agent statics", () => {
	it("is registered as question-writer", () => {
		expect(QuestionWriter.agentName).toBe("question-writer");
		expect(QuestionWriter.durability).toEqual({ timeoutMs: 1_800_000 });
	});
	it("accepts a skill, format and count", () => {
		const ok = { skillId: "identity.external-users", format: "drag-drop", count: 10 };
		expect(v.safeParse(QuestionWriter.initialData, ok).success).toBe(true);
	});
	it("rejects a count above 10", () => {
		const bad = { skillId: "identity.external-users", format: "multiple-choice", count: 11 };
		expect(v.safeParse(QuestionWriter.initialData, bad).success).toBe(false);
	});
	it("rejects an unknown format", () => {
		const bad = { skillId: "identity.external-users", format: "yes-no", count: 1 };
		expect(v.safeParse(QuestionWriter.initialData, bad).success).toBe(false);
	});
	it("starts its module with the use agent directive", () => {
		const src = readFileSync(new URL("../../src/agents/question-writer.ts", import.meta.url), "utf8");
		expect(src.split("\n")[0]).toBe("'use agent';");
	});
});

let runSeq = 0;

function setup(count: number, answer: unknown = mcCorrect, factSheet?: { skillId: string; body: string }) {
	const db = openCoachDb(":memory:");
	const runId = `gen-test-${++runSeq}`;
	const logPath = join(mkdtempSync(join(tmpdir(), "qw-")), "generate-log.jsonl");
	const state = { saved: 0, attempts: 0 };
	const fetchDoc = vi.fn(async (url: string) => ({ text: `doc for ${url}`, readAt: "2026-10-20T10:00:00.000Z" }));
	const tool = makeSaveQuestionTool({
		init: { skillId: "identity.external-users", format: "multiple-choice", count },
		runId,
		getDb: () => db,
		fetchDoc,
		totals: () => ({ ...state }),
		record(saved) {
			state.attempts++;
			if (saved) state.saved++;
			return { ...state };
		},
		logPath,
		factSheet,
	});
	const prompt = vi.fn(async (_text: string, _options: unknown): Promise<{ data: unknown }> => ({ data: answer }));
	const run = (data: unknown) =>
		tool.run({ data, harness: { prompt }, toolCallId: "t1", log: console } as never) as Promise<{
			output: Record<string, unknown>;
			terminate?: boolean;
		}>;
	const log = () =>
		readFileSync(logPath, "utf8")
			.trim()
			.split("\n")
			.map((l) => JSON.parse(l));
	const questions = () => (db.raw.prepare("SELECT COUNT(*) AS n FROM questions").get() as { n: number }).n;
	return { db, run, prompt, fetchDoc, log, questions, runId };
}

describe("save_question", () => {
	it("verifies with one isolated prompt that never contains the key or explanation", async () => {
		const { run, prompt } = setup(2);
		const r = await run(mcFixture);
		expect(r.output.saved).toBe(true);
		expect(r.terminate).toBeFalsy();
		expect(prompt).toHaveBeenCalledTimes(1);
		const [text, options] = prompt.mock.calls[0] as unknown as [string, { result: unknown }];
		const url = mcFixture.sources[0].url;
		expect(text).toBe(buildVerifierPrompt({ body: mcFixture.body, docs: [{ url, text: `doc for ${url}` }] }));
		expect(text).not.toContain(mcFixture.explanation.correct);
		expect(options.result).toBeDefined();
		expect(v.safeParse(options.result as v.GenericSchema, { optionId: "b" }).success).toBe(true);
	});

	it("verifies against the fact sheet when one is supplied", async () => {
		const sheet = { skillId: "identity.external-users", body: "## Key concepts\n- SHEET FACT" };
		const { run, prompt } = setup(1, mcCorrect, sheet);
		await run(mcFixture);
		const [text] = prompt.mock.calls[0] as unknown as [string];
		expect(text).toBe(
			buildVerifierPrompt({ body: mcFixture.body, docs: [{ url: "fact sheet for identity.external-users", text: sheet.body }] }),
		);
	});

	it("rejects sources the fact sheet does not link when writing from a sheet", async () => {
		const sheet = { skillId: "identity.external-users", body: "## Key concepts\n- SHEET FACT" };
		const { run, prompt } = setup(1, mcCorrect, sheet);
		const other = { ...mcFixture, sources: [{ url: "https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview" }] };
		const r = await run(other);
		expect(r.output).toMatchObject({ saved: false, reason: "invalid" });
		expect(String(r.output.detail)).toContain("storage-account-overview");
		expect(prompt).not.toHaveBeenCalled();
		// The fixture's source is a skill page cited without the locale: accepted.
		expect((await run(mcFixture)).output).toMatchObject({ done: true, saved: 1 });
	});

	it("runs the verifier on the configured verifier model", async () => {
		const previous = process.env.VERIFIER_MODEL;
		process.env.VERIFIER_MODEL = "openai/gpt-5";
		try {
			const { run, prompt } = setup(1);
			await run(mcFixture);
			const [, options] = prompt.mock.calls[0] as unknown as [string, { model?: string }];
			expect(options.model).toBe("openai/gpt-5");
		} finally {
			if (previous === undefined) delete process.env.VERIFIER_MODEL;
			else process.env.VERIFIER_MODEL = previous;
		}
	});

	it("rejects an off-target skill without admitting it", async () => {
		const { run, prompt, fetchDoc, db } = setup(1);
		const r = await run({ ...mcFixture, skillId: "identity.sspr" });
		expect(r.output).toMatchObject({ saved: false, reason: "invalid" });
		expect(String(r.output.detail)).toContain("identity.sspr");
		expect(prompt).not.toHaveBeenCalled();
		expect(fetchDoc).not.toHaveBeenCalled();
		expect((db.raw.prepare("SELECT COUNT(*) AS n FROM questions").get() as { n: number }).n).toBe(0);
	});

	it("maps a verifier failure to verifier-failed", async () => {
		const { run, prompt } = setup(1);
		prompt.mockRejectedValueOnce(new Error("result unavailable"));
		const r = await run(mcFixture);
		expect(r.output).toMatchObject({ saved: false, reason: "verifier-failed" });
	});

	it("terminates once count questions are saved", async () => {
		const { run } = setup(1);
		const r = await run(mcFixture);
		expect(r).toEqual({ output: { done: true, saved: 1, attempts: 1 }, terminate: true });
	});

	it("gives up after 3 x count attempts", async () => {
		const { run } = setup(1, { optionId: "a" });
		expect((await run(mcFixture)).terminate).toBeFalsy();
		expect((await run(mcFixture)).terminate).toBeFalsy();
		const r = await run(mcFixture);
		expect(r).toEqual({ output: { done: true, saved: 0, attempts: 3 }, terminate: true });
	});

	it("appends every admission result to the log", async () => {
		const { run, log, runId } = setup(2);
		await run({ ...mcFixture, skillId: "identity.sspr" });
		await run(mcFixture);
		const lines = log();
		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatchObject({
			runId,
			skillId: "identity.sspr",
			format: "multiple-choice",
			saved: false,
			reason: "invalid",
		});
		expect(lines[1]).toMatchObject({ runId, skillId: "identity.external-users", saved: true });
		expect(typeof lines[1].id).toBe("string");
		expect(typeof lines[1].ts).toBe("string");
	});

	it("short-circuits a call after done without fetching, verifying or saving", async () => {
		const { run, prompt, fetchDoc, questions, log } = setup(1);
		await run(mcFixture);
		const r = await run({ ...mcFixture, body: { ...mcFixture.body, stem: "A different stem entirely." } });
		expect(r).toEqual({ output: { done: true, saved: 1, attempts: 1 }, terminate: true });
		expect(prompt).toHaveBeenCalledTimes(1);
		expect(fetchDoc).toHaveBeenCalledTimes(1);
		expect(questions()).toBe(1);
		expect(log()).toHaveLength(1);
	});

	it("admits parallel calls one at a time, so a run never overshoots count", async () => {
		const { run, prompt, questions } = setup(1);
		const other = { ...mcFixture, body: { ...mcFixture.body, stem: "A different stem entirely." } };
		const [a, b] = await Promise.all([run(mcFixture), run(other)]);
		expect(a.terminate && b.terminate).toBe(true);
		expect(prompt).toHaveBeenCalledTimes(1);
		expect(questions()).toBe(1);
	});

	it("refuses its own tools when the verifier calls them during verification", async () => {
		const { run, prompt, db } = setup(1);
		const list = makeListExistingTool(() => db, "identity.external-users");
		const read = makeReadDocsTool(() => db);
		const refusals: string[] = [];
		prompt.mockImplementationOnce(async () => {
			for (const call of [
				() => run(mcFixture),
				() => list.run({ data: {}, toolCallId: "t2", log: console } as never),
				() => read.run({ data: { url: "https://learn.microsoft.com/x" }, toolCallId: "t3", log: console } as never),
			]) {
				await (async () => call())().catch((e: Error) => refusals.push(e.message));
			}
			return { data: mcCorrect };
		});
		const r = await run(mcFixture);
		expect(refusals).toHaveLength(3);
		for (const m of refusals) expect(m).toMatch(/not available during verification/);
		expect(r.output).toMatchObject({ done: true, saved: 1 });
		const outside = (await list.run({ data: {}, toolCallId: "t4", log: console } as never)) as {
			output: { stems: string[] };
		};
		expect(outside.output.stems).toEqual([mcFixture.body.stem]);
	});
});

describe("writer instructions per area", () => {
	it("names the skill's own area", () => {
		expect(writerInstructions({ skillId: "storage.tiers", format: "drag-drop", count: 1 })).toContain('area "Implement and manage storage"');
		expect(writerInstructions({ skillId: "identity.sspr", format: "drag-drop", count: 1 })).toContain(
			'area "Manage Azure identities and governance"',
		);
	});
});

describe("writer instructions with a fact sheet", () => {
	const init = { skillId: "identity.external-users", format: "multiple-choice" as const, count: 1 };
	it("puts the fact sheet and existing stems in the instructions and cites only linked pages", () => {
		const t = writerInstructions(init, {
			factSheet: "## Key concepts\n- Fact ([L](https://learn.microsoft.com/en-us/x))",
			existingStems: ["Old stem?"],
		});
		expect(t).toContain("## Key concepts");
		expect(t).toContain("- Old stem?");
		expect(t).toContain("Cite in sources the Learn pages the fact sheet links for the facts you used");
		expect(t).not.toContain("Read the skill's doc URLs first with read_ms_docs");
		expect(t).not.toContain("Call list_existing");
	});
	it("keeps today's instructions when the skill has no fact sheet", () => {
		const t = writerInstructions(init);
		expect(t).toContain("Read the skill's doc URLs first with read_ms_docs");
		expect(t).toContain("Call list_existing");
	});
});

describe("writer instructions", () => {
	const text = writerInstructions({ skillId: "identity.external-users", format: "multiple-choice", count: 5 });
	it("keeps the answer out of the stem and exhibit", () => {
		expect(text).toContain(
			"Neither the stem nor the exhibit may state the answer, the rule that decides it, or the name or wording of the correct option.",
		);
		expect(text).toContain("Never quote documentation sentences");
		expect(text).toContain("Synonyms of the correct option's name count as leaks too, including in exhibit titles and headings.");
		expect(text).toContain("Before each save_question, check the stem and exhibit against the key");
	});
	it("states requirements as goals, not definitions, and self-checks for paraphrase", () => {
		expect(text).toContain("never as a definition of the feature that meets it");
		expect(text).toContain("or paraphrase what the correct option does");
	});
	it("prefers parallel distractors and forbids invented synonyms", () => {
		expect(text).toContain("The preferred fix is parallel distractors");
		expect(text).toContain("so the stem cannot be answered by matching a name");
		expect(text).toContain("Never replace a real Microsoft product, feature or role term with an invented synonym");
		// A quoted bad phrase primes the model to reuse it.
		expect(text).not.toContain("directory responsibility");
		expect(text).toContain("Use the exact names the documentation uses for roles, user types, settings and features");
	});
	it("asks for exhibits in at least half of multiple-choice questions and explains the leak check", () => {
		expect(text).toContain("At least half of the questions you save carry an exhibit");
		expect(text).toContain('rejects leaks mechanically (reason "leak")');
	});
	it("asks for plain JSON arrays", () => {
		expect(text).toContain('never wrapped as {"item": [...]}');
		expect(text).toContain('"rows": [["Invitation state", "Pending acceptance"], ["User type", "Guest"]]');
	});
});
