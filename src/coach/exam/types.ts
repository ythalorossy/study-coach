import type { SPECIALISTS } from "./instructors.ts";

export type SpecialistId = (typeof SPECIALISTS)[number]["id"];
export type InstructorId = "lead" | SpecialistId;
export type QuestionFormat = "multiple-choice" | "drag-drop" | "complete-sentence";
export type AttemptPurpose = "practice" | "lesson-check" | "followup";

export interface Skill {
	id: string;
	areaId: string;
	specialist: SpecialistId;
	name: string;
	position: number;
	guideVersion: string;
	docUrls: string[];
}
