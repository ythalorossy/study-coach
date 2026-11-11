import { describe, expect, it } from "vitest";
import { prepareMarkdown } from "../../src/coach/docs/doc-markdown.ts";

const none = { readInclude: () => null };

describe("prepareMarkdown", () => {
	it("takes the title from front matter and drops the front matter", () => {
		const r = prepareMarkdown("---\ntitle: Policy overview\nms.date: x\n---\n# Overview\nText", none);
		expect(r.title).toBe("Policy overview");
		expect(r.markdown).not.toContain("ms.date");
		expect(r.markdown).toContain("Text");
	});

	it("falls back to the first heading for the title", () => {
		expect(prepareMarkdown("Intro\n# Lock resources\nText", none).title).toBe("Lock resources");
	});

	it("inlines includes and drops ones it cannot read", () => {
		const r = prepareMarkdown("A\n[!INCLUDE [n](../includes/a.md)]\nB\n[!INCLUDE [m](../includes/missing.md)]", {
			readInclude: (p) => (p === "../includes/a.md" ? "Included text" : null),
		});
		expect(r.markdown).toContain("Included text");
		expect(r.markdown).not.toContain("INCLUDE");
	});

	it("stops a self-including include after 3 levels", () => {
		let reads = 0;
		const r = prepareMarkdown("[!INCLUDE [x](self.md)]", {
			readInclude: () => {
				reads++;
				return "Loop\n[!INCLUDE [x](self.md)]";
			},
		});
		expect(reads).toBe(3);
		expect(r.markdown.match(/Loop/g)).toHaveLength(3);
	});

	it("ends a tab group at any line of three or more dashes", () => {
		const r = prepareMarkdown("Before\n# [Portal](#tab/portal)\nportal-step\n# [CLI](#tab/cli)\ncli-step\n-----\nAfter", none);
		expect(r.markdown).toContain("portal-step");
		expect(r.markdown).toContain("cli-step");
		expect(r.markdown).toContain("After");
		expect(r.markdown).not.toMatch(/^-{3,}$/m);
	});

	it("keeps every tab, each under its label", () => {
		const r = prepareMarkdown("Before\n# [Portal](#tab/portal)\nA\n# [Azure CLI](#tab/cli)\nB\n---\nAfter", none);
		expect(r.markdown).toContain("**Tab: Portal**");
		expect(r.markdown).toContain("**Tab: Azure CLI**");
		expect(r.markdown).toMatch(/\bA\b/);
		expect(r.markdown).toMatch(/\bB\b/);
		expect(r.markdown).not.toContain("#tab/");
		expect(r.markdown).toContain("Before");
		expect(r.markdown).toContain("After");
	});

	it("keeps only the first zone", () => {
		const r = prepareMarkdown('::: zone pivot="a"\nA\n::: zone-end\n::: zone pivot="b"\nB\n::: zone-end\nEnd', none);
		expect(r.markdown).toContain("A");
		expect(r.markdown).not.toMatch(/\bB\b/);
		expect(r.markdown).not.toContain("zone");
		expect(r.markdown).toContain("End");
	});

	it("turns callouts into labelled quotes", () => {
		expect(prepareMarkdown("> [!NOTE]\n> Be careful.", none).markdown).toContain("> **Note:** Be careful.");
		expect(prepareMarkdown("> [!IMPORTANT]\n> Read this.", none).markdown).toContain("> **Important:** Read this.");
	});

	it("replaces images with their alt text", () => {
		const r = prepareMarkdown(
			':::image type="content" source="a.png" alt-text="Diagram of X":::\n![alt](a.png)\n:::image type="content" source="b.png" alt-text="Y" lightbox="b.png":::\n:::image-end:::',
			none,
		);
		expect(r.markdown).toContain("*(Image: Diagram of X)*");
		expect(r.markdown).toContain("*(Image: alt)*");
		expect(r.markdown).toContain("*(Image: Y)*");
		expect(r.markdown).not.toContain(":::");
	});

	it("removes HTML comments", () => {
		expect(prepareMarkdown("A <!-- x -->\n<!--\nmulti\n-->\nB", none).markdown).not.toMatch(/<!--|multi/);
	});
});
