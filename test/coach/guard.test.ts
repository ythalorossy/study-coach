import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { requireJsonBody } from "../../src/coach/guard.ts";

function app(opts?: { allowEmpty?: boolean }) {
	const a = new Hono();
	a.use("*", requireJsonBody(opts));
	a.all("*", (c) => c.text("ok"));
	return a;
}

describe("requireJsonBody", () => {
	it("rejects a text/plain POST with 415", async () => {
		const res = await app().request("/x", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
		expect(res.status).toBe(415);
		expect(await res.json()).toEqual({ error: "unsupported-media-type" });
	});

	it("rejects a body-less POST without a content type", async () => {
		const res = await app().request("/x", { method: "DELETE" });
		expect(res.status).toBe(415);
	});

	it("lets application/json through, with or without a charset", async () => {
		for (const ct of ["application/json", "application/json; charset=utf-8"]) {
			const res = await app().request("/x", { method: "PUT", headers: { "content-type": ct }, body: "{}" });
			expect(res.status).toBe(200);
		}
	});

	it("allowEmpty passes a body-less POST but still rejects text/plain", async () => {
		expect((await app({ allowEmpty: true }).request("/x", { method: "POST" })).status).toBe(200);
		const res = await app({ allowEmpty: true }).request("/x", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
		expect(res.status).toBe(415);
	});

	it("does not touch GET", async () => {
		expect((await app().request("/x")).status).toBe(200);
	});
});
