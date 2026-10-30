// /api/docs: a skill's fact sheet and its source pages, rendered to sanitized HTML.
import { Hono } from "hono";
import { corpusPage, DOCS_ROOT, readSyncState } from "./corpus.ts";
import { renderDocHtml } from "./doc-render.ts";
import { FACT_SHEETS_ROOT, factSheetStatus, readFactSheet } from "./fact-sheets.ts";
import { SKILLS } from "../exam/seed.ts";

export interface DocsApiOptions {
	docsRoot?: string;
	sheetsRoot?: string;
}

function lastSegment(url: string): string {
	return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? url;
}

export function createDocsApi(opts: DocsApiOptions = {}): Hono {
	const docsRoot = opts.docsRoot ?? DOCS_ROOT;
	const sheetsRoot = opts.sheetsRoot ?? FACT_SHEETS_ROOT;
	const api = new Hono();
	const isLocal = (url: string) => corpusPage(url, docsRoot) !== null;
	const skillOf = (id: string) => SKILLS.find(([skillId]) => skillId === id);

	api.get("/:skillId", (c) => {
		const skill = skillOf(c.req.param("skillId"));
		if (!skill) return c.json({ error: "unknown skill" }, 404);
		const [skillId, , name, docUrls] = skill;
		const sheet = readFactSheet(skillId, sheetsRoot);
		const status = factSheetStatus(skillId, { sheetsRoot, docsRoot });
		return c.json({
			skillId,
			name,
			factSheet: sheet && status !== "missing" ? { html: renderDocHtml(sheet.body, { skillId, isLocal }), status } : null,
			pages: docUrls.map((url) => {
				const page = corpusPage(url, docsRoot);
				return { url, title: page?.title || lastSegment(url), local: page !== null };
			}),
		});
	});

	api.get("/:skillId/page", (c) => {
		const skill = skillOf(c.req.param("skillId"));
		const url = c.req.query("url");
		if (!skill) return c.json({ error: "unknown skill" }, 404);
		const page = url ? corpusPage(url, docsRoot) : null;
		if (!page) return c.json({ error: "not in the local docs" }, 404);
		const license = readSyncState(docsRoot)?.licenses?.[page.repo] ?? "see the repository's LICENSE";
		return c.json({
			url: page.url,
			title: page.title,
			html: renderDocHtml(page.markdown, { skillId: skill[0], pageUrl: page.url, isLocal }),
			source: { repo: page.repo, githubUrl: `https://github.com/MicrosoftDocs/${page.repo}/blob/main/${page.path}`, license },
		});
	});

	return api;
}
