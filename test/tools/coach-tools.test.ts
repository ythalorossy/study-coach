import { beforeEach, describe, expect, it } from "vitest";
import * as v from "valibot";
import { DiagramSchema } from "../../src/coach/diagram-schema.ts";
import { openCoachDb, type CoachDb } from "../../src/coach/db.ts";
import { insertQuestion, recordAttempt } from "../../src/coach/questions/questions.ts";
import {
	closesTurn,
	gateWhileWaiting,
	makePresentQuestionTool,
	makeProgressTool,
	makeSetLessonTool,
	IDLE_SPECIALIST,
	idleWhileWaiting,
	learnerFloor,
	makeQuestionDetailsTool,
	showDiagramTool,
	speakTool,
} from "../../src/tools/coach-tools.ts";
import { makeReadMsDocsTool } from "../../src/tools/read-ms-docs.ts";
import { mcFixture } from "../coach/fixtures.ts";

let db: CoachDb;
beforeEach(() => {
	db = openCoachDb(":memory:");
});

// Minimal fake of the context Flue hands to a tool's run.
function ctx<T>(data: T) {
	return { toolCallId: "t1", log: { info() {}, warn() {}, error() {} }, data } as never;
}
// Tool run results are envelopes in these tests; the union with string is irrelevant here.
async function call(tool: { run: (c: never) => unknown }, data: unknown): Promise<any> {
	return await tool.run(ctx(data));
}
function seed() {
	return insertQuestion(db, mcFixture, Object.fromEntries(mcFixture.sources.map((s) => [s.url, "2026-10-01"])));
}

const chain = {
	nodes: [
		{ id: "t", type: "tenant", label: "Contoso" },
		{ id: "mg", type: "management-group", label: "Prod", parent: "t" },
		{ id: "sub", type: "subscription", label: "Sub 1", parent: "mg" },
		{ id: "rg", type: "resource-group", label: "rg-app", parent: "sub" },
	],
	edges: [
		{ from: "t", to: "mg", kind: "contains" },
		{ from: "mg", to: "sub", kind: "contains" },
		{ from: "sub", to: "rg", kind: "contains" },
	],
	highlight: ["rg"],
};

describe("DiagramSchema", () => {
	it("accepts a tenant to resource group chain", () => {
		expect(v.safeParse(DiagramSchema, chain).success).toBe(true);
	});
	it("rejects an edge to a missing node", () => {
		const bad = { ...chain, edges: [{ from: "t", to: "nope", kind: "contains" }] };
		expect(v.safeParse(DiagramSchema, bad).success).toBe(false);
	});
	it("rejects an unknown node type", () => {
		const bad = { ...chain, nodes: [{ id: "t", type: "vm", label: "x" }] , edges: [], highlight: [] };
		expect(v.safeParse(DiagramSchema, bad).success).toBe(false);
	});
	it("rejects a highlight of a missing id", () => {
		expect(v.safeParse(DiagramSchema, { ...chain, highlight: ["ghost"] }).success).toBe(false);
	});
	it("rejects a parent that is not a node", () => {
		const bad = { ...chain, nodes: [{ id: "t", type: "tenant", label: "x", parent: "ghost" }], edges: [], highlight: [] };
		expect(v.safeParse(DiagramSchema, bad).success).toBe(false);
	});
	it("accepts storage nodes and replication edges", () => {
		const storage = {
			nodes: [
				{ id: "a", type: "storage-account", label: "contosoprod" },
				{ id: "b", type: "storage-account", label: "contosodr" },
				{ id: "c", type: "container", label: "invoices", parent: "a" },
				{ id: "k", type: "sas-token", label: "read-only SAS" },
			],
			edges: [
				{ from: "a", to: "b", kind: "replicates-to" },
				{ from: "k", to: "c", kind: "grants-access" },
			],
			highlight: ["a"],
		};
		expect(v.safeParse(DiagramSchema, storage).success).toBe(true);
	});

	it("accepts compute nodes and deploy and swap edges", () => {
		const compute = {
			nodes: [
				{ id: "t", type: "template", label: "main.bicep" },
				{ id: "p", type: "app-service-plan", label: "plan-prod" },
				{ id: "a", type: "app-service", label: "contoso-web", parent: "p" },
				{ id: "s", type: "deployment-slot", label: "staging", parent: "a" },
				{ id: "v", type: "virtual-machine", label: "vm-01" },
			],
			edges: [
				{ from: "t", to: "p", kind: "deploys" },
				{ from: "s", to: "a", kind: "swaps-with" },
			],
			highlight: ["s"],
		};
		expect(v.safeParse(DiagramSchema, compute).success).toBe(true);
	});

	it("is the input of show_diagram", async () => {
		expect(v.safeParse(showDiagramTool.input, { ...chain, highlight: ["ghost"] }).success).toBe(false);
		expect(await call(showDiagramTool, chain)).toEqual({ output: { ok: true } });
	});
});

