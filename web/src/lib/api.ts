import type {
	AnswerPurpose,
	AnswerResult,
	CoverageResponse,
	CreatedSession,
	DocsPage,
	DocsSkill,
	PublicQuestion,
	SessionKind,
	SessionSummary,
	SkillsResponse,
} from "./types.ts";

export type * from "./types.ts";

export class ApiError extends Error {
	status: number;
	body: unknown;
	constructor(status: number, body: unknown) {
		super(`API request failed with status ${status}: ${JSON.stringify(body)}`);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

async function readBody(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

async function request(method: string, path: string, body?: unknown): Promise<Response> {
	return fetch(`/api${path}`, {
		method,
		headers: body === undefined ? undefined : { "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
	const res = await request(method, path, body);
	const data = await readBody(res);
	if (!res.ok) throw new ApiError(res.status, data);
	return data as T;
}

export function getSkills(): Promise<SkillsResponse> {
	return call("GET", "/skills");
}

export function getDocsSkill(skillId: string): Promise<DocsSkill> {
	return call("GET", `/docs/${encodeURIComponent(skillId)}`);
}

export function getDocsPage(skillId: string, url: string): Promise<DocsPage> {
	return call("GET", `/docs/${encodeURIComponent(skillId)}/page?url=${encodeURIComponent(url)}`);
}

export function createSession(kind: SessionKind, skillIds: string[], areaId?: string): Promise<CreatedSession> {
	return call("POST", "/sessions", areaId ? { kind, skillIds, areaId } : { kind, skillIds });
}

export async function listSessions(): Promise<SessionSummary[]> {
	const { sessions } = await call<{ sessions: SessionSummary[] }>("GET", "/sessions");
	return sessions;
}

export function getSession(id: string): Promise<SessionSummary> {
	return call("GET", `/sessions/${encodeURIComponent(id)}`);
}

/** Resolves to null when the bank has nothing left for these skills (skipped ids excluded). */
export async function nextQuestion(
	skillIds: string[],
	sessionId: string,
	excludeIds: string[] = [],
): Promise<PublicQuestion | null> {
	const res = await request("POST", "/practice/next", { skillIds, sessionId, excludeIds });
	const data = await readBody(res);
	if (res.status === 404 && (data as { error?: string } | undefined)?.error === "no-questions") {
		return null;
	}
	if (!res.ok) throw new ApiError(res.status, data);
	return data as PublicQuestion;
}

export function submitAnswer(input: {
	questionId: string;
	response: unknown;
	purpose: AnswerPurpose;
	sessionId: string;
}): Promise<AnswerResult> {
	return call("POST", "/answers", input);
}

export async function flagQuestion(questionId: string, reason: string): Promise<void> {
	await call("POST", `/questions/${encodeURIComponent(questionId)}/flag`, { reason });
}

export function getCoverage(): Promise<CoverageResponse> {
	return call("GET", "/coverage");
}
