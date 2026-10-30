// Renders prepared doc Markdown (pages and fact sheets) to HTML for the Docs
// screen. Links to synced pages stay in the app; everything else opens on
// Learn. The output is sanitized here, so the page can insert it as is.
import { posix } from "node:path";
import { Marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { learnUrlToRepoPath, repoPathToLearnUrl } from "./corpus.ts";

export interface RenderContext {
	skillId: string;
	/** The Learn URL of the page being rendered; relative links resolve against it. */
	pageUrl?: string;
	isLocal: (learnUrl: string) => boolean;
}

const LEARN_ORIGIN = "https://learn.microsoft.com";
const CALLOUT = /^<p><strong>(Note|Tip|Important|Warning|Caution):<\/strong>/;

export function docsPageHref(skillId: string, learnUrl: string): string {
	return `#/docs/${skillId}/pages/${encodeURIComponent(learnUrl)}`;
}

function attr(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/<[^>]*>/g, "")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}

type Target = { kind: "anchor"; id: string } | { kind: "learn"; url: URL } | { kind: "external"; url: URL };

function resolveTarget(href: string, ctx: RenderContext): Target | null {
	if (href.startsWith("#")) return { kind: "anchor", id: href.slice(1) };
	if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
		let url: URL;
		try {
			url = new URL(href);
		} catch {
			return null;
		}
		if (url.protocol !== "https:") return null;
		return url.hostname === "learn.microsoft.com" ? { kind: "learn", url } : { kind: "external", url };
	}
	if (href.startsWith("/")) {
		const path = /^\/[a-z]{2}-[a-z]{2}\//.test(href) ? href : `/en-us${href}`;
		return { kind: "learn", url: new URL(path, LEARN_ORIGIN) };
	}
	// Relative to the page's file in its repo.
	const page = ctx.pageUrl ? learnUrlToRepoPath(ctx.pageUrl) : null;
	if (!page) return null;
	const [file, hash = ""] = href.split("#");
	const folder = page.path.split("/")[0];
	const path = file.startsWith("~/") ? posix.join(folder, file.slice(2)) : posix.join(posix.dirname(page.path), file);
	const learn = repoPathToLearnUrl(page.repo, posix.normalize(path));
	if (!learn) return null;
	const url = new URL(learn);
	if (hash) url.hash = hash;
	return { kind: "learn", url };
}

function linkHtml(href: string, text: string, ctx: RenderContext): string {
	const target = resolveTarget(href, ctx);
	if (!target) return text;
	if (target.kind === "anchor") return `<a href="#" data-anchor="${attr(target.id)}">${text}</a>`;
	if (target.kind === "learn") {
		const page = `${target.url.origin}${target.url.pathname.replace(/\/$/, "")}`;
		if (ctx.isLocal(page)) return `<a href="${attr(docsPageHref(ctx.skillId, page))}">${text}</a>`;
	}
	return `<a href="${attr(target.url.href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

const SANITIZE: sanitizeHtml.IOptions = {
	allowedTags: [...sanitizeHtml.defaults.allowedTags, "aside"],
	allowedAttributes: {
		a: ["href", "target", "rel", "data-anchor"],
		h1: ["id"],
		h2: ["id"],
		h3: ["id"],
		h4: ["id"],
		h5: ["id"],
		h6: ["id"],
	},
	allowedClasses: { aside: ["callout", "callout-*"] },
	allowedSchemes: ["https"],
	allowProtocolRelative: false,
};

export function renderDocHtml(markdown: string, ctx: RenderContext): string {
	const marked = new Marked({
		renderer: {
			link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Link) {
				return linkHtml(token.href, this.parser.parseInline(token.tokens), ctx);
			},
			heading(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Heading) {
				return `<h${token.depth} id="${attr(slug(token.text))}">${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
			},
			blockquote(this: { parser: { parse(t: Tokens.Generic[]): string } }, token: Tokens.Blockquote) {
				const body = this.parser.parse(token.tokens);
				const callout = CALLOUT.exec(body);
				if (callout) return `<aside class="callout callout-${callout[1].toLowerCase()}">\n${body}</aside>\n`;
				return `<blockquote>\n${body}</blockquote>\n`;
			},
		},
	});
	return sanitizeHtml(marked.parse(markdown, { async: false }), SANITIZE);
}
