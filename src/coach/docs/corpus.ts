// The local copy of the Microsoft docs: MicrosoftDocs/azure-docs and the product repos
// (azure-compute-docs, azure-management-docs, azure-monitor-docs), plus MicrosoftDocs/entra-docs, sparse-checked-out under data/docs by
// `npm run docs:sync`. A Learn URL maps to its repo file by a fixed rule.
import { readFileSync } from "node:fs";
import { join, posix, resolve, sep } from "node:path";
import type { CoachDb } from "../db.ts";
import { prepareMarkdown } from "./doc-markdown.ts";
import { fetchMsDoc, type MsDoc } from "./docs.ts";

export type DocRepo = "azure-docs" | "azure-compute-docs" | "azure-management-docs" | "azure-monitor-docs" | "entra-docs";

export const DOCS_ROOT = "./data/docs";

const LEARN = "https://learn.microsoft.com/en-us";

// Learn product prefix → repo and the folder its articles live in.
// `only` limits an entry to Learn URLs whose first path segment after the prefix is one of those
// sections: some Azure products have their own repo, so those entries come before the general azure one.
const PRODUCTS: { prefix: string; repo: DocRepo; folder: string; only?: string[] }[] = [
	{ prefix: "azure", repo: "azure-monitor-docs", folder: "articles", only: ["azure-monitor", "advisor"] },
	{ prefix: "azure", repo: "azure-compute-docs", folder: "articles", only: ["virtual-machines", "virtual-machine-scale-sets", "container-instances"] },
	{ prefix: "azure", repo: "azure-management-docs", folder: "articles", only: ["container-registry"] },
	{ prefix: "azure", repo: "azure-docs", folder: "articles" },
	{ prefix: "entra", repo: "entra-docs", folder: "docs" },
];

export function learnUrlToRepoPath(url: string): { repo: DocRepo; path: string } | null {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return null;
	}
	if (u.protocol !== "https:" || u.hostname !== "learn.microsoft.com") return null;
	let segments: string[];
	try {
		segments = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
	} catch {
		return null;
	}
	const [locale, product, ...rest] = segments;
	if (locale !== "en-us" || !rest.length) return null;
	if (rest.some((s) => s === "." || s === ".." || s.includes("/") || s.includes("\\"))) return null;
	const match = PRODUCTS.find((p) => p.prefix === product && (!p.only || p.only.includes(rest[0])));
	if (!match) return null;
	return { repo: match.repo, path: `${match.folder}/${rest.join("/")}.md` };
}

export function repoPathToLearnUrl(repo: DocRepo, path: string): string | null {
	const match = PRODUCTS.find((p) => p.repo === repo);
	if (!match || !path.startsWith(`${match.folder}/`) || !path.endsWith(".md")) return null;
	return `${LEARN}/${match.prefix}/${path.slice(match.folder.length + 1, -".md".length)}`;
}

export function sparseDirs(urls: string[]): Record<DocRepo, string[]> {
	const dirs = Object.fromEntries(PRODUCTS.map((p) => [p.repo, new Set<string>()])) as Record<DocRepo, Set<string>>;
	for (const url of urls) {
		const mapped = learnUrlToRepoPath(url);
		if (mapped) dirs[mapped.repo].add(mapped.path.split("/").slice(0, 2).join("/"));
	}
	const list = (s: Set<string>) => [...s].sort().concat("includes");
	return Object.fromEntries(Object.entries(dirs).map(([repo, set]) => [repo, list(set)])) as Record<DocRepo, string[]>;
}

export interface SyncState {
	syncedAt: string;
	commits: Partial<Record<DocRepo, string>>;
	/** The license each repo's LICENSE file names, shown with every rendered page. */
	licenses: Partial<Record<DocRepo, string>>;
	/** Skill doc URLs with no local file; they are read live from Learn. */
	missing: string[];
}

export const SYNC_STATE_FILE = "sync.json";

export function readSyncState(root = DOCS_ROOT): SyncState | null {
	try {
		return JSON.parse(readFileSync(join(root, SYNC_STATE_FILE), "utf8")) as SyncState;
	} catch {
		return null;
	}
}

const MAX_CHARS = 40_000;

export interface CorpusPage {
	url: string;
	repo: DocRepo;
	path: string;
	title: string;
	markdown: string;
	/** Includes the page uses that are not in the local docs; its text is missing them. */
	unresolved: number;
}

function readInside(repoDir: string, path: string): string | null {
	const file = resolve(repoDir, path);
	if (!file.startsWith(repoDir + sep)) return null;
	try {
		return readFileSync(file, "utf8");
	} catch {
		return null;
	}
}

/** A synced page as plain Markdown, or null when it is not in the local docs. */
export function corpusPage(url: string, root = DOCS_ROOT): CorpusPage | null {
	const mapped = learnUrlToRepoPath(url);
	if (!mapped || !readSyncState(root)) return null;
	const repoDir = resolve(root, mapped.repo);
	const raw = readInside(repoDir, mapped.path);
	if (raw === null) return null;
	const folder = mapped.path.split("/")[0];
	const pageDir = posix.dirname(mapped.path);
	const { title, markdown, unresolved } = prepareMarkdown(raw, {
		readInclude(rel) {
			// "~/" is the repo's content folder; anything else is relative to the page.
			const path = rel.startsWith("~/") ? posix.join(folder, rel.slice(2)) : posix.join(pageDir, rel);
			return readInside(repoDir, path);
		},
	});
	return { url, ...mapped, title, markdown, unresolved };
}

/**
 * Reads a Learn page from the local docs, or live from Learn (cached) when it is not synced. A local page
 * that uses includes we do not have (tables in Microsoft's private reusable-content repo) is incomplete,
 * so the live page is preferred for it, and the local text is the fallback if the live read fails.
 */
export async function readDoc(db: CoachDb, url: string, opts: { root?: string; fetchImpl?: typeof fetch } = {}): Promise<MsDoc> {
	const root = opts.root ?? DOCS_ROOT;
	const page = corpusPage(url, root);
	const state = page && readSyncState(root);
	const local = page && state ? { url, text: page.markdown.slice(0, MAX_CHARS), readAt: state.syncedAt } : null;
	if (local && page?.unresolved === 0) return local;
	try {
		return await fetchMsDoc(db, url, { fetchImpl: opts.fetchImpl });
	} catch (error) {
		if (local) return local;
		throw error;
	}
}
