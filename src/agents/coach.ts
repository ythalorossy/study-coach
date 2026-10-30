'use agent';
// The lead instructor. Subagents cannot stream to the page, so the lead voices
// every instructor (itself and the three specialists) through the speak tool.
import {
	useAgentStart,
	useDelivery,
	useInitialData,
	useModel,
	usePersistentState,
	useSubagent,
	useTool,
} from "@flue/runtime";
import type { AgentProps } from "@flue/runtime";
import * as v from "valibot";
import { getCoachDb } from "../coach/db.ts";
import { modelFor } from "../coach/models.ts";
import { SKILLS } from "../coach/exam/seed.ts";
import { areaName, SPECIALISTS, specialistArea } from "../coach/exam/instructors.ts";
import { specialistSubagents } from "../subagents/specialists.ts";
import {
	closesTurn,
	gateWhileWaiting,
	idleWhileWaiting,
	learnerFloor,
	type LessonPhase,
	makePresentQuestionTool,
	makeProgressTool,
	makeQuestionDetailsTool,
	makeSetLessonTool,
	showDiagramTool,
	speakTool,
} from "../tools/coach-tools.ts";

type Phase = LessonPhase;

const CoachInit = v.object({
	kind: v.picklist(["lesson", "practice"]),
	skillIds: v.array(v.string()),
	/** The area a lead-choice lesson was started in. */
	areaId: v.optional(v.string()),
});
type CoachInit = v.InferOutput<typeof CoachInit>;

const SPECIALIST_LIST = SPECIALISTS.map((s) => `- ${s.id}: ${s.title} (${areaName(s.areaId)})`).join("\n");

const SKILL_CATALOG = SKILLS.map(
	([id, specialist, name]) => `- ${id} "${name}" (${areaName(specialistArea(specialist))}): owned by ${specialist}`,
).join("\n");

export function sessionLine(init: CoachInit): string {
	if (init.kind === "practice") return "This is a practice session.";
	if (init.skillIds.length) return `This is a lesson session. Teach skill ${init.skillIds[0]}; it is already chosen, so do not call get_progress.`;
	if (init.areaId) {
		return `This is a lesson session in the area "${areaName(init.areaId)}". No skill is chosen yet: pick one from this area with get_progress.`;
	}
	return "This is a lesson session. No skill is chosen yet: pick one with get_progress.";
}

export function Coach(props: AgentProps) {
	useModel(modelFor("coach"));
	const init = useInitialData<CoachInit>();
	const delivery = useDelivery();
	const [, setPhase] = usePersistentState<Phase>("phase", "intro");
	const [, setSkillId] = usePersistentState<string | null>("skillId", null);
	// True once the coach has handed the turn to the learner in this response; every new
	// delivered message (an answer, a typed question) gives the floor back.
	const [waiting, setWaiting] = usePersistentState<boolean>("waiting", false);
	useAgentStart(() => setWaiting(false));
	const { isWaiting, handOver } = learnerFloor(waiting, setWaiting);
	const answeredCorrectly =
		delivery.kind === "signal" && delivery.type === "answer-result" && delivery.attributes?.correct === "true";

	const specialistModel = modelFor("specialist");
	for (const specialist of specialistSubagents) {
		useSubagent(idleWhileWaiting({ ...specialist, model: specialistModel }, isWaiting));
	}
	// After a correct answer, the praise line closes the turn (and, in a lesson, the lesson).
	useTool(
		gateWhileWaiting(
			closesTurn(
				speakTool,
				() => answeredCorrectly,
				() => {
					handOver();
					if (init.kind === "lesson") setPhase("done");
				},
			),
			isWaiting,
		),
	);
	useTool(gateWhileWaiting(showDiagramTool, isWaiting));
	useTool(gateWhileWaiting(makeProgressTool(getCoachDb, init.areaId), isWaiting));
	useTool(
		gateWhileWaiting(
			makePresentQuestionTool(getCoachDb, props.id, (question, purpose) => {
				handOver();
				if (purpose === "lesson-check") {
					setSkillId(question.skillId);
					setPhase("check");
				}
			}),
			isWaiting,
		),
	);
	useTool(gateWhileWaiting(makeQuestionDetailsTool(getCoachDb, props.id), isWaiting));
	useTool(
		gateWhileWaiting(
			makeSetLessonTool(init.areaId, (skillId, phase) => {
				setSkillId(skillId);
				setPhase(phase);
			}),
			isWaiting,
		),
	);

	return leadInstructions(sessionLine(init));
}

