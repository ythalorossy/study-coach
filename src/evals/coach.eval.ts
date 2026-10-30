import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { init } from "@flue/runtime";
import type {
	AgentInstanceHandle,
	AgentReply,
	ConversationStreamChunk,
	DeliveredMessageInput,
	DispatchReceipt,
} from "@flue/runtime";
import { start } from "@flue/runtime/node";
import { afterAll, describe, expect, it } from "vitest";
import { Coach } from "../agents/coach.ts";
import { getCoachDb, openCoachDb } from "../coach/db.ts";
import { insertQuestion, recordAttempt } from "../coach/questions/questions.ts";
import { areaOfSkill } from "../coach/exam/instructors.ts";
import { SKILLS } from "../coach/exam/seed.ts";
import type { CandidateQuestion } from "../coach/questions/question-schema.ts";
import { completeSentenceFixture, dragDropFixture, mcFixture } from "../../test/coach/fixtures.ts";

// A throwaway coach database seeded with the fixtures; set before anything calls getCoachDb().
const dbPath = join(mkdtempSync(join(tmpdir(), "coach-eval-")), "coach.db");
process.env.COACH_DB_PATH = dbPath;
const seedDb = openCoachDb(dbPath);
const seed = (q: CandidateQuestion) =>
	insertQuestion(seedDb, q, Object.fromEntries(q.sources.map((s) => [s.url, "2026-10-01"])));
const mcId = seed(mcFixture);
seed(dragDropFixture);
seed(completeSentenceFixture);
seedDb.raw.close();

// Lessons in later areas need check questions: copy their verified ones from the learner's bank.
// A read-only connection (no SQL-built path) and named columns, so a schema change fails loudly here.
const LIVE_DB = resolve("./data/coach.db");
if (existsSync(LIVE_DB)) {
	const live = new DatabaseSync(LIVE_DB, { readOnly: true });
	const copy = new DatabaseSync(dbPath);
	const columns = (copy.prepare("PRAGMA table_info(questions)").all() as { name: string }[]).map((c) => c.name);
	const rows = live
		.prepare(
			`SELECT ${columns.join(", ")} FROM questions WHERE status = 'verified'
			 AND skill_id NOT LIKE 'identity.%' AND skill_id NOT LIKE 'access.%' AND skill_id NOT LIKE 'governance.%'`,
		)
		.all();
	const insert = copy.prepare(`INSERT OR IGNORE INTO questions (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`);
	for (const row of rows) insert.run(...columns.map((c) => row[c] as never));
	copy.close();
	live.close();
}

const flue = await start({ agents: [Coach] });
afterAll(() => flue.stop());

interface ToolCall {
	name: string;
	input: any;
}

async function send(
	agent: AgentInstanceHandle,
	message: DeliveredMessageInput,
	initialData?: unknown,
): Promise<{ reply: AgentReply; calls: ToolCall[] }> {
	const calls: ToolCall[] = [];
	// Hand-overs that failed: the lead can still speak in the specialist's name, so the
	// speaker checks alone would pass while no specialist ever ran.
	const taskCalls = new Map<string, string>();
	const failedTasks: string[] = [];
	const receipt = await agent.dispatch({ message, initialData });
	// read() replays the conversation from its start; record only this submission's chunks.
	let ours = false;
	const reply = await agent.read(receipt, {
		onEvent: (chunk) => {
			if (
				(chunk.type === "message-appended" && chunk.message.submissionId === receipt.submissionId) ||
				(chunk.type === "message-started" && chunk.submissionId === receipt.submissionId)
			)
				ours = true;
			if (ours && chunk.type === "tool-input") {
				calls.push({ name: chunk.toolName, input: chunk.input });
				if (chunk.toolName === "task") taskCalls.set(chunk.toolCallId, String((chunk.input as { agent?: unknown }).agent));
			}
			if (ours && chunk.type === "tool-output-error" && taskCalls.has(chunk.toolCallId)) {
				failedTasks.push(`${taskCalls.get(chunk.toolCallId)}: ${chunk.errorText}`);
			}
		},
	});
	expect(ours, "no chunks were attributed to the dispatched submission").toBe(true);
	expect(failedTasks, "hand-overs to specialists failed").toEqual([]);
	return { reply, calls };
}

