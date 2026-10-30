// Per-skill fact sheets: short Markdown summaries in original wording, every
// fact linked to its Learn page. Built by the FactSheetWriter agent into
// content/fact-sheets/<skillId>.md and rebuilt when their local source pages change.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { corpusPage, DOCS_ROOT } from "./corpus.ts";
import { SKILLS } from "../exam/seed.ts";

export const FACT_SHEETS_ROOT = "./content/fact-sheets";

// About 4,000 tokens: a few thousand tokens of facts per skill.
const MAX_CHARS = 16_000;
const MIN_BULLETS = 10;

export interface FactSheet {
	skillId: string;
	/** sourceHash of the skill's pages when the sheet was built. */
	sources: string;
	built: string;
	body: string;
}

export type FactSheetStatus = "missing" | "stale" | "fresh";

export function skillDocUrls(skillId: string): string[] {
	const skill = SKILLS.find(([id]) => id === skillId);
	if (!skill) throw new Error(`Unknown skill ${skillId}`);
	return skill[3];
}

/** sha256 over the skill's synced pages; pages read live from Learn are not part of it. */
export function sourceHash(skillId: string, docsRoot = DOCS_ROOT): string {
	const hash = createHash("sha256");
	for (const url of skillDocUrls(skillId)) {
		const page = corpusPage(url, docsRoot);
		if (page) hash.update(`${url}\n${page.markdown}\n`);
	}
	return hash.digest("hex");
}

export function formatFactSheet(sheet: FactSheet): string {
	return `---\nskill: ${sheet.skillId}\nsources: ${sheet.sources}\nbuilt: ${sheet.built}\n---\n${sheet.body.trim()}\n`;
}

export function readFactSheet(skillId: string, root = FACT_SHEETS_ROOT): FactSheet | null {
	let text: string;
	try {
		text = readFileSync(join(root, `${skillId}.md`), "utf8");
	} catch {
		return null;
	}
	const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
	if (!m) return null;
	const field = (name: string) => new RegExp(`^${name}: (.*)$`, "m").exec(m[1])?.[1] ?? "";
	return { skillId: field("skill"), sources: field("sources"), built: field("built"), body: m[2].trim() };
}

export function factSheetStatus(skillId: string, opts: { sheetsRoot?: string; docsRoot?: string } = {}): FactSheetStatus {
	const sheet = readFactSheet(skillId, opts.sheetsRoot);
	if (!sheet) return "missing";
	return sheet.sources === sourceHash(skillId, opts.docsRoot) ? "fresh" : "stale";
}

function words(text: string): string[] {
	// Link targets are not prose: drop them before comparing.
	return text.replace(/\]\([^)]*\)/g, "]").replace(/https?:\/\/\S+/g, " ").toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** The first run of n consecutive words that also appears in a source, or null; bold and code spans are skipped. */
export function copiedRun(text: string, sources: string[], n = 12): string | null {
	const seen = new Set<string>();
	for (const source of sources) {
		const w = words(source);
		for (let i = 0; i + n <= w.length; i++) seen.add(w.slice(i, i + n).join(" "));
	}
	// Bold and code spans are exact names (portal labels, permissions); a run never spans them.
	for (const segment of text.split(/\*\*[^*]+\*\*|`[^`]+`/)) {
		const w = words(segment);
		for (let i = 0; i + n <= w.length; i++) {
			const window = w.slice(i, i + n);
			// Mostly numbers is a table of limits or sizes: facts, not copied prose.
			if (window.filter((t) => /[a-z]/.test(t)).length < n / 2) continue;
			const run = window.join(" ");
			if (seen.has(run)) return run;
		}
	}
	return null;
}

function stripAnchor(url: string): string {
	return url.split("#")[0].replace(/\/$/, "");
}

/** Problems with a sheet body; empty when it is valid. */
export function validateFactSheetBody(body: string, ctx: { allowedUrls: string[]; sourceTexts: string[] }): string[] {
	const problems: string[] = [];
	if (body.length > MAX_CHARS) {
		problems.push(
			`The sheet is ${body.length} characters; the limit is 16,000, so cut at least ${body.length - MAX_CHARS} characters by merging or dropping the least exam-relevant bullets.`,
		);
	}
	const lines = body.split("\n");
	const bullets = lines.filter((l) => /^\s*[-*] /.test(l));
	if (bullets.length < MIN_BULLETS) problems.push(`The sheet has ${bullets.length} bullets; write at least 10 bullets.`);
	const allowed = new Set(ctx.allowedUrls.map(stripAnchor));
	for (const b of bullets) {
		const links = [...b.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => stripAnchor(m[1]));
		if (!links.some((u) => allowed.has(u))) problems.push(`This bullet needs a link to one of the skill's pages: ${b.trim()}`);
	}
	for (const l of lines) {
		if (/^#{1,6}\s/.test(l) && !/^##\s/.test(l)) problems.push(`Use only ## headings: ${l.trim()}`);
	}
	const copied = copiedRun(body, ctx.sourceTexts);
	if (copied) problems.push(`This text is copied from the documentation; rewrite it in your own words: "${copied}"`);
	return problems;
}
