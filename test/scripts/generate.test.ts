import { describe, expect, it } from "vitest";
import {
	classifyProviderFailure,
	effectiveEnv,
	formatReasons,
	parallelAfter,
	parseLog,
	planBatches,
	providerFailureOf,
	retryEnv,
	runWithRetry,
	writerTroubleOf,
} from "../../scripts/generate.ts";
import { RATE_LIMITED } from "../../scripts/flue-jobs.ts";
import { COVERAGE_TARGET } from "../../src/coach/readiness.ts";

const full = { "multiple-choice": 8, "drag-drop": 6, "complete-sentence": 6 };

describe("planBatches", () => {
	it("plans one question per batch by default", () => {
		const target = { "multiple-choice": 2, "drag-drop": 0, "complete-sentence": 0 };
		expect(planBatches({ s: {} }, target, {})).toEqual([
			{ skillId: "s", format: "multiple-choice", count: 1 },
			{ skillId: "s", format: "multiple-choice", count: 1 },
		]);
	});

	it("fills a multiple-choice shortfall of 5 in one batch", () => {
		const counts = { "identity.sspr": { ...full, "multiple-choice": 3 } };
		expect(planBatches(counts, COVERAGE_TARGET, {}, 5)).toEqual([
			{ skillId: "identity.sspr", format: "multiple-choice", count: 5 },
		]);
	});

	it("splits a drag-drop shortfall of 6 into batches of at most 5", () => {
		const counts = { "identity.sspr": { ...full, "drag-drop": 0 } };
		expect(planBatches(counts, COVERAGE_TARGET, {}, 5)).toEqual([
			{ skillId: "identity.sspr", format: "drag-drop", count: 5 },
			{ skillId: "identity.sspr", format: "drag-drop", count: 1 },
		]);
	});

	it("plans nothing for a skill already at target", () => {
		expect(planBatches({ "identity.sspr": full }, COVERAGE_TARGET, {})).toEqual([]);
	});

	it("treats a missing format count as 0", () => {
		const counts = { "identity.sspr": { "multiple-choice": 8, "drag-drop": 6 } };
		expect(planBatches(counts, COVERAGE_TARGET, {}, 5).map((b) => b.count)).toEqual([5, 1]);
	});

	it("limits the plan to the --skill and --format filters", () => {
		const counts = {
			"identity.sspr": { "multiple-choice": 3, "drag-drop": 0 },
			"governance.locks": { "multiple-choice": 0 },
		};
		const bySkill = planBatches(counts, COVERAGE_TARGET, { skill: "governance.locks" }, 5);
		expect(new Set(bySkill.map((b) => b.skillId))).toEqual(new Set(["governance.locks"]));
		expect(planBatches(counts, COVERAGE_TARGET, { skill: "identity.sspr", format: "multiple-choice" }, 5)).toEqual([
			{ skillId: "identity.sspr", format: "multiple-choice", count: 5 },
		]);
	});
});

describe("classifyProviderFailure", () => {
	it("recognises rate limits, quota and auth failures", () => {
		const samples = [
			'{"outcome":"failed","error":{"message":"429 {\\"type\\":\\"error\\",\\"error\\":{\\"type\\":\\"rate_limit_error\\"}}"}}',
			"Agent failed: Too Many Requests (429)",
			"Agent failed: You have reached your usage limit for this period",
			'{"error":{"message":"401 Unauthorized: invalid api key"}}',
			"Agent failed: 403 Forbidden",
			"insufficient_quota",
		];
		for (const s of samples) expect(classifyProviderFailure(s), s).not.toBeNull();
	});

	it("returns null for content failures and unrelated numbers", () => {
		expect(classifyProviderFailure("Agent failed: model returned no questions")).toBeNull();
		expect(classifyProviderFailure("saved 0/3 after 14290 tokens, rejected: duplicate")).toBeNull();
		expect(classifyProviderFailure("")).toBeNull();
	});
});

describe("formatReasons", () => {
	it("formats reason rates against attempts", () => {
		expect(formatReasons({ leak: 4 }, 44)).toBe("leak 4 (9%)");
		expect(formatReasons({}, 10)).toBe("none");
	});
});

describe("providerFailureOf", () => {
	const ok = { status: 0, stdout: "", stderr: "" };
	it("finds a rate limit the verifier hit, even when the run exits 0", () => {
		const log = [{ runId: "r", saved: false, reason: "verifier-failed", detail: "429 Too Many Requests" }];
		expect(providerFailureOf(ok, log)).toBe(RATE_LIMITED);
	});
	it("ignores documentation text in stdout when a run fails for another reason", () => {
		const child = { status: 1, stdout: "tool read_ms_docs\nThe request returns 403 Forbidden when unauthorized.\n", stderr: "Error: timed out" };
		expect(providerFailureOf(child, [])).toBeNull();
	});
	it("ignores the model's reasoning in stderr when a run fails for another reason", () => {
		const stderr = "  After the team adds one allow rule, internet traffic now gets 403 unexpectedly.\n  Unauthorized callers are blocked.\nError: Agent failed: direct(sub_1) failed: Unhandled stop reason: error";
		expect(providerFailureOf({ status: 1, stdout: "", stderr }, [])).toBeNull();
	});
	it("reads stderr and the JSON envelope of a failed run", () => {
		expect(providerFailureOf({ status: 1, stdout: "", stderr: "Error: 429 rate limit" }, [])).toBe(RATE_LIMITED);
		const envelope = JSON.stringify({ id: "r", outcome: "failed", error: "401 invalid api key" });
		expect(providerFailureOf({ status: 1, stdout: `streamed text Forbidden\n${envelope}\n`, stderr: "" }, [])).toBe(
			"authentication failed (401/403)",
		);
	});
	it("does not treat other verifier failures as provider failures", () => {
		expect(providerFailureOf(ok, [{ runId: "r", saved: false, reason: "verifier-failed", detail: "result unavailable" }])).toBeNull();
	});
});

