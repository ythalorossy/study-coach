export const DEFAULT_MODEL = "minimax/MiniMax-M3";

export type ModelRole = "coach" | "specialist" | "writer" | "verifier" | "sheet";

const VARIABLE: Record<ModelRole, string> = {
	coach: "COACH_MODEL",
	specialist: "SPECIALIST_MODEL",
	writer: "WRITER_MODEL",
	verifier: "VERIFIER_MODEL",
	sheet: "FACT_SHEET_MODEL",
};

// An unset role borrows from its partner: specialists speak with the coach's voice,
// and the verifier and fact-sheet writer use the writer's model unless told otherwise.
const FALLBACK: Partial<Record<ModelRole, ModelRole>> = { specialist: "coach", verifier: "writer", sheet: "writer" };

const SPECIFIER = /^[a-z0-9][a-z0-9-]*\/\S+$/;

export function modelFor(role: ModelRole, env: Record<string, string | undefined> = process.env): string {
	const name = VARIABLE[role];
	const value = env[name]?.trim();
	if (!value) {
		const fallback = FALLBACK[role];
		return fallback ? modelFor(fallback, env) : DEFAULT_MODEL;
	}
	if (!SPECIFIER.test(value)) {
		throw new Error(`${name}="${value}" must be provider/model, for example ${DEFAULT_MODEL}`);
	}
	return value;
}
