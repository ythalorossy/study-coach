import { existsSync, readFileSync } from "node:fs";
import { parseArgs, parseEnv } from "node:util";
import { GENERATE_LOG_PATH } from "../src/agents/question-writer.ts";
import { openCoachDb, type CoachDb } from "../src/coach/db.ts";
import { DEFAULT_MODEL, modelFor } from "../src/coach/models.ts";
import { COVERAGE_TARGET } from "../src/coach/readiness.ts";
import { SKILLS } from "../src/coach/seed.ts";
import { formatUsage, parseUsage, sumUsage, USAGE_LOG_PATH } from "../src/coach/usage-log.ts";
import type { QuestionFormat } from "../src/coach/types.ts";
import { classifyProviderFailure, ProviderFailure, runFlue, runScheduled, type FlueRunResult } from "./flue-jobs.ts";

export { classifyProviderFailure };

// One question per writer conversation keeps each conversation short
const BATCH_MAX = 1;

export type Counts = Record<string, Partial<Record<QuestionFormat, number>>>;
export interface Batch {
	skillId: string;
	format: QuestionFormat;
	count: number;
}

export function planBatches(
	counts: Counts,
	target: Record<QuestionFormat, number>,
	filter: { skill?: string; format?: QuestionFormat },
	batchMax = BATCH_MAX,
): Batch[] {
	const batches: Batch[] = [];
	for (const [skillId, byFormat] of Object.entries(counts)) {
		if (filter.skill && skillId !== filter.skill) continue; // --skill filter
		for (const format of Object.keys(target) as QuestionFormat[]) {
			if (filter.format && format !== filter.format) continue; // --format filter
			let short = target[format] - (byFormat[format] ?? 0); // questions still missing
			while (short > 0) {
				// Split the shortfall into batches of at most batchMax
				const count = Math.min(batchMax, short);
				batches.push({ skillId, format, count });
				short -= count;
			}
		}
	}
	return batches;
}

// Verified questions per skill and format, straight from the database
function verifiedCounts(db: CoachDb): Counts {
	const counts: Counts = Object.fromEntries(SKILLS.map(([id]) => [id, {}])); // every skill starts empty
	const rows = db.raw
		.prepare("SELECT skill_id, format, COUNT(*) AS n FROM questions WHERE status = 'verified' GROUP BY skill_id, format")
		.all() as { skill_id: string; format: QuestionFormat; n: number }[];
	for (const r of rows) (counts[r.skill_id] ??= {})[r.format] = r.n;
	return counts;
}

function verifiedCount(db: CoachDb, skillId: string, format: QuestionFormat): number {
	return verifiedCounts(db)[skillId]?.[format] ?? 0;
}

// One line of the writer's admission log
export interface LogEntry {
	runId: string;
	saved: boolean;
	reason?: string;
	detail?: string;
}

export function parseLog(text: string, runId: string): LogEntry[] {
	const entries: LogEntry[] = [];
	for (const line of text.split("\n")) {
		if (!line.trim()) continue;
		try {
			const e = JSON.parse(line) as LogEntry;
			if (e.runId === runId) entries.push(e); // keep only this run's lines
		} catch {} // torn line from parallel writers: skip it
	}
	return entries;
}

function logFor(runId: string): LogEntry[] {
	return existsSync(GENERATE_LOG_PATH) ? parseLog(readFileSync(GENERATE_LOG_PATH, "utf8"), runId) : [];
}

// The provider failure (quota, key, rate limit) behind a batch, or null
export function providerFailureOf(child: FlueRunResult, log: LogEntry[]): string | null {
	// The verifier's errors are caught into the log, so look there first
	for (const e of log) {
		const provider = e.reason === "verifier-failed" && e.detail ? classifyProviderFailure(e.detail) : null;
		if (provider) return provider;
	}
	if (child.status === 0) return null;
	// Only JSON lines of stdout (the envelope); plain text there quotes documentation
	const envelopes = child.stdout.split("\n").filter((line) => {
		if (!line.trim().startsWith("{")) return false;
		try {
			JSON.parse(line);
			return true;
		} catch {
			return false;
		}
	});
	// stderr also streams the model's own reasoning (indented); only flue's error lines name a provider failure
	const errors = child.stderr.split("\n").filter((line) => line.startsWith("Error"));
	return classifyProviderFailure(`${errors.join("\n")}\n${envelopes.join("\n")}`);
}