const speaks = (calls: ToolCall[]) => calls.filter((c) => c.name === "speak");
// What the model did, shown in a failing assertion's message.
const trace = (calls: ToolCall[]) =>
	calls.map((c) => (c.name === "speak" ? `speak:${c.input.instructor}` : c.name === "task" ? `task:${c.input.agent}` : c.name)).join(" > ");
const lesson = { kind: "lesson", skillIds: ["identity.external-users"] };
// Calls after the check question, other than delegations: those idle while the learner answers (idleWhileWaiting).
const afterQuestion = (calls: ToolCall[]) =>
	calls
		.slice(calls.findIndex((c) => c.name === "present_question") + 1)
		.filter((c) => c.name !== "task")
		.map((c) => c.name);

describe.concurrent("coach", () => {
	it("lesson speaks only through speak and draws a diagram", async () => {
		const { reply, calls } = await send(init(Coach), "Teach me", lesson);

		expect(speaks(calls).some((c) => c.input.instructor === "identity"), trace(calls)).toBe(true);
		expect(calls.some((c) => c.name === "show_diagram"), trace(calls)).toBe(true);
		expect(reply.text.trim().length, reply.text).toBeLessThan(40);
	});

	it("lesson ends at the check question", async () => {
		const { calls } = await send(init(Coach), "Teach me", lesson);

		const presented = calls.filter((c) => c.name === "present_question");
		expect(presented, trace(calls)).toHaveLength(1);
		expect(afterQuestion(calls), trace(calls)).toEqual([]);
		// The key never shapes the lesson before the learner answers.
		expect(calls.some((c) => c.name === "get_question_details"), trace(calls)).toBe(false);
	});

	it("interrupt is answered then scenario continues", async () => {
		const agent = init(Coach);
		const question = "Wait, what does #EXT# mean?";
		// Chunks from both reads, deduplicated by stream position (read() replays from the start).
		const chunks = new Map<string, ConversationStreamChunk>();
		const collect = (chunk: ConversationStreamChunk) => {
			chunks.set(`${chunk.position.batch}:${chunk.position.index}`, chunk);
		};

		// Type the question mid-scenario: as soon as identity first speaks after the scenario
		// phase starts, while the lead's response is still running, so it joins at a turn boundary.
		let inScenario = false;
		let interrupt: Promise<DispatchReceipt> | undefined;
		const first = await agent.dispatch({ message: "Teach me", initialData: lesson });
		await agent.read(first, {
			onEvent: (chunk) => {
				collect(chunk);
				if (chunk.type !== "tool-input") return;
				const input = chunk.input as any;
				if (chunk.toolName === "set_lesson" && input?.phase === "scenario") inScenario = true;
				if (inScenario && !interrupt && chunk.toolName === "speak" && input?.instructor === "identity")
					interrupt = agent.dispatch(question);
			},
		});
		expect(interrupt, "the lesson never reached a scenario step spoken by identity").toBeDefined();
		// If the question missed the live response it runs as its own submission; read that too.
		await agent.read(await interrupt!, { onEvent: collect });

		const ordered = [...chunks.values()].sort(
			(a, b) => a.position.batch - b.position.batch || a.position.index - b.position.index,
		);
		const joinedAt = ordered.findIndex(
			(c) =>
				c.type === "message-appended" &&
				c.message.role === "user" &&
				c.message.parts.some((p) => p.type === "text" && p.text.includes("#EXT#")),
		);
		expect(joinedAt, "the interrupt never appeared in the conversation").toBeGreaterThanOrEqual(0);
		const calls: ToolCall[] = ordered
			.slice(joinedAt + 1)
			.flatMap((c) => (c.type === "tool-input" ? [{ name: c.toolName, input: c.input as any }] : []));

		const firstSpeak = calls.findIndex((c) => c.name === "speak");
		expect(firstSpeak, trace(calls)).toBeGreaterThanOrEqual(0);
		expect(calls[firstSpeak].input.instructor, trace(calls)).toBe("identity");
		expect(calls.slice(firstSpeak + 1).some((c) => c.name === "speak" || c.name === "show_diagram"), trace(calls)).toBe(true);
		// The scenario carries on after the answer rather than stopping.
		expect(
			calls.slice(firstSpeak + 1).some((c) => c.name === "task" || c.name === "speak" || c.name === "show_diagram"),
			trace(calls),
		).toBe(true);
		// And it is not restarted.
		expect(
			calls.some((c) => c.name === "set_lesson" && c.input.phase === "intro"),
			trace(calls),
		).toBe(false);
	});

	it("wrong answer gets explanation and follow-up", async () => {
		const agent = init(Coach);
		// The page records the attempt before it sends the answer-result signal.
		recordAttempt(getCoachDb(), { questionId: mcId, response: { optionId: "a" }, purpose: "practice", sessionId: agent.id });
		const { calls } = await send(
			agent,
			{
				kind: "signal",
				type: "answer-result",
				body: `Learner answered question ${mcId} incorrectly (chose option a).`,
				attributes: { questionId: mcId, correct: "false", purpose: "practice", response: JSON.stringify({ optionId: "a" }) },
			},
			{ kind: "practice", skillIds: ["identity.external-users"] },
		);

		const details = calls.findIndex((c) => c.name === "get_question_details" && c.input.questionId === mcId);
		expect(details, trace(calls)).toBeGreaterThanOrEqual(0);
		const explain = calls.findIndex((c, i) => i > details && c.name === "speak" && c.input.instructor === "identity");
		expect(explain, trace(calls)).toBeGreaterThan(details);
		const followup = calls.findIndex((c, i) => i > explain && c.name === "present_question" && c.input.purpose === "followup");
		expect(followup, trace(calls)).toBeGreaterThan(explain);
	});
});

