export type DocsTab = "sheet" | "pages";

export type Route =
	| { name: "home" }
	| { name: "room"; sessionId: string }
	| { name: "practice"; sessionId: string }
	| { name: "coverage" }
	| { name: "docs"; skillId?: string; tab: DocsTab; pageUrl?: string };

function parseDocs(parts: string[]): Route {
	const [, skill, tab, page] = parts;
	if (!skill) return parts.length === 1 ? { name: "docs", tab: "sheet" } : { name: "home" };
	const skillId = decodeURIComponent(skill);
	if (parts.length === 2 || (tab === "sheet" && parts.length === 3)) return { name: "docs", skillId, tab: "sheet" };
	if (tab === "pages" && parts.length === 3) return { name: "docs", skillId, tab: "pages" };
	if (tab === "pages" && page && parts.length === 4) {
		return { name: "docs", skillId, tab: "pages", pageUrl: decodeURIComponent(page) };
	}
	return { name: "home" };
}

export function parseRoute(hash: string): Route {
	const parts = hash.replace(/^#\/?/, "").split("/");
	const [head, id] = parts;
	if (head === "coverage" && parts.length === 1) return { name: "coverage" };
	try {
		if (head === "docs") return parseDocs(parts);
		if ((head === "room" || head === "practice") && id && parts.length === 2) {
			return { name: head, sessionId: decodeURIComponent(id) };
		}
	} catch {
		return { name: "home" };
	}
	return { name: "home" };
}