export type WriterTrouble = "timeout" | "model error";

// Why the writer broke off without a provider failure, or null
export function writerTroubleOf(child: FlueRunResult): WriterTrouble | null {
	if (child.timedOut) return "timeout";
	if (child.status === 0) return null;
	const errors = child.stderr.split("\n").filter((line) => line.startsWith("Error"));
	return errors.some((line) => /Unhandled stop reason/.test(line)) ? "model error" : null;
}

// The environment `flue run` will see: .env only fills what the command line left unset
export function effectiveEnv(base: NodeJS.ProcessEnv, envFileText: string): NodeJS.ProcessEnv {
	const env = { ...base };
	for (const [key, value] of Object.entries(parseEnv(envFileText))) if (env[key] === undefined) env[key] = value;
	return env;
}

// Retry environment: the fallback writer, with the same verifier as the first attempt
export function retryEnv(base: NodeJS.ProcessEnv, envFileText: string, fallbackModel: string): NodeJS.ProcessEnv {
	const verifier = modelFor("verifier", effectiveEnv(base, envFileText)); // pin it so the fallback doesn't change it
	return { ...base, WRITER_MODEL: fallbackModel, VERIFIER_MODEL: verifier };
}

export interface Attempt {
	saved: number;
	child: FlueRunResult;
}

export async function runWithRetry(
	runId: string,
	batch: Batch,
	attempt: (runId: string, env?: NodeJS.ProcessEnv) => Promise<Attempt>,
	fallback: NodeJS.ProcessEnv,
): Promise<{ saved: number; trouble: WriterTrouble | null }> {
	const first = await attempt(runId);
	const trouble = writerTroubleOf(first.child);
	// No retry if the writer was fine or already saved everything
	if (!trouble || first.saved >= batch.count) return { saved: first.saved, trouble };
	const second = await attempt(`${runId}-retry`, fallback); // one retry with the fallback model
	return { saved: first.saved + second.saved, trouble };
}

// "reason 3 (30%), other 1 (10%)", or "none"
export function formatReasons(reasons: Record<string, number>, attempts: number): string {
	const parts = Object.entries(reasons).map(([r, n]) => `${r} ${n} (${Math.round((100 * n) / Math.max(1, attempts))}%)`);
	return parts.length ? parts.join(", ") : "none";
}

interface SkillSummary {
	saved: number;
	attempts: number;
	rejections: Record<string, number>; // by reason
	troubles: Record<string, number>; // writer runs that were retried, by kind
}

interface RetryPolicy {
	timeoutMs: number;
	fallbackModel: string;
	env: NodeJS.ProcessEnv;
}

function formatTroubles(troubles: Record<string, number>): string {
	const parts = Object.entries(troubles).map(([t, n]) => `${t} ${n}`);
	return parts.length ? `; retried after ${parts.join(", ")}` : "";
}

let runSeq = 0;
const runIds = new Set<string>(); // every writer run of this invocation, to total token usage later

// One batch per skill at a time (the scheduler's lane), so the count delta is this batch's
async function runBatch(db: CoachDb, batch: Batch, summary: SkillSummary, policy: RetryPolicy): Promise<number> {
	const runId = `gen-${batch.skillId}-${batch.format}-${Date.now()}-${++runSeq}`;
	const { saved, trouble } = await runWithRetry(runId, batch, (id, env) => runAttempt(db, id, batch, summary, policy, env), policy.env);
	if (trouble) summary.troubles[trouble] = (summary.troubles[trouble] ?? 0) + 1;
	return saved;
}

