import { describe, expect, it } from "vitest";
import { docsPageHref, renderDocHtml } from "../../src/coach/docs/doc-render.ts";

const BASICS = "https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics";
const ctx = {
	skillId: "governance.policy",
	pageUrl: "https://learn.microsoft.com/en-us/azure/governance/policy/overview",
	isLocal: (u: string) => u === BASICS,
};

describe("renderDocHtml", () => {
	it("keeps links to synced pages in the app", () => {
		const href = `href="#/docs/governance.policy/pages/${encodeURIComponent(BASICS)}"`;
		expect(renderDocHtml("[x](./concepts/definition-structure-basics.md)", ctx)).toContain(href);
		expect(renderDocHtml("[x](concepts/definition-structure-basics.md#rules)", ctx)).toContain(href);
		expect(renderDocHtml(`[x](${BASICS})`, ctx)).toContain(href);
		expect(docsPageHref("governance.policy", BASICS)).toBe(`#/docs/governance.policy/pages/${encodeURIComponent(BASICS)}`);
	});

	it("opens other links on Learn in a new tab", () => {
		const html = renderDocHtml("[y](/azure/storage/common/storage-account-overview)", ctx);
		expect(html).toContain('href="https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it("resolves ~/ links against the repo's content folder", () => {
		const html = renderDocHtml("[g](~/fundamentals/how-to-manage-groups.md)", {
			skillId: "identity.create-users-groups",
			pageUrl: "https://learn.microsoft.com/en-us/entra/fundamentals/how-to-create-delete-users",
			isLocal: () => false,
		});
		expect(html).toContain('href="https://learn.microsoft.com/en-us/entra/fundamentals/how-to-manage-groups"');
	});

	it("turns same-page anchors into data-anchor links and ids headings", () => {
		const html = renderDocHtml("## Prerequisites\n[see](#prerequisites)", ctx);
		expect(html).toContain('<h2 id="prerequisites">');
		expect(html).toContain('data-anchor="prerequisites"');
	});

	it("renders notes as callouts", () => {
		const html = renderDocHtml("> **Note:** Be careful.", ctx);
		expect(html).toContain('<aside class="callout callout-note">');
		expect(renderDocHtml("> **Warning:** Stop.", ctx)).toContain('class="callout callout-warning"');
		expect(renderDocHtml("> A plain quote.", ctx)).toContain("<blockquote>");
	});

	it("strips scripts, event handlers, iframes and javascript: links", () => {
		const html = renderDocHtml(
			'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<iframe src="https://x"></iframe>\n\n[a](javascript:alert(1)) <a href="javascript:alert(2)" onclick="x()">b</a>',
			ctx,
		);
		for (const bad of ["<script", "onerror", "<iframe", "javascript:", "onclick"]) expect(html).not.toContain(bad);
	});
});
