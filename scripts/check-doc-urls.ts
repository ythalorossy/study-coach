import { openCoachDb } from "../src/coach/db.ts";
import { DocFetchError, fetchMsDoc } from "../src/coach/docs/docs.ts";

// Fresh in-memory seed: never reads or writes the real cache.
const db = openCoachDb(":memory:");
const rows = db.raw.prepare("SELECT id, doc_urls FROM skills ORDER BY position").all() as {
	id: string;
	doc_urls: string;
}[];

// Every distinct doc URL across all skills
const urls = new Set<string>();
for (const row of rows) for (const u of JSON.parse(row.doc_urls) as string[]) urls.add(u);

// Fetch each page; report the ones that fail
let failures = 0;
for (const url of urls) {
	try {
		await fetchMsDoc(db, url);
	} catch (err) {
		failures++;
		const reason = err instanceof DocFetchError ? err.reason : String(err);
		console.error(`FAIL ${url} ${reason}`);
	}
}
console.log(`${urls.size - failures}/${urls.size} doc URLs ok`);
process.exit(failures ? 1 : 0); // non-zero lets CI catch dead links
