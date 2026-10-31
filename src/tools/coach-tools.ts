import { defineTool } from "@flue/runtime";
import type { ToolDefinition } from "@flue/runtime";
import * as v from "valibot";
import type { CoachDb } from "../coach/db.ts";
import { DiagramSchema } from "../coach/diagram-schema.ts";
import { skillProgress } from "../coach/progress.ts";
import { followupQuestion, nextPracticeQuestion, UnknownQuestionError } from "../coach/questions/questions.ts";
import type { PublicQuestion } from "../coach/questions/question-schema.ts";
import { areaName, areaOfSkill, SPECIALISTS } from "../coach/exam/instructors.ts";
import type { InstructorId } from "../coach/exam/types.ts";

const INSTRUCTORS = ["lead", ...SPECIALISTS.map((s) => s.id)] as [InstructorId, ...InstructorId[]];

// The page reads these calls as dynamic-tool parts; the tool itself only acknowledges.
export const speakTool = defineTool({
	name: "speak",
	description:
		"The only way any instructor says something to the learner. Plain text shown in the instructor's speech bubble; nothing written outside this tool is seen.",
	input: v.object({
		instructor: v.picklist(INSTRUCTORS),
		text: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
	}),
	run() {
		return { output: { ok: true } };
	},
});

export const showDiagramTool = defineTool({
	name: "show_diagram",
	description:
		"Show a diagram of Azure scopes, identities, storage, compute or networking on the whiteboard. Nodes need unique ids; edges, parents and highlights must reference those ids. Nest with parent (a subnet in its virtual network, a VM in its subnet); connect with edges (peered-with between virtual networks, associated-with for a network security group or route table on a subnet, routes-to for a load balancer or route). Replaces the previous diagram.",
	input: DiagramSchema,
	run() {
		return { output: { ok: true } };
	},
});

/** areaId limits the skills to one exam area (a lead-choice lesson started from that area). */
export function makeProgressTool(getDb: () => CoachDb, areaId?: string) {
	return defineTool({
		name: "get_progress",
		description: "Get every skill with whether it has been taught and its current readiness, computed from the learner's attempts.",
		run() {
			const skills = skillProgress(getDb())
				.filter((s) => !areaId || s.areaId === areaId)
				.map((s) => ({
				id: s.id,
				name: s.name,
				areaId: s.areaId,
				specialist: s.specialist,
				taught: s.taught,
				readiness: { ...s.readiness },
			}));
			return { output: { skills } };
		},
	});
}

export function makePresentQuestionTool(
	getDb: () => CoachDb,
	sessionId: string,
	onPresented?: (question: PublicQuestion, purpose: "lesson-check" | "followup") => void,
) {
	return defineTool({
		name: "present_question",
		description:
			"Put a question on the learner's screen and end your turn; their answer arrives as the next message. Use purpose 'lesson-check' with skillId for a check on a skill, or 'followup' with afterQuestionId for a related question after one they just answered.",
		input: v.object({
			purpose: v.picklist(["lesson-check", "followup"]),
			skillId: v.optional(v.string()),
			afterQuestionId: v.optional(v.string()),
		}),
		run({ data }) {
			const db = getDb();
			let question;
			if (data.purpose === "lesson-check") {
				if (!data.skillId) throw new Error("skillId is required when purpose is lesson-check");
				question = nextPracticeQuestion(db, { skillIds: [data.skillId], sessionId });
			} else {
				if (!data.afterQuestionId) throw new Error("afterQuestionId is required when purpose is followup");
				question = followupQuestion(db, { questionId: data.afterQuestionId, sessionId });
			}
			if (!question) return { output: { question: null, reason: "no-questions" } };
			onPresented?.(question, data.purpose);
			return { output: { question: { ...question }, purpose: data.purpose }, terminate: true };
		},
	});
}

