import type { FlueConversationMessage } from "@flue/react";
import { describe, expect, it } from "vitest";
import { LEARNER, START_MESSAGE, toRoomView } from "./room-view.ts";

let n = 0;
function msg(
	role: FlueConversationMessage["role"],
	parts: unknown[],
	extra: Record<string, unknown> = {},
): FlueConversationMessage {
	n += 1;
	return { id: `m${n}`, role, purpose: role === "user" ? "user" : "assistant", display: "visible", parts, ...extra } as FlueConversationMessage;
}
function tool(toolName: string, input: unknown, state: string, output?: unknown) {
	n += 1;
	return { type: "dynamic-tool", toolName, toolCallId: `c${n}`, state, input, output };
}
const speak = (instructor: string, text: string, state = "output-available") =>
	tool("speak", { instructor, text }, state);
const diagram = (label: string) => ({
	nodes: [
		{ id: "sub", type: "subscription", label },
		{ id: "rg", type: "resource-group", label: "rg", parent: "sub" },
	],
	edges: [{ from: "sub", to: "rg", kind: "contains" }],
	highlight: ["rg"],
});
const question = {
	id: "q1",
	skillId: "s",
	format: "multiple-choice",
	body: { format: "multiple-choice", stem: "?", options: [] },
};

describe("toRoomView", () => {
	it("maps two speak parts to two turns in order", () => {
		const view = toRoomView([
			msg("assistant", [speak("lead", "one", "input-available"), speak("identity", "two")]),
		]);
		expect(view.turns.map((t) => [t.instructor, t.text])).toEqual([
			["lead", "one"],
			["identity", "two"],
		]);
		expect(view.turns[0].toolCallId).toMatch(/^c/);
	});

	it("keeps the good diagram when a later show_diagram errors", () => {
		const view = toRoomView([
			msg("assistant", [
				tool("show_diagram", diagram("good"), "output-available", {}),
				tool("show_diagram", diagram("bad"), "output-error"),
			]),
		]);
		expect(view.diagram?.nodes[0].label).toBe("good");
	});

	it("ignores diagrams that fail the shape check and keeps the last good one", () => {
		const broken = { ...diagram("broken"), highlight: ["ghost"] };
		const view = toRoomView([
			msg("assistant", [
				tool("show_diagram", diagram("good"), "output-available", {}),
				tool("show_diagram", broken, "output-available", {}),
			]),
		]);
		expect(view.diagram?.nodes[0].label).toBe("good");
	});

	it("renders a storage instructor's speech", () => {
		const view = toRoomView([msg("assistant", [speak("files-blobs", "Blobs tier down.")])]);
		expect(view.turns.map((t) => [t.instructor, t.text])).toEqual([["files-blobs", "Blobs tier down."]]);
	});

	it("still renders speech from an unknown instructor id", () => {
		const view = toRoomView([msg("assistant", [speak("mystery", "x")])]);
		expect(view.turns.map((t) => [t.instructor, t.text])).toEqual([["mystery", "x"]]);
	});

	it("ignores a speak without an instructor", () => {
		const view = toRoomView([msg("assistant", [speak("", "x")])]);
		expect(view.turns).toEqual([]);
	});

	// Shapes as the runtime records them: both are system/diagnostic messages carrying `signal`.
	const answerSignal = (questionId: string) =>
		msg("system", [{ type: "text", text: "The learner answered.", state: "done" }], {
			purpose: "dispatch",
			display: "diagnostic",
			signal: { attributes: { questionId, correct: "false", purpose: "lesson-check", response: "{}" } },
		});

	it("keeps pendingQuestion when a runtime advisory with signal attributes follows", () => {
		const present = msg("assistant", [
			tool("present_question", {}, "output-available", { question, purpose: "lesson-check" }),
		]);
		const aborted = msg("system", [{ type: "text", text: "Submission aborted.", state: "done" }], {
			purpose: "advisory",
			display: "diagnostic",
			signal: { attributes: { submissionId: "sub_1", kind: "submission_aborted", reason: "aborted" } },
		});
		expect(toRoomView([present, aborted]).pendingQuestion?.question.id).toBe("q1");
	});

	it("clears pendingQuestion when the answer signal for that question follows", () => {
		const present = msg("assistant", [
			tool("present_question", {}, "output-available", { question, purpose: "lesson-check" }),
		]);
		expect(toRoomView([present, answerSignal("q1")]).pendingQuestion).toBeNull();
	});

	it("keeps pendingQuestion when an answer signal names a different question", () => {
		const present = msg("assistant", [
			tool("present_question", {}, "output-available", { question, purpose: "lesson-check" }),
		]);
		expect(toRoomView([present, answerSignal("q-other")]).pendingQuestion?.question.id).toBe("q1");
	});

	it("shows the learner's typed messages as learner turns, but not the lesson's opening message", () => {
		const start = msg("user", [{ type: "text", text: START_MESSAGE, state: "done" }]);
		const typed = msg("user", [{ type: "text", text: "Can you explain scopes again?", state: "done" }]);
		const reply = msg("assistant", [speak("lead", "Of course.")]);
		const view = toRoomView([start, typed, reply], { streaming: true });
		expect(view.turns.map((t) => [t.instructor, t.text])).toEqual([
			[LEARNER, "Can you explain scopes again?"],
			["lead", "Of course."],
		]);
		expect(view.speaking).toBe("lead");
		expect(toRoomView([reply, typed], { streaming: true }).speaking).toBe("lead");
	});

	it("keeps pendingQuestion when the learner types a question while it is on screen", () => {
		const present = msg("assistant", [
			tool("present_question", {}, "output-available", { question, purpose: "lesson-check" }),
		]);
		const typed = msg("user", [{ type: "text", text: "What is B2B direct connect?", state: "done" }]);
		expect(toRoomView([present, typed]).pendingQuestion?.question.id).toBe("q1");
	});

	it("ignores present_question with a null question", () => {
		const view = toRoomView([
			msg("assistant", [
				tool("present_question", {}, "output-available", { question: null, reason: "no-questions" }),
			]),
		]);
		expect(view.pendingQuestion).toBeNull();
	});

	it("turns assistant plain text into a lead turn", () => {
		const view = toRoomView([msg("assistant", [{ type: "text", text: "Hi", state: "done" }])]);
		expect(view.turns.map((t) => [t.instructor, t.text])).toEqual([["lead", "Hi"]]);
	});

	it("gives each text part of one message a distinct toolCallId", () => {
		const view = toRoomView([
			msg("assistant", [
				{ type: "text", text: "A", state: "done" },
				speak("lead", "mid"),
				{ type: "text", text: "B", state: "done" },
			]),
		]);
		const ids = view.turns.map((t) => t.toolCallId);
		expect(ids).toHaveLength(3);
		expect(new Set(ids).size).toBe(3);
	});

	it("skips hidden and diagnostic messages", () => {
		const view = toRoomView([
			msg("assistant", [speak("lead", "secret")], { display: "hidden" }),
			msg("assistant", [speak("lead", "diag")], { display: "diagnostic" }),
		]);
		expect(view.turns).toEqual([]);
	});

	it("reports speaking only while streaming", () => {
		const m = [msg("assistant", [speak("access", "go")])];
		expect(toRoomView(m).speaking).toBeNull();
		expect(toRoomView(m, { streaming: true }).speaking).toBe("access");
		expect(toRoomView([], { streaming: true }).speaking).toBeNull();
	});

	it("drops turns whose text is empty, whitespace or punctuation only", () => {
		const view = toRoomView([
			msg("assistant", [
				speak("lead", "."),
				speak("lead", "  "),
				speak("lead", "..."),
				speak("identity", "?!"),
				{ type: "text", text: " . ", state: "done" },
				speak("lead", "OK."),
			]),
		]);
		expect(view.turns.map((t) => t.text)).toEqual(["OK."]);
	});

	it("ignores speak and show_diagram calls the coach refused because the turn was over", () => {
		const ignored = { ignored: "Your turn is over; wait for the learner." };
		const view = toRoomView([
			msg("assistant", [
				tool("show_diagram", diagram("good"), "output-available", { ok: true }),
				tool("show_diagram", diagram("hint"), "output-available", ignored),
				tool("speak", { instructor: "lead", text: "Extra line" }, "output-available", ignored),
			]),
		]);
		expect(view.diagram?.nodes[0].label).toBe("good");
		expect(view.turns).toEqual([]);
	});
});

