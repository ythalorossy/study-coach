// Downloads the folders of MicrosoftDocs/azure-docs, MicrosoftDocs/azure-monitor-docs and
// MicrosoftDocs/entra-docs that the skills' doc URLs live in, as shallow sparse git checkouts under
// data/docs. Rerunning it pulls Microsoft's updates.
//
// Usage: npm run docs:sync   (no flags)
//
// Reads:  the skills' doc URLs in src/coach/exam/seed.ts
// Writes: data/docs/<repo>/ checkouts and their sync state; prints which fact sheets are stale
// Needs:  git and network (no API key)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	DOCS_ROOT,
	learnUrlToRepoPath,
	sparseDirs,
	SYNC_STATE_FILE,
	type DocRepo,
	type SyncState,
} from "../src/coach/docs/corpus.ts";
import { factSheetStatus } from "../src/coach/docs/fact-sheets.ts";
import { SKILLS } from "../src/coach/exam/seed.ts";

type Run = (argv: string[]) => { status: number | null; stdout: string };

export function syncCommands(repo: DocRepo, dir: string, dirs: string[], exists: boolean): string[][] {
	// Markdown only: the folders' media make up most of their size, and pages skip images.
	const patterns = ["/*", "!/*/", ...dirs.map((d) => `/${d}/**/*.md`)];
	const sparse = ["git", "-C", dir, "sparse-checkout", "set", "--no-cone", ...patterns];
	// First run: shallow, blobless clone, then narrow to the wanted folders
	if (!exists) {
		const url = `https://github.com/MicrosoftDocs/${repo}.git`;
		return [["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", "main", url, dir], sparse];
	}
	// Later runs: re-apply the folders, then move to the newest main
	return [sparse, ["git", "-C", dir, "fetch", "--depth", "1", "origin", "main"], ["git", "-C", dir, "reset", "--hard", "FETCH_HEAD"]];
}

// Short license name from the repo's LICENSE text
export function licenseName(text: string): string {
	if (text.includes("Attribution 4.0")) return "CC BY 4.0";
	if (/\bMIT License\b/.test(text)) return "MIT";
	return "see the repository's LICENSE";
}

function readLicense(dir: string): string {
	try {
		return licenseName(readFileSync(join(dir, "LICENSE"), "utf8"));
	} catch {
		return licenseName("");
	}
}

// Runs a command and returns its stdout; a non-zero exit throws
function runChecked(run: Run, argv: string[]): string {
	const { status, stdout } = run(argv);
	if (status !== 0) throw new Error(`${argv.join(" ")} failed (exit ${status})`);
	return stdout;
}

export function syncCorpus(opts: { root: string; urls: string[]; run: Run; now: () => Date }): SyncState {
	const { root, urls, run } = opts;
	mkdirSync(root, { recursive: true });
	const commits: SyncState["commits"] = {}; // commit each repo ended at
	const licenses: SyncState["licenses"] = {};
	// Sync each repo that holds skill pages
	for (const [repo, dirs] of Object.entries(sparseDirs(urls)) as [DocRepo, string[]][]) {
		// sparseDirs always lists includes; a repo with nothing else has no skill pages.
		if (dirs.length < 2) continue;
		const dir = join(root, repo);
		const cloned = existsSync(join(dir, ".git"));
		// A folder without .git is a clone that was cut off: start it again.
		if (!cloned) rmSync(dir, { recursive: true, force: true });
		for (const argv of syncCommands(repo, dir, dirs, cloned)) runChecked(run, argv);
		commits[repo] = runChecked(run, ["git", "-C", dir, "rev-parse", "HEAD"]).trim();
		licenses[repo] = readLicense(dir);
	}
	// URLs with no local file (read live from Learn instead)
	const missing = urls.filter((url) => {
		const mapped = learnUrlToRepoPath(url);
		return !mapped || !existsSync(join(root, mapped.repo, mapped.path));
	});
	const state: SyncState = { syncedAt: opts.now().toISOString(), commits, licenses, missing };
	// Written last, so an interrupted sync keeps the previous state.
	writeFileSync(join(root, SYNC_STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
	return state;
}

function main(): void {
	const urls = [...new Set(SKILLS.flatMap(([, , , docUrls]) => docUrls))]; // distinct doc URLs of all skills
	// Real command runner: stdout captured, stderr passed through
	const run: Run = (argv) => {
		const child = spawnSync(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" });
		return { status: child.status, stdout: child.stdout ?? "" };
	};
	const dirs = sparseDirs(urls);
	for (const [repo, list] of Object.entries(dirs)) console.log(`${repo}: ${list.join(", ")}`);
	const state = syncCorpus({ root: DOCS_ROOT, urls, run, now: () => new Date() });
	for (const [repo, commit] of Object.entries(state.commits)) {
		console.log(`${repo} at ${commit}, license: ${state.licenses[repo as DocRepo]}`);
	}
	for (const url of state.missing) console.log(`not in the local docs, will be read live from Learn: ${url}`);
	console.log(`Synced ${urls.length - state.missing.length}/${urls.length} skill pages.`);
	// Remind which fact sheets the new docs may have made stale
	console.log("\nFact sheets (npm run docs:sheets builds missing and stale ones):");
	for (const [skillId] of SKILLS) console.log(`${skillId}: ${factSheetStatus(skillId)}`);
}

if (import.meta.main) main();
