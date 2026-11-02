// Pure parts of the fact-sheet review: what a reviewer may report, and the check
// that every finding quotes the sheet and the page, so a made-up finding is rejected.
import { readFactSheet } from "./fact-sheets.ts";

export const FACT_CHECK_ROOT = "./data/review/fact-check";

export type Verdict = "contradicted" | "unsupported";

export interface Finding {
	/** The start of the sheet bullet, copied from the sheet. */
	bullet: string;
	verdict: Verdict;
	/** The page the bullet links to. */
	pageUrl: string;
	/** For contradicted: the page text that disagrees, copied from the page. */
	evidence: string;
	explanation: string;
}

export interface FactCheckResult {
	skillId: string;
	model: string;
	bullets: number;
	findings: Finding[];
	checked: string;
}

function squash(text: string): string {
	return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** The sheet's fact bullets, without the leading dash. */
export function sheetBullets(body: string): string[] {
	return body
		.split("\n")
		.filter((l) => l.startsWith("- "))
		.map((l) => l.slice(2).trim());
}

/** Problems that make a finding unusable: it must quote a real bullet and, if it quotes evidence, a real page passage. */
export function validateFindings(findings: Finding[], body: string, pages: { url: string; markdown: string }[]): string[] {
	const bullets = sheetBullets(body).map(squash);
	const problems: string[] = [];
	findings.forEach((f, i) => {
		const at = `finding ${i + 1}`;
		const quote = squash(f.bullet);
		if (quote.length < 20 || !bullets.some((b) => b.includes(quote))) problems.push(`${at}: "bullet" is not copied from a sheet bullet (copy its first 60 or more characters exactly)`);
		const page = pages.find((p) => p.url === f.pageUrl);
		if (!page) problems.push(`${at}: pageUrl must be one of the documentation page URLs`);
		else if (f.evidence.trim() && !squash(page.markdown).includes(squash(f.evidence))) problems.push(`${at}: "evidence" is not copied from that page`);
		if (f.verdict === "contradicted" && !f.evidence.trim()) problems.push(`${at}: a contradicted finding needs evidence copied from the page`);
	});
	return problems;
}

/** The findings as a Markdown worksheet for a person to confirm against the Learn pages. */
export function formatFactCheck(result: FactCheckResult): string {
	const head = `# Fact check: ${result.skillId}\n\nChecked ${result.bullets} bullets with ${result.model}. ${result.findings.length} to look at. A model's check narrows the review; it does not replace it.\n`;
	if (!result.findings.length) return `${head}\nNothing flagged.\n`;
	const items = result.findings.map(
		(f, i) =>
			`## ${i + 1}. ${f.verdict}\n\n> ${f.bullet}\n\n${f.explanation}\n\n${f.evidence.trim() ? `Page says: "${f.evidence.trim()}"\n\n` : ""}Page: ${f.pageUrl}\n`,
	);
	return `${head}\n${items.join("\n")}`;
}

/** The sheet's body, from a sheets folder (the real one by default). */
export function sheetBody(skillId: string, root?: string): string | null {
	return readFactSheet(skillId, root)?.body ?? null;
}