describe("speak", () => {
	it("rejects an unknown instructor", () => {
		expect(v.safeParse(speakTool.input, { instructor: "storage", text: "hi" }).success).toBe(false);
		expect(v.safeParse(speakTool.input, { instructor: "files-blobs", text: "hi" }).success).toBe(true);
		expect(v.safeParse(speakTool.input, { instructor: "storage-security", text: "hi" }).success).toBe(true);
		expect(v.safeParse(speakTool.input, { instructor: "lead", text: "hi" }).success).toBe(true);
	});
	it("returns ok", async () => {
		expect(await call(speakTool, { instructor: "lead", text: "hi" })).toEqual({ output: { ok: true } });
	});
});

describe("present_question", () => {
	it("reports no-questions on an empty bank without terminating", async () => {
		const tool = makePresentQuestionTool(() => db, "s1");
		const r = await call(tool, { purpose: "lesson-check", skillId: "identity.external-users" });
		expect(r).toEqual({ output: { question: null, reason: "no-questions" } });
		expect(r.terminate).toBeUndefined();
	});
	it("terminates with a public question that has no key", async () => {
		seed();
		const tool = makePresentQuestionTool(() => db, "s1");
		const r = await call(tool, { purpose: "lesson-check", skillId: "identity.external-users" });
		expect(r.terminate).toBe(true);
		expect(r.output.purpose).toBe("lesson-check");
		expect(r.output.question.skillId).toBe("identity.external-users");
		expect(JSON.stringify(r.output)).not.toContain('"key"');
	});
	it("reports the presented question so the coach can wait for the answer", async () => {
		const id = seed();
		const seen: unknown[] = [];
		const tool = makePresentQuestionTool(() => db, "s1", (q, purpose) => seen.push([q.id, q.skillId, purpose]));
		await call(tool, { purpose: "lesson-check", skillId: "identity.external-users" });
		expect(seen).toEqual([[id, "identity.external-users", "lesson-check"]]);
	});
	it("reports nothing when no question is available", async () => {
		const seen: unknown[] = [];
		const tool = makePresentQuestionTool(() => db, "s1", (q) => seen.push(q));
		await call(tool, { purpose: "lesson-check", skillId: "identity.external-users" });
		expect(seen).toEqual([]);
	});
	it("follows up on an earlier question", async () => {
		const id = seed();
		const tool = makePresentQuestionTool(() => db, "s1");
		const r = await call(tool, { purpose: "followup", afterQuestionId: id });
		expect(r).toEqual({ output: { question: null, reason: "no-questions" } });
	});
	it("throws when lesson-check lacks a skillId", async () => {
		const tool = makePresentQuestionTool(() => db, "s1");
		await expect(call(tool, { purpose: "lesson-check" })).rejects.toThrow(/skillId/);
	});
	it("throws when followup lacks afterQuestionId", async () => {
		const tool = makePresentQuestionTool(() => db, "s1");
		await expect(call(tool, { purpose: "followup" })).rejects.toThrow(/afterQuestionId/);
	});
});

describe("get_question_details", () => {
	const answer = (id: string, sessionId: string) =>
		recordAttempt(db, { questionId: id, response: { optionId: "a" }, purpose: "lesson-check", sessionId });

	it("returns the full row once the learner answered it in this session", async () => {
		const id = seed();
		answer(id, "s1");
		const r = await call(makeQuestionDetailsTool(() => db, "s1"), { questionId: id });
		expect(r.output.key).toEqual(mcFixture.key);
		expect(r.output.explanation).toEqual(mcFixture.explanation);
		expect(r.output.subtopics).toEqual(mcFixture.subtopics);
		expect(r.output.sources[0].url).toBe(mcFixture.sources[0].url);
		expect(r.output.body.format).toBe("multiple-choice");
	});
	it("refuses before the learner has answered the question", async () => {
		const id = seed();
		await expect(call(makeQuestionDetailsTool(() => db, "s1"), { questionId: id })).rejects.toThrow(/not answered/);
	});
	it("refuses when the question was answered only in another session", async () => {
		const id = seed();
		answer(id, "s2");
		await expect(call(makeQuestionDetailsTool(() => db, "s1"), { questionId: id })).rejects.toThrow(/not answered/);
	});
	it("throws for an unknown id", async () => {
		await expect(call(makeQuestionDetailsTool(() => db, "s1"), { questionId: "q_nope" })).rejects.toThrow(/Unknown question/);
	});
});

