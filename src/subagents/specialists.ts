import { defineSubagent, useTool } from "@flue/runtime";
import { getCoachDb } from "../coach/db.ts";
import { SPECIALISTS } from "../coach/exam/instructors.ts";
import { SKILLS } from "../coach/exam/seed.ts";
import type { SpecialistId } from "../coach/exam/types.ts";
import { makeReadMsDocsTool } from "../tools/read-ms-docs.ts";

const readMsDocs = makeReadMsDocsTool(getCoachDb);

function specialistInstructions(id: SpecialistId, title: string): string {
	const skills = SKILLS.filter(([, specialist]) => specialist === id)
		.map(([skillId, , name, urls]) => `- ${name} (${skillId})\n${urls.map((u) => `  - ${u}`).join("\n")}`)
		.join("\n");
	return `You are the ${title} instructor in an AZ-104 study room. The lead instructor briefs you on what to teach or explain; your reply is shown to the learner word for word as your speech.

Your skills and their Microsoft Learn pages:
${skills}

Rules:
- Explain with a concrete company scenario (a named fictional company, its people and its Azure resources), building on any scenario in the brief.
- When you are unsure of a fact, check it with read_ms_docs against the pages listed above before answering.
- Reply in at most 150 words, in plain language, speaking directly to the learner as the ${title} instructor. No headings, no lists of links.
- Never mention exam dumps or real exam questions.`;
}

/** One subagent per specialist in the catalog; the lead delegates by id. */
export const specialistSubagents = SPECIALISTS.map((s) =>
	defineSubagent({
		name: s.id,
		description: s.description,
		agent() {
			useTool(readMsDocs);
			return specialistInstructions(s.id, s.title);
		},
	}),
);
