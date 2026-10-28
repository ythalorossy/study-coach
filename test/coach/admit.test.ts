import { describe, expect, it, vi } from "vitest";
import { admitQuestion, buildVerifierPrompt, type VerifierInput } from "../../src/coach/admit.ts";
import { openCoachDb } from "../../src/coach/db.ts";
import { DocFetchError } from "../../src/coach/docs.ts";
import {
	completeSentenceCorrect,
	completeSentenceFixture,
	dragDropCorrect,
	dragDropFixture,
	mcCorrect,
	mcFixture,
} from "./fixtures.ts";

const READ_AT = "2026-10-20T10:00:00.000Z";
const fetchDoc = async (url: string) => ({ text: `doc for ${url}`, readAt: READ_AT });

function count(db: ReturnType<typeof openCoachDb>) {
	return (db.raw.prepare("SELECT COUNT(*) AS n FROM questions").get() as { n: number }).n;
}

describe("admitQuestion", () => {
	it("saves when the verifier agrees", async () => {
		const db = openCoachDb(":memory:");
		const r = await admitQuestion(db, mcFixture, { fetchDoc, verify: async () => mcCorrect });
		expect(r.saved).toBe(true);
		if (!r.saved) return;
		const row = db.raw.prepare("SELECT status, sources FROM questions WHERE id = ?").get(r.id) as {
			status: string;
			sources: string;
		};
		expect(row.status).toBe("verified");
		expect(JSON.parse(row.sources)).toEqual([{ url: mcFixture.sources[0].url, readAt: READ_AT }]);
	});

	it("gives the verifier the supplied docs instead of the fetched pages, but still fetches sources", async () => {
		const db = openCoachDb(":memory:");
		const fetch = vi.fn(fetchDoc);
		const verify = vi.fn(async (_input: VerifierInput) => mcCorrect);
		const verifierDocs = [{ url: "fact sheet for identity.external-users", text: "SHEET" }];
		const r = await admitQuestion(db, mcFixture, { fetchDoc: fetch, verify, verifierDocs });
		expect(r.saved).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(mcFixture.sources.length);
		expect(verify.mock.calls[0][0].docs).toEqual(verifierDocs);
	});

	it("verifies the other formats", async () => {
		const db = openCoachDb(":memory:");
		const a = await admitQuestion(db, dragDropFixture, { fetchDoc, verify: async () => dragDropCorrect });
		const b = await admitQuestion(db, completeSentenceFixture, {
			fetchDoc,
			verify: async () => completeSentenceCorrect,
		});
		expect(a.saved && b.saved).toBe(true);
	});

	it("rejects a leaking question before any fetch or verify", async () => {
		const db = openCoachDb(":memory:");
		const leaking = { ...mcFixture, body: { ...mcFixture.body, stem: `${mcFixture.body.stem} Hint: it is Tomas.` } };
		const fetch = vi.fn(fetchDoc);
		const verify = vi.fn(async () => mcCorrect);
		const r = await admitQuestion(db, leaking, { fetchDoc: fetch, verify });
		expect(r).toEqual({ saved: false, reason: "leak", detail: "Tomas" });
		expect(fetch).not.toHaveBeenCalled();
		expect(verify).not.toHaveBeenCalled();
		expect(count(db)).toBe(0);
	});

	it("discards when the verifier disagrees", async () => {
		const db = openCoachDb(":memory:");
		const r = await admitQuestion(db, mcFixture, { fetchDoc, verify: async () => ({ optionId: "a" }) });
		expect(r).toEqual({ saved: false, reason: "verifier-disagrees", detail: '{"optionId":"a"}' });
		expect(count(db)).toBe(0);
	});

	it("discards when the verifier throws", async () => {
		const db = openCoachDb(":memory:");
		const r = await admitQuestion(db, mcFixture, {
			fetchDoc,
			verify: async () => {
				throw new Error("model down");
			},
		});
		expect(r).toEqual({ saved: false, reason: "verifier-failed", detail: "model down" });
		expect(count(db)).toBe(0);
	});

	it("discards an invalid candidate", async () => {
		const db = openCoachDb(":memory:");
		const r = await admitQuestion(db, { ...mcFixture, key: { optionId: "zzz" } }, { fetchDoc, verify: async () => mcCorrect });
		expect(r.saved).toBe(false);
		if (!r.saved) expect(r.reason).toBe("invalid");
	});

	it("discards a near-duplicate before fetching", async () => {
		const db = openCoachDb(":memory:");
		const deps = { fetchDoc, verify: async () => mcCorrect };
		const first = await admitQuestion(db, mcFixture, deps);
		let fetched = 0;
		const r = await admitQuestion(db, mcFixture, {
			fetchDoc: async (u) => {
				fetched++;
				return fetchDoc(u);
			},
			verify: async () => mcCorrect,
		});
		expect(first.saved).toBe(true);
		expect(r.saved).toBe(false);
		if (!r.saved && first.saved) {
			expect(r.reason).toBe("duplicate");
			expect(r.detail).toBe(first.id);
		}
		expect(fetched).toBe(0);
		expect(count(db)).toBe(1);
	});

	it("discards when a source fails and stops at the first failure", async () => {
		const db = openCoachDb(":memory:");
		const two = {
			...mcFixture,
			sources: [{ url: "https://example.com/x" }, { url: "https://learn.microsoft.com/b" }],
		};
		const asked: string[] = [];
		let verified = false;
		const r = await admitQuestion(db, two, {
			fetchDoc: async (u) => {
				asked.push(u);
				throw new DocFetchError("not-allowed", u);
			},
			verify: async () => {
				verified = true;
				return mcCorrect;
			},
		});
		expect(r.saved).toBe(false);
		if (!r.saved) {
			expect(r.reason).toBe("source-unavailable");
			expect(r.detail).toContain("https://example.com/x");
			expect(r.detail).toContain("not-allowed");
		}
		expect(asked).toEqual(["https://example.com/x"]);
		expect(verified).toBe(false);
		expect(count(db)).toBe(0);
	});

	it("stores only parsed fields, dropping an extra isCorrect on an option", async () => {
		const db = openCoachDb(":memory:");
		const raw = structuredClone(mcFixture) as unknown as { body: { options: Record<string, unknown>[] } };
		raw.body.options[1].isCorrect = true;
		const r = await admitQuestion(db, raw, { fetchDoc, verify: async () => mcCorrect });
		expect(r.saved).toBe(true);
		if (!r.saved) return;
		const row = db.raw.prepare("SELECT body FROM questions WHERE id = ?").get(r.id) as { body: string };
		expect(row.body).not.toContain("isCorrect");
	});

	it("the verifier never sees the key", async () => {
		const db = openCoachDb(":memory:");
		for (const [fx, ok] of [
			[mcFixture, mcCorrect],
			[dragDropFixture, dragDropCorrect],
			[completeSentenceFixture, completeSentenceCorrect],
		] as const) {
			let seen: VerifierInput | undefined;
			const r = await admitQuestion(db, fx, {
				fetchDoc,
				verify: async (input) => {
					seen = input;
					return ok;
				},
			});
			expect(r.saved).toBe(true);
			expect(Object.keys(seen as VerifierInput).sort()).toEqual(["body", "docs"]);
			const prompt = buildVerifierPrompt(seen as VerifierInput);
			expect(prompt).not.toContain(fx.explanation.correct);
			for (const t of Object.values(fx.explanation.perChoice)) expect(prompt).not.toContain(t);
		}
	});
});

describe("buildVerifierPrompt", () => {
	it("renders stem, exhibit rows, ids, docs and the response shape", () => {
		const prompt = buildVerifierPrompt({
			body: mcFixture.body,
			docs: [{ url: "https://learn.microsoft.com/a", text: "DOC BODY" }],
		});
		expect(prompt).toContain(mcFixture.body.stem);
		expect(prompt).toContain("Tomas Berg | tomas_adatum.example#EXT#@fabrikam.example | Consultant");
		expect(prompt).toContain("- b: Tomas Berg");
		expect(prompt).toContain("https://learn.microsoft.com/a");
		expect(prompt).toContain("DOC BODY");
		expect(prompt).toContain('"optionId"');
		const dd = buildVerifierPrompt({ body: dragDropFixture.body, docs: [] });
		expect(dd).toContain("- s1: ");
		expect(dd).toContain('"s1"');
	});

	it("fences code exhibits", () => {
		const prompt = buildVerifierPrompt({
			body: { ...mcFixture.body, exhibit: { kind: "code", language: "powershell", text: "Get-AzRole" } },
			docs: [],
		});
		expect(prompt).toContain("```powershell\nGet-AzRole\n```");
	});
});