export function makeQuestionDetailsTool(getDb: () => CoachDb, sessionId: string) {
	return defineTool({
		name: "get_question_details",
		description:
			"Get a question's full details (body, answer key, explanation, sources, subtopics) so you can explain it after the learner has answered. Refuses for a question the learner has not answered yet in this session.",
		input: v.object({ questionId: v.string() }),
		run({ data }) {
			const db = getDb();
			const r = db.raw.prepare("SELECT * FROM questions WHERE id = ?").get(data.questionId);
			if (!r) throw new UnknownQuestionError(data.questionId);
			// The key must not shape the lesson before the learner has answered.
			const answered = db.raw
				.prepare("SELECT 1 FROM attempts WHERE question_id = ? AND session_id = ? LIMIT 1")
				.get(data.questionId, sessionId);
			if (!answered) throw new Error(`The learner has not answered question ${data.questionId} yet; its details are available only after they answer.`);
			return {
				output: {
					id: r.id as string,
					skillId: r.skill_id as string,
					format: r.format as string,
					body: JSON.parse(r.body as string),
					key: JSON.parse(r.key as string),
					explanation: JSON.parse(r.explanation as string),
					sources: JSON.parse(r.sources as string),
					subtopics: JSON.parse(r.subtopics as string),
				},
			};
		},
	});
}

// Once the coach has handed the turn to the learner (a question is on screen), any further
// call in that response does nothing and ends the turn. A Flue tool batch ends the turn only
// when every result in it terminates, so each refused call must terminate too.
const WAITING = {
	output: { ignored: "Your turn is over: the learner has the floor. Call nothing more and wait for their next message." },
	terminate: true,
} as const;

type AnyTool = ToolDefinition<any, any, false, false>;

/** The same tool, refusing to run (and ending the turn) while isWaiting() is true. */
export function gateWhileWaiting<T extends AnyTool>(tool: T, isWaiting: () => boolean): T {
	return defineTool({ ...tool, run: (ctx: never) => (isWaiting() ? WAITING : tool.run(ctx)) } as AnyTool) as T;
}

/** The same tool; when endsTurn() is true at call time, it runs, calls onClose and ends the turn. */
export function closesTurn<T extends AnyTool>(tool: T, endsTurn: () => boolean, onClose: () => void): T {
	return defineTool({
		...tool,
		async run(ctx: never) {
			const result = await tool.run(ctx);
			if (!endsTurn()) return result;
			onClose();
			const envelope = typeof result === "string" ? { output: result } : (result ?? {});
			return { ...envelope, terminate: true };
		},
	} as AnyTool) as T;
}

export const LESSON_PHASES = ["intro", "scenario", "check", "done"] as const;
export type LessonPhase = (typeof LESSON_PHASES)[number];

/** set_lesson; with an areaId, a skill from another area (or an unknown one) is refused, not recorded. */
export function makeSetLessonTool(areaId: string | undefined, onSet: (skillId: string, phase: LessonPhase) => void) {
	return defineTool({
		name: "set_lesson",
		description:
			"Record which skill the lesson teaches and which phase it is in (intro, scenario). present_question records the check phase itself.",
		input: v.object({ skillId: v.string(), phase: v.picklist(LESSON_PHASES) }),
		run({ data }) {
			let skillArea: string;
			try {
				skillArea = areaOfSkill(data.skillId);
			} catch {
				return { output: { ok: false, error: `Unknown skill ${data.skillId}.` } };
			}
			if (areaId && skillArea !== areaId) {
				return {
					output: { ok: false, error: `This lesson is in the area "${areaName(areaId)}": pick one of its skills with get_progress.` },
				};
			}
			onSet(data.skillId, data.phase);
			return { output: { ok: true } };
		},
	});
}

/**
 * Whether the learner has the floor. `waiting` is the persisted flag as this render read it
 * (an earlier turn's hand-over; agent start clears it for each new message). `handOver` also
 * records the hand-over in this render's closure, so tools and delegations later in the same
 * batch see it before it is persisted. isWaiting never writes: a delegate renders at delegation
 * time and calls it, and Flue throws on any state write during a render.
 */
export function learnerFloor(waiting: boolean, setWaiting: (value: boolean) => void) {
	let handedOver = false;
	return {
		isWaiting: () => waiting || handedOver,
		handOver: () => {
			handedOver = true;
			setWaiting(true);
		},
	};
}

export const IDLE_SPECIALIST =
	"A question is on the learner's screen and the lead's turn is over. Reply with nothing: an empty message, no tools.";

/**
 * The built-in task tool cannot be gated like our tools, so a delegation sent in the same batch as
 * present_question would run a full specialist while the learner answers. Delegates render at
 * delegation time, so while waiting the specialist gets IDLE_SPECIALIST (and no tools) instead.
 */
export function idleWhileWaiting<T extends { agent: (...args: never[]) => unknown }>(subagent: T, isWaiting: () => boolean): T {
	return {
		...subagent,
		agent: (...args: never[]) => (isWaiting() ? IDLE_SPECIALIST : subagent.agent(...args)),
	};
}