describe("gateWhileWaiting", () => {
	it("ends the turn without running the tool while the coach waits for the learner", async () => {
		let ran = false;
		const tool = gateWhileWaiting(
			{ ...speakTool, run: () => ((ran = true), { output: { ok: true } }) } as typeof speakTool,
			() => true,
		);
		const r = await call(tool, { instructor: "lead", text: "." });
		expect(ran).toBe(false);
		expect(r.terminate).toBe(true);
		expect(r.output.ignored).toMatch(/wait/i);
	});
	it("runs the tool normally otherwise", async () => {
		const tool = gateWhileWaiting(speakTool, () => false);
		expect(tool.name).toBe("speak");
		expect(tool.input).toBe(speakTool.input);
		expect(await call(tool, { instructor: "lead", text: "hi" })).toEqual({ output: { ok: true } });
	});
});

describe("closesTurn", () => {
	it("runs the tool, then closes and ends the turn when it should", async () => {
		let closed = 0;
		const tool = closesTurn(speakTool, () => true, () => void closed++);
		const r = await call(tool, { instructor: "lead", text: "Correct!" });
		expect(r).toEqual({ output: { ok: true }, terminate: true });
		expect(closed).toBe(1);
	});
	it("leaves the turn open otherwise", async () => {
		let closed = 0;
		const tool = closesTurn(speakTool, () => false, () => void closed++);
		expect(await call(tool, { instructor: "lead", text: "hi" })).toEqual({ output: { ok: true } });
		expect(closed).toBe(0);
	});
});

describe("get_progress", () => {
	it("limits progress to the session's area when it has one", async () => {
		const r = await call(makeProgressTool(() => db, "storage"), {});
		expect(r.output.skills).toHaveLength(17);
		expect(r.output.skills.every((s: { areaId: string }) => s.areaId === "storage")).toBe(true);
	});

	it("returns all 56 skills", async () => {
		const r = await call(makeProgressTool(() => db), {});
		expect(r.output.skills).toHaveLength(56);
		expect(Object.keys(r.output.skills[0]).sort()).toEqual(["areaId", "id", "name", "readiness", "specialist", "taught"]);
	});
});

describe("read_ms_docs", () => {
	it("throws with the reason for a non-allowed host", async () => {
		const tool = makeReadMsDocsTool(() => db);
		expect(tool.timeoutMs).toBe(20_000);
		await expect(call(tool, { url: "https://example.com" })).rejects.toThrow(/not-allowed/);
	});
});

describe("set_lesson", () => {
	const recorded: [string, string][] = [];
	const tool = makeSetLessonTool("storage", (skillId, phase) => recorded.push([skillId, phase]));
	it("records a skill from the session's area", async () => {
		const r = await call(tool, { skillId: "storage.tiers", phase: "intro" });
		expect(r.output).toEqual({ ok: true });
		expect(recorded).toEqual([["storage.tiers", "intro"]]);
	});
	it("refuses a skill from another area or an unknown skill, without recording it", async () => {
		const r = await call(tool, { skillId: "identity.sspr", phase: "intro" });
		expect(r.output.ok).toBe(false);
		expect(r.output.error).toContain("Implement and manage storage");
		expect((await call(tool, { skillId: "nope", phase: "intro" })).output.ok).toBe(false);
		expect(recorded).toHaveLength(1);
	});
	it("accepts any known skill when the session has no area", async () => {
		const open = makeSetLessonTool(undefined, () => {});
		expect((await call(open, { skillId: "identity.sspr", phase: "scenario" })).output).toEqual({ ok: true });
	});
});

describe("idleWhileWaiting", () => {
	const definition = { name: "identity", description: "Identity instructor", agent: () => "full instructions" };

	it("keeps the specialist as it is while the learner is not answering", () => {
		const wrapped = idleWhileWaiting(definition, () => false);
		expect(wrapped.name).toBe("identity");
		expect(wrapped.description).toBe("Identity instructor");
		expect(wrapped.agent()).toBe("full instructions");
	});

	it("turns a delegation into a no-op while a question waits for the learner", () => {
		let waiting = false;
		const wrapped = idleWhileWaiting(definition, () => waiting);
		waiting = true;
		expect(wrapped.agent()).toBe(IDLE_SPECIALIST);
		expect(IDLE_SPECIALIST).toContain("Reply with nothing");
	});
});


describe("learnerFloor", () => {
	// Flue throws on any state write while an agent renders, and a delegate renders
	// (and asks isWaiting) at delegation time: reading must never call the setter.
	const throwingSetter = () => {
		throw new Error('[flue] State "waiting" was written during render.');
	};

	it("reads the persisted flag without writing", () => {
		expect(learnerFloor(false, throwingSetter).isWaiting()).toBe(false);
		expect(learnerFloor(true, throwingSetter).isWaiting()).toBe(true);
	});

	it("sees a hand-over made earlier in the same batch, before it is persisted", () => {
		const writes: boolean[] = [];
		const floor = learnerFloor(false, (v) => writes.push(v as boolean));
		floor.handOver();
		expect(writes).toEqual([true]);
		expect(floor.isWaiting()).toBe(true);
	});
});