// One writer run: launch it, then measure what it saved and why it rejected the rest
async function runAttempt(
	db: CoachDb,
	runId: string,
	batch: Batch,
	summary: SkillSummary,
	policy: RetryPolicy,
	env?: NodeJS.ProcessEnv,
): Promise<Attempt> {
	const before = verifiedCount(db, batch.skillId, batch.format); // baseline to measure the delta
	const writer = env ? ` with ${policy.fallbackModel}` : "";
	console.log(`${runId}: writing ${batch.count} ${batch.format} question(s) for ${batch.skillId}${writer}`);
	const data = { skillId: batch.skillId, format: batch.format, count: batch.count };
	runIds.add(runId);
	const runEnv = { ...(env ?? process.env), GENERATE_RUN_ID: runId }; // the writer tags its log lines with this id
	const child = await runFlue("src/agents/question-writer.ts", runId, data, "Write the questions.", { env: runEnv, timeoutMs: policy.timeoutMs });
	// Show what the run printed if it did not finish cleanly
	if (child.stderr) process.stderr.write(child.stderr);
	if (child.timedOut) console.error(`${runId}: stopped after ${policy.timeoutMs / 60_000} min`);
	else if (child.status !== 0) {
		console.error(`${runId}: flue run failed (exit ${child.status})`);
		if (child.stdout) console.error(child.stdout);
	}
	const saved = verifiedCount(db, batch.skillId, batch.format) - before; // new verified questions
	const log = logFor(runId);
	// Tally rejection reasons from this run's log
	const rejections: Record<string, number> = {};
	for (const e of log) if (!e.saved && e.reason) rejections[e.reason] = (rejections[e.reason] ?? 0) + 1;
	// Counted before any provider failure is thrown, so a retried batch keeps what it saved
	summary.saved += saved;
	summary.attempts += log.length;
	for (const [r, n] of Object.entries(rejections)) summary.rejections[r] = (summary.rejections[r] ?? 0) + n;
	console.log(`${runId}: saved ${saved}/${batch.count}, rejected: ${formatReasons(rejections, log.length)}`);
	const provider = providerFailureOf(child, log);
	if (provider) throw new ProviderFailure(`${runId}: provider failure, ${provider}`, provider); // stops the whole run
	return { saved, child };
}

// Parallelism the run ended at: the last slowdown's target, or where it started
export function parallelAfter(start: number, slowdowns: { from: number; to: number }[]): number {
	return slowdowns.at(-1)?.to ?? start;
}