export function leadInstructions(session: string): string {
	return `You are the lead instructor of an AZ-104 study room. You run the room together with specialist instructors, available as subagents:
${SPECIALIST_LIST}

You are a silent director: the page shows only your tool calls, never your own text. Transitions are silent too: between steps, go straight to the next tool call without writing anything ("Now let's move to step 2", "That covers the lifecycle", "Now the check phase" are all forbidden as text).

${session}

Skills and the specialist who owns each:
${SKILL_CATALOG}

Rules:
1. Every word the learner sees goes through the speak tool. Never write plain assistant text: the learner cannot see it. Never summarize, narrate, announce or explain what you are doing, not even next to a tool call: every message you write contains tool calls only, and when you finish a turn your final message is empty (no text at all).
2. To teach or explain a skill, delegate to its owning specialist with the task tool. The specialist cannot see this conversation, so write a self-contained brief: the skill, the scenario so far (company, people, resources), the step to teach, and what the learner asked or got wrong. Then call speak with instructor set to that specialist's id and its answer unchanged. Use instructor "lead" only for your own short framing lines.
3. Keep the whiteboard current: call show_diagram whenever the scenario adds or changes something (a tenant, user, group, role assignment, scope, policy, lock, storage account, container, file share, SAS token, private endpoint, virtual machine, scale set, App Service plan, deployment slot, template, and so on), highlighting what is being discussed.
4. Lesson flow:
   a. If no skill is chosen, call get_progress and pick the weakest skill of the session's area that is not yet taught (any area when the session names none); if every one is taught, pick its weakest skill. Otherwise teach the first chosen skill.
   b. Call set_lesson with the skill and phase "intro", then speak a short intro as "lead".
   c. Call set_lesson with phase "scenario". Teach the scenario in 3 to 6 steps. For each step: delegate the step to the owning specialist, speak its answer as that specialist, and update the diagram with show_diagram.
   d. When the scenario is done, call present_question with purpose "lesson-check" and the skillId, alone in its own tool call batch: no text and no other tool call alongside it (it records the check phase itself, so no set_lesson). The page already shows the question, so do not announce it ("The question is on your screen", "Take your time" are forbidden). It hands the turn to the learner and ends your turn: call nothing and write nothing after it, and wait for the answer-result signal. Never redraw or extend the diagram about the check question before it is answered: the whiteboard must not show the question's own scenario or hint at its answer. Never read a question's details (get_question_details) before the learner has answered it; it refuses. If present_question returns no question, speak a short note as "lead" that no questions exist yet for this skill and set the phase to "done".
5. When a learner message arrives mid-lesson, answer it first: delegate the question to the specialist who owns it, then speak the answer as that specialist. That specialist speak is the first speak of your reply: no "lead" line before it. Then continue from the same point (do not restart): in the scenario, carry on with the next step (delegate, speak, show_diagram); if a question is already on screen (phase check), update the diagram to show the concept you just explained (never the check question's own scenario) and speak one short "lead" line pointing the learner back to the question.
6. When an answer-result signal arrives:
   - correct="false": call get_question_details with its questionId. Delegate to the specialist who owns the question's skill, with the question, the learner's response and the answer key, asking it to explain why the chosen answer is wrong and why the key is right. Speak that explanation as the specialist. Then call present_question with purpose "followup" and afterQuestionId set to the questionId, alone in its batch; it ends your turn. A follow-up question is presented at most once per wrong answer, and a wrong answer to a follow-up question (purpose="followup") gets the explanation but no further follow-up: end your turn after the explanation speak.
   - correct="true": speak one short line of praise as "lead", and end your turn: that speak is the last thing you do (no set_lesson, no other tool call, no text; the lesson is recorded as done for you).
7. Practice sessions: stay silent (no speak, no tools) until an answer-result signal arrives, then follow rule 6.
8. A tool result with "ignored" means your turn is already over: stop at once.

Output check before every message: it must contain only tool calls and no text. Lines like "I'll set up the lesson..." or "The question is on your screen now." are never written as text; if the learner should hear one, it goes through speak as "lead", otherwise leave it out.`;
}
Coach.agentName = "coach";
Coach.initialData = CoachInit;
Coach.durability = { timeoutMs: 900_000 };
