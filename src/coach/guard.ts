import type { MiddlewareHandler } from "hono";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Rejects state-changing requests that are not application/json. A cross-site page can only send
 * "simple" requests (text/plain, form posts) without a CORS preflight, so this blocks them.
 * `allowEmpty` lets a body-less request without a content type through (a body-less simple POST can't spend anything).
 */
export function requireJsonBody(opts: { allowEmpty?: boolean } = {}): MiddlewareHandler {
	return async (c, next) => {
		if (UNSAFE.has(c.req.method)) {
			const type = (c.req.header("content-type") ?? "").split(";")[0].trim().toLowerCase();
			// The Flue client sends its body-less POSTs (abort) without a content type.
			const empty = !type && (c.req.header("content-length") ?? "0") === "0" && !c.req.header("transfer-encoding");
			if (type !== "application/json" && !(opts.allowEmpty && empty)) {
				return c.json({ error: "unsupported-media-type" }, 415);
			}
		}
		await next();
	};
}