// 125 minutes -> "2h05m"
function elapsed(ms: number): string {
	const minutes = Math.round(ms / 60_000);
	return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}m`;
}

async function main(): Promise<void> {
	// Options
	const { values } = parseArgs({
		options: {
			skill: { type: "string" },
			format: { type: "string" },
			"until-target": { type: "boolean", default: false },
			parallel: { type: "string" },
			"question-timeout": { type: "string" },
			"fallback-model": { type: "string" },
		},
	});
	const startParallel = Number(values.parallel ?? process.env.GENERATE_PARALLEL ?? 6);
	if (!Number.isInteger(startParallel) || startParallel < 1) {
		console.error(`--parallel must be a whole number of at least 1, got ${values.parallel ?? process.env.GENERATE_PARALLEL}`);
		process.exit(1);
	}
	const timeoutMinutes = Number(values["question-timeout"] ?? 10);
	if (!(timeoutMinutes > 0)) {
		console.error(`--question-timeout must be a number of minutes above 0, got ${values["question-timeout"]}`);
		process.exit(1);
	}

	// Retry settings and the models in use
	const fallbackModel = values["fallback-model"] ?? DEFAULT_MODEL;
	const envFileText = existsSync(".env") ? readFileSync(".env", "utf8") : "";
	const policy: RetryPolicy = {
		timeoutMs: timeoutMinutes * 60_000,
		fallbackModel,
		env: retryEnv(process.env, envFileText, fallbackModel),
	};
	const models = effectiveEnv(process.env, envFileText);
	console.log(
		`Writer ${modelFor("writer", models)}, verifier ${modelFor("verifier", models)}; a question that runs past ${timeoutMinutes} min or hits a model error is retried once with ${fallbackModel}.`,
	);

	// Validate the --skill and --format filters
	const skillIds = SKILLS.map(([id]) => id);
	const formats = Object.keys(COVERAGE_TARGET) as QuestionFormat[];
	if (values.skill && !skillIds.includes(values.skill)) {
		console.error(`Unknown skill ${values.skill}. Known skills: ${skillIds.join(", ")}`);
		process.exit(1);
	}
	if (values.format && !formats.includes(values.format as QuestionFormat)) {
		console.error(`Unknown format ${values.format}. Known formats: ${formats.join(", ")}`);
		process.exit(1);
	}
	const filter = { skill: values.skill, format: values.format as QuestionFormat | undefined };

	const db = openCoachDb(process.env.COACH_DB_PATH ?? "./data/coach.db");
	const summaries = new Map<string, SkillSummary>(); // per skill, filled as batches run
	const startedAt = Date.now();
	let parallel = startParallel;
	const slowdowns: { from: number; to: number }[] = [];
	let providerError: string | undefined;
	try {
		// Each pass plans what is missing and runs it; --until-target repeats passes
		for (;;) {
			const plan = planBatches(verifiedCounts(db), COVERAGE_TARGET, filter);
			if (!plan.length) break; // at target
			let passSaved = 0;
			const stalled = new Set<string>();
			const result = await runScheduled(
				plan.map((b) => ({ ...b, lane: b.skillId })), // one lane per skill
				{
					parallel,
					onSlowdown(from, to) {
						slowdowns.push({ from, to });
						console.warn(`Rate limit hit: parallel ${from} → ${to}`);
					},
					async run(batch) {
						const key = `${batch.skillId}/${batch.format}`;
						// A skill/format stops for this pass once a batch saves nothing
						if (stalled.has(key)) return;
						let summary = summaries.get(batch.skillId);
						if (!summary) summaries.set(batch.skillId, (summary = { saved: 0, attempts: 0, rejections: {}, troubles: {} }));
						const saved = await runBatch(db, batch, summary, policy);
						passSaved += saved;
						if (saved === 0) stalled.add(key);
					},
				},
			);
			parallel = result.finalParallel; // keep any slowdown for the next pass
			if (!values["until-target"] || passSaved === 0) break; // a pass that saved nothing would loop forever
		}
	} catch (e) {
		if (!(e instanceof ProviderFailure)) throw e;
		providerError = e.message; // report it in the summary below
	}

	if (!summaries.size) {
		console.log("Nothing to generate: every selected skill is at target.");
		return;
	}

	// Per-skill summary, with what is still short
	const remaining = planBatches(verifiedCounts(db), COVERAGE_TARGET, filter);
	if (providerError) console.error(`\nStopping: ${providerError}. Fix the provider (quota, key) and rerun.`);
	console.log("\nSummary:");
	for (const [skillId, s] of summaries) {
		const short = formats
			.map((f) => [f, remaining.filter((b) => b.skillId === skillId && b.format === f).reduce((n, b) => n + b.count, 0)] as const)
			.filter(([, n]) => n > 0)
			.map(([f, n]) => `${f} ${n}`);
		console.log(
			`${skillId}: saved ${s.saved}; still short: ${short.length ? short.join(", ") : "none"}; rejections: ${formatReasons(s.rejections, s.attempts)}${formatTroubles(s.troubles)}`,
		);
	}

	// Totals across all skills
	const total = { saved: 0, attempts: 0, rejections: {} as Record<string, number>, troubles: {} as Record<string, number> };
	for (const s of summaries.values()) {
		total.saved += s.saved;
		total.attempts += s.attempts;
		for (const [r, n] of Object.entries(s.rejections)) total.rejections[r] = (total.rejections[r] ?? 0) + n;
		for (const [t, n] of Object.entries(s.troubles)) total.troubles[t] = (total.troubles[t] ?? 0) + n;
	}
	const ms = Date.now() - startedAt;
	const perHour = Math.round(total.saved / Math.max(ms / 3_600_000, 1 / 60)); // floor the duration at 1 min
	console.log(`\nAll skills: saved ${total.saved} of ${total.attempts} attempts; rejections: ${formatReasons(total.rejections, total.attempts)}${formatTroubles(total.troubles)}`);
	const endParallel = parallelAfter(startParallel, slowdowns);
	console.log(`Elapsed ${elapsed(ms)}, saved ${total.saved} (${perHour}/hour), parallel ${startParallel}→${endParallel}`);
	// Token usage of this invocation's runs only
	const usage = existsSync(USAGE_LOG_PATH) ? parseUsage(readFileSync(USAGE_LOG_PATH, "utf8"), runIds) : [];
	console.log(formatUsage(sumUsage(usage), total.saved));
	if (slowdowns.length) console.log(`Rate limit hit: parallel ${slowdowns.map((s) => `${s.from} → ${s.to}`).join(", then ")}`);
	if (providerError) process.exitCode = 2; // non-zero so callers know it stopped early
}

if (import.meta.main) await main();
