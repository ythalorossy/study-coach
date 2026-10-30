import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { openCoachDb } from "../../src/coach/db.ts";
import { DocFetchError, fetchMsDoc, htmlToText } from "../../src/coach/docs/docs.ts";

const URL_OK = "https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sspr-howitworks";
const html = readFileSync(new URL("../fixtures/learn-page.html", import.meta.url), "utf8");

function okFetch(body = html) {
	return vi.fn(async (input: string | URL | Request) => {
		const res = new Response(body, { status: 200 });
		Object.defineProperty(res, "url", { value: String(input) });
		return res;
	}) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

async function reasonOf(p: Promise<unknown>): Promise<string> {
	try {
		await p;
	} catch (e) {
		if (e instanceof DocFetchError) return e.reason;
		throw e;
	}
	throw new Error("did not reject");
}

describe("fetchMsDoc", () => {
	it("rejects non-learn hosts", async () => {
		const db = openCoachDb(":memory:");
		const fetchImpl = okFetch();
		expect(await reasonOf(fetchMsDoc(db, "https://example.com/x", { fetchImpl }))).toBe("not-allowed");
		expect(await reasonOf(fetchMsDoc(db, "http://learn.microsoft.com/x", { fetchImpl }))).toBe("not-allowed");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("extracts main text", async () => {
		const db = openCoachDb(":memory:");
		const doc = await fetchMsDoc(db, URL_OK, { fetchImpl: okFetch() });
		expect(doc.text).toContain("SSPR Users & groups");
		expect(doc.text).not.toContain("Menu");
		expect(doc.text).not.toContain("x()");
	});

	it("caches for 30 days", async () => {
		const db = openCoachDb(":memory:");
		const fetchImpl = okFetch();
		const t0 = new Date("2026-01-01T00:00:00Z");
		await fetchMsDoc(db, URL_OK, { fetchImpl, now: () => t0 });
		const day = 86_400_000;
		const again = await fetchMsDoc(db, URL_OK, { fetchImpl, now: () => new Date(t0.getTime() + 29 * day) });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(again.readAt).toBe(t0.toISOString());
		await fetchMsDoc(db, URL_OK, { fetchImpl, now: () => new Date(t0.getTime() + 31 * day) });
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it("maps a 404 to http-error", async () => {
		const db = openCoachDb(":memory:");
		const fetchImpl = vi.fn(async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
		expect(await reasonOf(fetchMsDoc(db, URL_OK, { fetchImpl }))).toBe("http-error");
	});

	it("maps a hanging fetch to timeout", async () => {
		const db = openCoachDb(":memory:");
		const fetchImpl = vi.fn(async () => {
			throw new DOMException("timed out", "TimeoutError");
		}) as unknown as typeof fetch;
		expect(await reasonOf(fetchMsDoc(db, URL_OK, { fetchImpl }))).toBe("timeout");
	});

	it("maps a redirect off learn.microsoft.com to not-allowed", async () => {
		const db = openCoachDb(":memory:");
		const fetchImpl = vi.fn(async () => {
			const res = new Response(html, { status: 200 });
			Object.defineProperty(res, "url", { value: "https://example.com/landing" });
			return res;
		}) as unknown as typeof fetch;
		expect(await reasonOf(fetchMsDoc(db, URL_OK, { fetchImpl }))).toBe("not-allowed");
	});

	it("maps empty text to empty", async () => {
		const db = openCoachDb(":memory:");
		const fetchImpl = okFetch("<html><body><main>  </main></body></html>");
		expect(await reasonOf(fetchMsDoc(db, URL_OK, { fetchImpl }))).toBe("empty");
	});
});

describe("htmlToText", () => {
	it("decodes entities and caps length", () => {
		expect(htmlToText("<p>a&nbsp;&lt;b&gt; &quot;c&quot; &#39;d&#39;</p>")).toBe(`a <b> "c" 'd'`);
		expect(htmlToText(`<p>${"x".repeat(50_000)}</p>`).length).toBe(40_000);
	});
});
