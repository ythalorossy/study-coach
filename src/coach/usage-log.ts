// Token usage of generation runs, one line per model call, read back by the generator
// to compare models. `flue run` loads only the agent module, so the writer registers it.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { observe } from "@flue/runtime";

export const USAGE_LOG_PATH = "./data/generate-usage.jsonl";

export interface UsageEntry {
	ts: string;
	runId: string;
	model: string;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	totalTokens: number;
	cost: number;
}

interface TurnLike {
	type: string;
	conversationId?: string;
	request?: { requestedModel?: string };
	response?: { usage?: { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number; cost: { total: number } } };
}

/**
 * The usage of one completed model call, or null for any other event. The verifier
 * runs in its own scratch conversation, so the generator's run id (GENERATE_RUN_ID)
 * ties its calls to the run; without it the conversation id is used.
 */
export function usageEntry(event: TurnLike, env: Record<string, string | undefined> = process.env, now = new Date()): UsageEntry | null {
	const usage = event.response?.usage;
	if (event.type !== "turn" || !usage) return null;
	return {
		ts: now.toISOString(),
		runId: env.GENERATE_RUN_ID ?? event.conversationId ?? "unknown",
		model: event.request?.requestedModel ?? "unknown",
		input: usage.input,
		output: usage.output,
		cacheRead: usage.cacheRead,
		cacheWrite: usage.cacheWrite,
		totalTokens: usage.totalTokens,
		cost: usage.cost.total,
	};
}

let recording = false;

/** Appends every model call's usage in this process to `path`; registers once. */
export function recordUsage(path = USAGE_LOG_PATH): void {
	if (recording) return;
	recording = true;
	observe((event) => {
		const entry = usageEntry(event as TurnLike);
		if (!entry) return;
		mkdirSync(dirname(path), { recursive: true });
		appendFileSync(path, `${JSON.stringify(entry)}\n`);
	});
}

/** The entries of the given runs; a torn line (parallel writers) is skipped. */
export function parseUsage(text: string, runIds: Set<string>): UsageEntry[] {
	const entries: UsageEntry[] = [];
	for (const line of text.split("\n")) {
		if (!line.trim()) continue;
		try {
			const e = JSON.parse(line) as UsageEntry;
			if (runIds.has(e.runId)) entries.push(e);
		} catch {}
	}
	return entries;
}

export interface UsageTotals {
	calls: number;
	input: number;
	output: number;
	totalTokens: number;
	cost: number;
}

export function sumUsage(entries: UsageEntry[]): Record<string, UsageTotals> {
	const totals: Record<string, UsageTotals> = {};
	for (const e of entries) {
		const t = (totals[e.model] ??= { calls: 0, input: 0, output: 0, totalTokens: 0, cost: 0 });
		t.calls++;
		t.input += e.input;
		t.output += e.output;
		t.totalTokens += e.totalTokens;
		t.cost += e.cost;
	}
	return totals;
}

const millions = (n: number) => `${(n / 1_000_000).toFixed(2)}M`;
const dollars = (n: number) => `$${n.toFixed(2)}`;

/** One summary line: tokens and estimated cost per model, and per saved question. */
export function formatUsage(totals: Record<string, UsageTotals>, saved: number): string {
	const models = Object.entries(totals);
	if (!models.length) return "Tokens: none recorded";
	const parts = models.map(([model, t]) => `${model} ${millions(t.totalTokens)} (${dollars(t.cost)})`);
	const tokens = models.reduce((n, [, t]) => n + t.totalTokens, 0);
	const cost = models.reduce((n, [, t]) => n + t.cost, 0);
	const per = saved > 0 ? `; ${Math.round(tokens / saved / 1000)}k per saved question (${dollars(cost / saved)})` : "";
	return `Tokens: ${parts.join(", ")}${per}`;
}
