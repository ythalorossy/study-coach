import { describe, expect, it } from "vitest";
import { formatUsage, parseUsage, sumUsage, usageEntry, type UsageEntry } from "../../src/coach/usage-log.ts";

const usage = { input: 1000, output: 200, cacheRead: 50, cacheWrite: 0, totalTokens: 1250, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.0004 } };
const turn = {
	type: "turn",
	conversationId: "scratch-1",
	purpose: "agent",
	request: { requestedModel: "minimax/MiniMax-M3", providerId: "minimax", providerName: "minimax", api: "anthropic-messages" },
	response: { usage },
	isError: false,
};
const now = new Date("2026-10-26T12:00:00Z");

describe("usageEntry", () => {
	it("records a model call's usage under the run id the generator passed in", () => {
		expect(usageEntry(turn, { GENERATE_RUN_ID: "gen-a-1" }, now)).toEqual({
			ts: "2026-10-26T12:00:00.000Z",
			runId: "gen-a-1",
			model: "minimax/MiniMax-M3",
			input: 1000,
			output: 200,
			cacheRead: 50,
			cacheWrite: 0,
			totalTokens: 1250,
			cost: 0.0004,
		});
	});
	it("falls back to the conversation id, and skips events without usage", () => {
		expect(usageEntry(turn, {}, now)?.runId).toBe("scratch-1");
		expect(usageEntry({ type: "tool" }, {}, now)).toBeNull();
		expect(usageEntry({ ...turn, response: {} }, {}, now)).toBeNull();
	});
});

const entry = (runId: string, model: string, totalTokens: number, cost = 0.001): UsageEntry => ({
	ts: "t",
	runId,
	model,
	input: totalTokens - 100,
	output: 100,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens,
	cost,
});

describe("parseUsage and sumUsage", () => {
	it("keeps the given runs (and their retries), skips torn lines, and totals per model", () => {
		const lines = [entry("r1", "m3", 1000), entry("r1-retry", "flash", 500), entry("other", "m3", 9999)].map((e) => JSON.stringify(e));
		const text = `${lines[0]}\n{"runId":"r1","mod\n${lines[1]}\n${lines[2]}\n`;
		const entries = parseUsage(text, new Set(["r1", "r1-retry"]));
		expect(entries.map((e) => e.runId)).toEqual(["r1", "r1-retry"]);
		expect(sumUsage(entries)).toEqual({
			m3: { calls: 1, input: 900, output: 100, totalTokens: 1000, cost: 0.001 },
			flash: { calls: 1, input: 400, output: 100, totalTokens: 500, cost: 0.001 },
		});
	});
});

describe("formatUsage", () => {
	it("prints tokens per model and per saved question", () => {
		const totals = sumUsage([entry("r", "minimax/MiniMax-M3", 1_500_000, 0.5), entry("r", "minimax/MiniMax-M3.1-Flash", 500_000, 0.1)]);
		expect(formatUsage(totals, 4)).toBe(
			"Tokens: minimax/MiniMax-M3 1.50M ($0.50), minimax/MiniMax-M3.1-Flash 0.50M ($0.10); 500k per saved question ($0.15)",
		);
		expect(formatUsage({}, 0)).toBe("Tokens: none recorded");
	});
});