const STORAGE_TEAM = ["storage-security", "storage-accounts", "files-blobs"];
const endsAtCheck = (calls: ToolCall[]) => {
	expect(calls.filter((c) => c.name === "present_question"), trace(calls)).toHaveLength(1);
	expect(afterQuestion(calls), trace(calls)).toEqual([]);
};

describe.concurrent("coach in storage", () => {
	it("storage lesson is taught by the storage team and ends at the check question", async () => {
		const { calls } = await send(init(Coach), "Teach me", { kind: "lesson", skillIds: ["storage.sas-tokens"] });
		expect(speaks(calls).some((c) => STORAGE_TEAM.includes(c.input.instructor)), trace(calls)).toBe(true);
		endsAtCheck(calls);
	});

	it("lead's choice in the storage area picks a storage skill", async () => {
		const { calls } = await send(init(Coach), "Teach me", { kind: "lesson", skillIds: [], areaId: "storage" });
		const lessons = calls.filter((c) => c.name === "set_lesson");
		expect(lessons.length, trace(calls)).toBeGreaterThan(0);
		expect(String(lessons[0].input.skillId), trace(calls)).toMatch(/^storage\./);
	});
});

// EVAL_SWEEP_AREA=<area id> npm run evals -- -t "area sweep" --maxConcurrency 2: one live lesson per skill of that area.
const SWEEP_AREA = process.env.EVAL_SWEEP_AREA;
describe.runIf(Boolean(SWEEP_AREA)).concurrent("area sweep", () => {
	it.each(SKILLS.filter(([id]) => SWEEP_AREA && areaOfSkill(id) === SWEEP_AREA).map(([id]) => id))(
		"%s lesson ends at the check question",
		async (skillId) => {
			const { calls } = await send(init(Coach), "Teach me", { kind: "lesson", skillIds: [skillId] });
			endsAtCheck(calls);
		},
	);
});
