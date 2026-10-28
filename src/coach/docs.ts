import type { CoachDb } from "./db.ts";

export type DocFetchReason = "not-allowed" | "http-error" | "timeout" | "empty";

export class DocFetchError extends Error {
	reason: DocFetchReason;
	constructor(reason: DocFetchReason, detail: string) {
		super(`${reason}: ${detail}`);
		this.name = "DocFetchError";
		this.reason = reason;
	}
}

export interface MsDoc {
	url: string;
	text: string;
	readAt: string;
}

const ALLOWED_HOST = "learn.microsoft.com";
const TIMEOUT_MS = 15_000;
const MAX_CHARS = 40_000;
const DAY_MS = 86_400_000;

function isAllowed(raw: string): boolean {
	try {
		const u = new URL(raw);
		return u.protocol === "https:" && u.hostname === ALLOWED_HOST;
	} catch {
		return false;
	}
}

export function htmlToText(html: string): string {
	const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
	let s = main ? main[1] : html;
	s = s.replace(/<(script|style|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
	s = s.replace(/<[^>]*>/g, " ");
	s = s
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&");
	return s.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
}

export async function fetchMsDoc(
	db: CoachDb,
	url: string,
	opts: { fetchImpl?: typeof fetch; now?: () => Date; maxAgeDays?: number } = {},
): Promise<MsDoc> {
	if (!isAllowed(url)) throw new DocFetchError("not-allowed", url);
	const fetchImpl = opts.fetchImpl ?? fetch;
	const now = opts.now ?? (() => new Date());
	const maxAgeMs = (opts.maxAgeDays ?? 30) * DAY_MS;

	const cached = db.raw.prepare("SELECT text, read_at FROM doc_cache WHERE url = ?").get(url) as
		| { text: string; read_at: string }
		| undefined;
	if (cached && now().getTime() - Date.parse(cached.read_at) <= maxAgeMs) {
		return { url, text: cached.text, readAt: cached.read_at };
	}

	let response: Response;
	try {
		response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch (err) {
		const name = err instanceof Error ? err.name : "";
		if (name === "TimeoutError" || name === "AbortError") throw new DocFetchError("timeout", url);
		throw new DocFetchError("http-error", `${url} (${err instanceof Error ? err.message : String(err)})`);
	}
	if (response.url && !isAllowed(response.url)) throw new DocFetchError("not-allowed", response.url);
	if (!response.ok) throw new DocFetchError("http-error", `${url} (${response.status})`);

	let body: string;
	try {
		body = await response.text();
	} catch (err) {
		const name = err instanceof Error ? err.name : "";
		if (name === "TimeoutError" || name === "AbortError") throw new DocFetchError("timeout", url);
		throw new DocFetchError("http-error", `${url} (${err instanceof Error ? err.message : String(err)})`);
	}
	const text = htmlToText(body);
	if (!text) throw new DocFetchError("empty", url);

	const readAt = now().toISOString();
	db.raw
		.prepare("INSERT OR REPLACE INTO doc_cache (url, text, read_at) VALUES (?, ?, ?)")
		.run(url, text, readAt);
	return { url, text, readAt };
}
