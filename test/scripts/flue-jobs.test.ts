import { describe, expect, it } from "vitest";
import { flueRunEnv, ProviderFailure, RATE_LIMITED, runProcess, runScheduled } from "../../scripts/flue-jobs.ts";

const tick = () => new Promise((r) => setTimeout(r, 1));

function tracker() {
	const live = new Map<string, number>();
	let total = 0;
	const max = { total: 0, lane: 0 };
	const ran: string[] = [];
	return {
		max,
		ran,
		async run(job: { id: string; lane: string }) {
			total++;
			live.set(job.lane, (live.get(job.lane) ?? 0) + 1);
			max.total = Math.max(max.total, total);
			max.lane = Math.max(max.lane, live.get(job.lane)!);
			await tick();
			total--;
			live.set(job.lane, live.get(job.lane)! - 1);
			ran.push(job.id);
		},
	};
}

const jobs = (lanes: string[]) => lanes.map((lane, i) => ({ id: `j${i + 1}`, lane }));

describe("runScheduled", () => {
	it("never runs two jobs of one lane at once and caps total concurrency", async () => {
		const t = tracker();
		const result = await runScheduled(jobs(["a", "a", "b", "c", "d", "e"]), { parallel: 3, run: t.run, retryDelayMs: 0 });
		expect(t.max).toEqual({ total: 3, lane: 1 });
		expect(t.ran.sort()).toEqual(["j1", "j2", "j3", "j4", "j5", "j6"]);
		expect(result).toEqual({ finalParallel: 3, slowdowns: [] });
	});

	it("halves parallelism on a 429 and retries the job", async () => {
		const t = tracker();
		let failed = false;
		const result = await runScheduled(jobs(["a", "b", "c", "d", "e"]), {
			parallel: 4,
			retryDelayMs: 0,
			async run(job) {
				if (job.id === "j2" && !failed) {
					failed = true;
					throw new ProviderFailure("j2: provider failure", RATE_LIMITED);
				}
				await t.run(job);
			},
		});
		expect(result.slowdowns).toEqual([{ from: 4, to: 2 }]);
		expect(t.ran.sort()).toEqual(["j1", "j2", "j3", "j4", "j5"]);
	});

	it("halves once when jobs started together all hit the 429", async () => {
		const result = await runScheduled(jobs(["a", "b", "c", "d"]), {
			parallel: 4,
			retryDelayMs: 0,
			async run(job) {
				await tick();
				if (!job.id.endsWith("!")) {
					job.id += "!";
					throw new ProviderFailure("x", RATE_LIMITED);
				}
			},
		});
		expect(result.slowdowns).toEqual([{ from: 4, to: 2 }]);
	});

	it("gives up when a 429 happens at parallelism 1", async () => {
		const run = async () => {
			throw new ProviderFailure("x", RATE_LIMITED);
		};
		await expect(runScheduled(jobs(["a"]), { parallel: 1, run, retryDelayMs: 0 })).rejects.toMatchObject({ label: RATE_LIMITED });
	});

	it("stops launching after a non-rate-limit failure", async () => {
		const ran: string[] = [];
		const run = async (job: { id: string }) => {
			ran.push(job.id);
			if (job.id === "j1") throw new ProviderFailure("x", "usage limit reached");
		};
		await expect(runScheduled(jobs(["a", "b"]), { parallel: 1, run, retryDelayMs: 0 })).rejects.toMatchObject({
			label: "usage limit reached",
		});
		expect(ran).toEqual(["j1"]);
	});
});

describe("flueRunEnv", () => {
	it("gives each batch run its own in-memory Flue database, so parallel runs never lock data/flue.db", () => {
		expect(flueRunEnv({ PATH: "/bin", FLUE_DB_PATH: "./data/flue.db" })).toEqual({ PATH: "/bin", FLUE_DB_PATH: ":memory:" });
	});
});

describe("runProcess", () => {
	const alive = (pid: number) => {
		try {
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	};

	it("returns the output of a run that finishes in time", async () => {
		const result = await runProcess(process.execPath, ["-e", "console.log('hi'); console.error('oops')"], { timeoutMs: 10_000 });
		expect(result).toEqual({ status: 0, stdout: "hi\n", stderr: "oops\n" });
	});

	it("stops a run that passes its time limit, together with the processes it started", async () => {
		// The child starts a grandchild (as npx starts flue) and both would sleep for 30 s.
		const script = `const c = require("node:child_process").spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: "ignore" });
			console.log(c.pid); setTimeout(() => {}, 30000);`;
		const started = Date.now();
		const result = await runProcess(process.execPath, ["-e", script], { timeoutMs: 300 });
		expect(result.timedOut).toBe(true);
		expect(Date.now() - started).toBeLessThan(5_000);
		const grandchild = Number(result.stdout.trim());
		await new Promise((r) => setTimeout(r, 100));
		expect(alive(grandchild)).toBe(false);
	});
});
