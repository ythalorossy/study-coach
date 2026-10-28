import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Evals run against the live model, so they get their own discovery, timeouts
// and credentials (only model choices and provider keys from .env reach the test process).
export default defineConfig({
	test: {
		include: ["src/evals/**/*.eval.ts"],
		environment: "node",
		testTimeout: 1_200_000,
		hookTimeout: 120_000,
		env: loadEnv("", process.cwd(), [
			"COACH_MODEL",
			"SPECIALIST_MODEL",
			"WRITER_MODEL",
			"VERIFIER_MODEL",
			"MINIMAX_",
			"ANTHROPIC_",
			"OPENAI_",
			"GEMINI_",
			"OPENROUTER_",
			"DEEPSEEK_",
			"MISTRAL_",
			"XAI_",
		]),
	},
});
