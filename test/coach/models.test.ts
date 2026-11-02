import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, modelFor } from "../../src/coach/models.ts";

describe("modelFor", () => {
	it("defaults every role to MiniMax", () => {
		for (const role of ["coach", "specialist", "writer", "verifier"] as const) {
			expect(modelFor(role, {})).toBe(DEFAULT_MODEL);
		}
		expect(DEFAULT_MODEL).toBe("minimax/MiniMax-M3");
	});

	it("reads each role's own variable", () => {
		const env = {
			COACH_MODEL: "anthropic/claude-sonnet-5-5",
			SPECIALIST_MODEL: "openai/gpt-5",
			WRITER_MODEL: "google/gemini-3-pro",
			VERIFIER_MODEL: "deepseek/deepseek-chat",
		};
		expect(modelFor("coach", env)).toBe("anthropic/claude-sonnet-5-5");
		expect(modelFor("specialist", env)).toBe("openai/gpt-5");
		expect(modelFor("writer", env)).toBe("google/gemini-3-pro");
		expect(modelFor("verifier", env)).toBe("deepseek/deepseek-chat");
	});

	it("lets specialists follow the coach and the verifier follow the writer", () => {
		const env = { COACH_MODEL: "anthropic/claude-sonnet-5-5", WRITER_MODEL: "openai/gpt-5" };
		expect(modelFor("specialist", env)).toBe("anthropic/claude-sonnet-5-5");
		expect(modelFor("verifier", env)).toBe("openai/gpt-5");
	});

	it("lets the fact-sheet reviewer follow the writer unless set", () => {
		expect(modelFor("reviewer", { WRITER_MODEL: "openai/gpt-5" })).toBe("openai/gpt-5");
		expect(modelFor("reviewer", { WRITER_MODEL: "openai/gpt-5", REVIEWER_MODEL: "minimax/MiniMax-M3.1-Flash" })).toBe("minimax/MiniMax-M3.1-Flash");
	});

	it("lets the fact-sheet writer follow the writer unless set", () => {
		expect(modelFor("sheet", {})).toBe(DEFAULT_MODEL);
		expect(modelFor("sheet", { WRITER_MODEL: "openai/gpt-5" })).toBe("openai/gpt-5");
		expect(modelFor("sheet", { FACT_SHEET_MODEL: "anthropic/claude-sonnet-5-5", WRITER_MODEL: "openai/gpt-5" })).toBe(
			"anthropic/claude-sonnet-5-5",
		);
	});

	it("ignores blank values", () => {
		expect(modelFor("coach", { COACH_MODEL: "  " })).toBe(DEFAULT_MODEL);
	});

	it("rejects a value that is not provider/model, naming the variable", () => {
		expect(() => modelFor("writer", { WRITER_MODEL: "gpt-5" })).toThrow(/WRITER_MODEL.*provider\/model/);
		expect(() => modelFor("coach", { COACH_MODEL: "anthropic/" })).toThrow(/COACH_MODEL/);
	});
});
