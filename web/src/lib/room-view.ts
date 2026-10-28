import type { FlueConversationMessage } from "@flue/react";
import {
	EDGE_KINDS,
	NODE_TYPES,
	type Diagram,
	type InstructorId,
	type PublicQuestion,
} from "./types.ts";

/** instructor is usually an InstructorId; an id the page does not know yet still renders. */
export type RoomTurn = { instructor: InstructorId | string; text: string; toolCallId: string };
export type PendingQuestion = { question: PublicQuestion; purpose: string };
export type RoomView = {
	turns: RoomTurn[];
	speaking: InstructorId | string | null;
	diagram: Diagram | null;
	pendingQuestion: PendingQuestion | null;
};

function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === "object" && x !== null && !Array.isArray(x);
}

// The server only accepts known ids; any non-empty id renders, so a page older than the server never drops speech.
function isInstructor(x: unknown): x is string {
	return typeof x === "string" && x.length > 0;
}

/** Client-side mirror of the server's diagram check: known types and kinds, and every referenced id exists. */
function asDiagram(x: unknown): Diagram | null {
	if (!isRecord(x) || !Array.isArray(x.nodes) || !Array.isArray(x.edges) || !Array.isArray(x.highlight)) {
		return null;
	}
	const ids = new Set<string>();
	for (const n of x.nodes) {
		if (!isRecord(n) || typeof n.id !== "string" || n.id === "" || typeof n.label !== "string") return null;
		if (!(NODE_TYPES as readonly unknown[]).includes(n.type)) return null;
		if (n.parent !== undefined && typeof n.parent !== "string") return null;
		ids.add(n.id);
	}
	if (ids.size !== x.nodes.length || ids.size === 0) return null;
	for (const n of x.nodes as { parent?: string }[]) {
		if (n.parent !== undefined && !ids.has(n.parent)) return null;
	}
	for (const e of x.edges) {
		if (!isRecord(e) || typeof e.from !== "string" || typeof e.to !== "string") return null;
		if (!ids.has(e.from) || !ids.has(e.to)) return null;
		if (!(EDGE_KINDS as readonly unknown[]).includes(e.kind)) return null;
	}
	if (!x.highlight.every((h) => typeof h === "string" && ids.has(h))) return null;
	return x as Diagram;
}

/** Text with something to say: not empty, whitespace or punctuation only (e.g. "."). */
function hasWords(text: string): boolean {
	return /[\p{L}\p{N}]/u.test(text);
}

/** The coach refuses calls made after it handed the turn to the learner; those have no effect on screen. */
function isIgnored(output: unknown): boolean {
	return isRecord(output) && typeof output.ignored === "string";
}

function asPending(output: unknown): PendingQuestion | null {
	if (!isRecord(output) || !isRecord(output.question)) return null;
	const q = output.question;
	if (typeof q.id !== "string" || typeof q.format !== "string" || !isRecord(q.body)) return null;
	return { question: q as unknown as PublicQuestion, purpose: String(output.purpose ?? "") };
}

/** Turns Flue conversation messages into what the instructor room shows. */
export function toRoomView(messages: FlueConversationMessage[], opts: { streaming?: boolean } = {}): RoomView {
	const turns: RoomTurn[] = [];
	let diagram: Diagram | null = null;
	let pendingQuestion: PendingQuestion | null = null;

	for (const message of messages) {
		// Only the answer signal for the question on screen settles it. Typed learner questions
		// and runtime advisories (which also carry signal attributes) leave it on screen.
		if (message.signal !== undefined) {
			if (pendingQuestion && message.signal.attributes?.questionId === pendingQuestion.question.id) {
				pendingQuestion = null;
			}
			continue;
		}
		if (message.display === "hidden" || message.display === "diagnostic") continue;
		if (message.role !== "assistant") continue;
		for (const [partIndex, part] of message.parts.entries()) {
			if (part.type === "text") {
				if (hasWords(part.text)) turns.push({ instructor: "lead", text: part.text, toolCallId: `${message.id}:text:${partIndex}` });
			} else if (part.type === "dynamic-tool") {
				if (isIgnored(part.output)) continue;
				const ready = part.state === "output-available";
				if (part.toolName === "speak" && (ready || part.state === "input-available")) {
					const input = part.input;
					if (isRecord(input) && isInstructor(input.instructor) && typeof input.text === "string" && hasWords(input.text)) {
						turns.push({ instructor: input.instructor, text: input.text, toolCallId: part.toolCallId });
					}
				} else if (part.toolName === "show_diagram" && ready) {
					diagram = asDiagram(part.input) ?? diagram;
				} else if (part.toolName === "present_question" && ready) {
					pendingQuestion = asPending(part.output) ?? pendingQuestion;
				}
			}
		}
	}

	const last = turns[turns.length - 1];
	return { turns, speaking: opts.streaming && last ? last.instructor : null, diagram, pendingQuestion };
}