describe("parseLog", () => {
	it("keeps this run's entries and skips torn lines", () => {
		const text = `${JSON.stringify({ runId: "a", saved: true })}\n{"runId":"a","sav\n${JSON.stringify({ runId: "b", saved: false })}\n`;
		expect(parseLog(text, "a")).toEqual([{ runId: "a", saved: true }]);
	});
});

describe("provider limits", () => {
	it("treats MiniMax's plan usage limit as a usage limit, not a rate limit", () => {
		const msg = '429 {"type":"error","error":{"type":"rate_limit_error","message":"Token Plan usage limit reached: Upgrade your Token Plan or purchase Credits for more usage. (2056)"}}';
		expect(classifyProviderFailure(msg)).toBe("usage limit reached");
		expect(classifyProviderFailure("429 Too Many Requests")).toBe(RATE_LIMITED);
	});

	it("reports the parallelism the run ended at, even when it stopped on a failure", () => {
		expect(parallelAfter(6, [])).toBe(6);
		expect(parallelAfter(6, [{ from: 6, to: 3 }, { from: 3, to: 1 }])).toBe(1);
	});
});


describe("writerTroubleOf", () => {
	it("names a run stopped at its time limit", () => {
		expect(writerTroubleOf({ status: null, stdout: "", stderr: "", timedOut: true })).toBe("timeout");
	});
	it("names a model-side error from flue's error lines", () => {
		const stderr = "Error: Agent failed: direct(sub_1) failed: Unhandled stop reason: error";
		expect(writerTroubleOf({ status: 1, stdout: "", stderr })).toBe("model error");
	});
	it("ignores the same words in the model's reasoning and other failures", () => {
		expect(writerTroubleOf({ status: 1, stdout: "", stderr: "  an Unhandled stop reason: error could appear\nError: timed out" })).toBeNull();
		expect(writerTroubleOf({ status: 0, stdout: "", stderr: "" })).toBeNull();
	});
});

describe("effectiveEnv", () => {
	it("fills unset variables from .env and lets the command line win, as flue run does", () => {
		const env = effectiveEnv({ WRITER_MODEL: "minimax/MiniMax-M3.1-Flash" }, "WRITER_MODEL=minimax/MiniMax-M3\nVERIFIER_MODEL=minimax/MiniMax-M3\n");
		expect(env).toEqual({ WRITER_MODEL: "minimax/MiniMax-M3.1-Flash", VERIFIER_MODEL: "minimax/MiniMax-M3" });
	});
});

describe("retryEnv", () => {
	it("swaps the writer and pins the verifier the first attempt used", () => {
		// No verifier set: it followed the writer, and must keep doing so on the retry.
		expect(retryEnv({ PATH: "/bin", WRITER_MODEL: "minimax/MiniMax-M3.1-Flash" }, "", "minimax/MiniMax-M3")).toEqual({
			PATH: "/bin",
			WRITER_MODEL: "minimax/MiniMax-M3",
			VERIFIER_MODEL: "minimax/MiniMax-M3.1-Flash",
		});
		expect(retryEnv({}, "VERIFIER_MODEL=minimax/MiniMax-M3\n", "minimax/MiniMax-M2.7").VERIFIER_MODEL).toBe("minimax/MiniMax-M3");
	});
});

describe("runWithRetry", () => {
	const batch = { skillId: "s", format: "drag-drop" as const, count: 1 };
	const ok = { status: 0, stdout: "", stderr: "" };
	const timedOut = { status: null, stdout: "", stderr: "", timedOut: true };

	it("retries a timed-out question once with the fallback environment", async () => {
		const calls: [string, NodeJS.ProcessEnv | undefined][] = [];
		const attempt = async (runId: string, env?: NodeJS.ProcessEnv) => {
			calls.push([runId, env]);
			return calls.length === 1 ? { saved: 0, child: timedOut } : { saved: 1, child: ok };
		};
		const result = await runWithRetry("r1", batch, attempt, { WRITER_MODEL: "fallback" });
		expect(result).toEqual({ saved: 1, trouble: "timeout" });
		expect(calls).toEqual([
			["r1", undefined],
			["r1-retry", { WRITER_MODEL: "fallback" }],
		]);
	});

	it("does not retry a run without trouble, and retries only once", async () => {
		let n = 0;
		expect(await runWithRetry("r", batch, async () => (n++, { saved: 0, child: ok }), {})).toEqual({ saved: 0, trouble: null });
		expect(n).toBe(1);
		n = 0;
		expect(await runWithRetry("r", batch, async () => (n++, { saved: 0, child: timedOut }), {})).toEqual({ saved: 0, trouble: "timeout" });
		expect(n).toBe(2);
	});
});
