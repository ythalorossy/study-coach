// Runs agents with `flue run` as child processes, several at once, slowing
// down when the model provider rate-limits.
import { spawn } from "node:child_process";

export const RATE_LIMITED = "rate limited (429)";

// Order matters: a used-up plan also answers 429 ("Token Plan usage limit reached"), and must stop the run, not slow it.
const PROVIDER_FAILURES: [RegExp, string][] = [
	[/usage limit|insufficient[_ ]quota|quota (?:exceeded|exhausted)|out of credits/i, "usage limit reached"],
	[/\b429\b|rate[_ -]?limit|too many requests/i, RATE_LIMITED],
	[/\b40[13]\b|unauthori[sz]ed|forbidden|authentication[_ ]error|invalid api key/i, "authentication failed (401/403)"],
];

/** Names the provider failure in a failed `flue run` output (stdout envelope plus stderr), or null for anything else. */
export function classifyProviderFailure(output: string): string | null {
	for (const [re, label] of PROVIDER_FAILURES) if (re.test(output)) return label;
	return null;
}

/** Thrown when a run fails on the model provider; `label` is one of classifyProviderFailure's names. */
export class ProviderFailure extends Error {
	label: string;
	constructor(message: string, label: string) {
		super(message);
		this.name = "ProviderFailure";
		this.label = label;
	}
}

export interface FlueRunResult {
	status: number | null;
	stdout: string;
	stderr: string;
	/** True when the run was stopped for passing its time limit. */
	timedOut?: boolean;
}

export interface RunOptions {
	env?: NodeJS.ProcessEnv;
	/** Stops the run (and every process it started) after this long. */
	timeoutMs?: number;
}

// Runs are started in their own process group so a timeout can stop `npx` and the
// processes under it together; the groups are stopped too when this process is interrupted.
const groups = new Set<number>();
let forwarding = false;

function stopGroup(pid: number, signal: NodeJS.Signals): void {
	try {
		process.kill(-pid, signal);
	} catch {}
}

function forwardInterrupts(): void {
	if (forwarding) return;
	forwarding = true;
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.once(signal, () => {
			for (const pid of groups) stopGroup(pid, "SIGTERM");
			process.exit(130);
		});
	}
}

/** Runs a command, capturing its output; with a time limit, stops it and its children when the limit passes. */
export function runProcess(command: string, args: string[], opts: RunOptions = {}): Promise<FlueRunResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], env: opts.env ?? process.env, detached: true });
		const pid = child.pid;
		if (pid) {
			groups.add(pid);
			forwardInterrupts();
		}
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timers: NodeJS.Timeout[] = [];
		if (opts.timeoutMs && pid) {
			timers.push(
				setTimeout(() => {
					timedOut = true;
					stopGroup(pid, "SIGTERM");
					timers.push(setTimeout(() => stopGroup(pid, "SIGKILL"), 5_000));
				}, opts.timeoutMs),
			);
		}
		const done = (result: FlueRunResult) => {
			for (const t of timers) clearTimeout(t);
			if (pid) groups.delete(pid);
			resolve(timedOut ? { ...result, timedOut } : result);
		};
		child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
		child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
		child.on("error", (err) => done({ status: null, stdout, stderr: `${stderr}${err.message}` }));
		child.on("close", (status) => {
			// A timed-out group may leave a straggler holding the pipes; make sure it is gone.
			if (timedOut && pid) stopGroup(pid, "SIGKILL");
			done({ status, stdout, stderr });
		});
	});
}

/**
 * Flue's SQLite adapter does not wait on locks, so parallel `flue run` processes
 * sharing data/flue.db fail with "database is locked". Batch runs need no
 * conversation history after they exit: each gets an in-memory database (src/db.ts).
 */
export function flueRunEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	return { ...base, FLUE_DB_PATH: ":memory:" };
}

export function runFlue(agent: string, id: string, data: unknown, message: string, opts: RunOptions = {}): Promise<FlueRunResult> {
	const argv = ["flue", "run", agent, "--id", id, "--data", JSON.stringify(data), "--message", message, "--json"];
	return runProcess("npx", argv, { ...opts, env: flueRunEnv(opts.env ?? process.env) });
}

export interface ScheduleOptions<J> {
	parallel: number;
	run: (job: J) => Promise<void>;
	onSlowdown?: (from: number, to: number) => void;
	/** Wait before a rate-limited job runs again; 30 s by default. */
	retryDelayMs?: number;
}

export interface ScheduleResult {
	finalParallel: number;
	slowdowns: { from: number; to: number }[];
}

/**
 * Runs jobs in list order, at most `parallel` at once and one per lane. A
 * rate-limited job goes back to the front and parallelism halves (once per
 * wave of jobs started at the same level); at parallelism 1 the error is final.
 * Any other error stops new launches and rejects once running jobs settle.
 */
export function runScheduled<J extends { lane: string }>(jobs: J[], opts: ScheduleOptions<J>): Promise<ScheduleResult> {
	const queue = [...jobs];
	const busy = new Set<string>();
	const slowdowns: ScheduleResult["slowdowns"] = [];
	const retryDelayMs = opts.retryDelayMs ?? 30_000;
	let parallel = Math.max(1, opts.parallel);
	let running = 0;
	let failure: { error: unknown } | null = null;

	return new Promise((resolve, reject) => {
		const pump = () => {
			if (!failure) {
				for (let i = 0; i < queue.length && running < parallel; ) {
					if (busy.has(queue[i].lane)) i++;
					else start(queue.splice(i, 1)[0]);
				}
			}
			if (running === 0 && (failure || !queue.length)) {
				if (failure) reject(failure.error);
				else resolve({ finalParallel: parallel, slowdowns });
			}
		};

		const start = (job: J) => {
			const startedAt = parallel;
			running++;
			busy.add(job.lane);
			opts
				.run(job)
				.catch(async (error: unknown) => {
					const limited = error instanceof ProviderFailure && error.label === RATE_LIMITED;
					if (!limited || (parallel === 1 && startedAt === 1)) {
						failure ??= { error };
						return;
					}
					// Jobs started before an earlier slowdown do not halve again.
					if (parallel === startedAt) {
						const to = Math.max(1, Math.floor(parallel / 2));
						slowdowns.push({ from: parallel, to });
						opts.onSlowdown?.(parallel, to);
						parallel = to;
					}
					if (retryDelayMs) await new Promise((r) => setTimeout(r, retryDelayMs));
					queue.unshift(job);
				})
				.finally(() => {
					running--;
					busy.delete(job.lane);
					pump();
				});
		};

		pump();
	});
}
