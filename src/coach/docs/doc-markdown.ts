// Turns a MicrosoftDocs (DocFX) Markdown file into plain Markdown that a model can
// read and marked can render: front matter, includes, tabs, zones, callouts and
// images are reduced to their readable content.
import { posix } from "node:path";

export interface PrepareOptions {
	/** Reads an include by its path relative to the page; null when it is not available. */
	readInclude: (relPath: string) => string | null;
}

const MAX_INCLUDE_DEPTH = 3;
const INCLUDE = /\[!INCLUDE\s*\[[^\]]*\]\(([^)\s]+)\)\]/gi;
const TAB_HEADING = /^#{1,6}\s*\[[^\]]*\]\(#tab\/[^)]*\)\s*$/;
const CALLOUT = /^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;

function splitFrontMatter(md: string): { meta: string; body: string } {
	const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(md);
	return m ? { meta: m[1], body: md.slice(m[0].length) } : { meta: "", body: md };
}

function expandIncludes(md: string, base: string, opts: PrepareOptions, depth: number, stats: { unresolved: number }): string {
	return md.replace(INCLUDE, (_all, rel: string) => {
		if (depth >= MAX_INCLUDE_DEPTH) return "";
		const path = posix.normalize(posix.join(posix.dirname(base), rel));
		const text = opts.readInclude(path);
		if (text === null) {
			stats.unresolved++;
			return "";
		}
		return expandIncludes(splitFrontMatter(text).body, path, opts, depth + 1, stats).trim();
	});
}

function imageAlt(line: string): string | null {
	const docfx = /^\s*:::image\b.*?\balt-text="([^"]*)"/.exec(line);
	if (docfx) return docfx[1];
	return null;
}

function label(kind: string): string {
	return kind[0].toUpperCase() + kind.slice(1).toLowerCase();
}

/** `unresolved` counts the includes that could not be read (for example Microsoft's private reusable-content repo): the text is missing them. */
export function prepareMarkdown(md: string, opts: PrepareOptions): { title: string; markdown: string; unresolved: number } {
	const { meta, body } = splitFrontMatter(md);
	const stats = { unresolved: 0 };
	const expanded = expandIncludes(body, "", opts, 0, stats).replace(/<!--[\s\S]*?-->/g, "");

	const out: string[] = [];
	let tab: "none" | "first" | "skip" = "none";
	let zone: "none" | "first" | "skip" = "none";
	let zonesSeen = 0;
	let callout: string | null = null;

	for (const line of expanded.split(/\r?\n/)) {
		if (TAB_HEADING.test(line)) {
			tab = tab === "none" ? "first" : "skip";
			continue;
		}
		if (tab !== "none" && /^-{3,}$/.test(line.trim())) {
			tab = "none";
			continue;
		}
		if (/^\s*:::\s*zone\s+(pivot|target)=/.test(line)) {
			zone = zonesSeen++ === 0 ? "first" : "skip";
			continue;
		}
		if (/^\s*:::\s*zone-end/.test(line)) {
			zone = "none";
			continue;
		}
		if (tab === "skip" || zone === "skip") continue;

		const callMatch = CALLOUT.exec(line);
		if (callMatch) {
			callout = label(callMatch[1]);
			continue;
		}
		let text = line;
		if (callout && /^\s*>\s*\S/.test(text)) {
			text = text.replace(/^(\s*>\s*)/, `$1**${callout}:** `);
			callout = null;
		}

		const alt = imageAlt(text);
		if (alt !== null) {
			out.push(`*(Image: ${alt})*`);
			continue;
		}
		if (/^\s*:::.*:::\s*$/.test(text)) continue;
		out.push(text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "*(Image: $1)*"));
	}

	const markdown = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
	const metaTitle = /^title:\s*(.+?)\s*$/m.exec(meta)?.[1].replace(/^(["'])(.*)\1$/, "$2");
	const heading = /^#\s+(.+?)\s*$/m.exec(markdown)?.[1];
	return { title: metaTitle || heading || "", markdown, unresolved: stats.unresolved };
}
