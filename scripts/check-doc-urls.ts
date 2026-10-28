import { openCoachDb } from "../src/coach/db.ts";
import { DocFetchError, fetchMsDoc } from "../src/coach/docs.ts";

// Fresh in-memory seed: never reads or writes the real cache.
const db = openCoachDb(":memory:");
const rows = db.raw.prepare("SELECT id, doc_urls FROM skills ORDER BY position").all() as {
	id: string;
	doc_urls: string;
}[];

const urls = new Set<string>();
for (const row of rows) for (const u of JSON.parse(row.doc_urls) as string[]) urls.add(u);

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
process.exit(failures ? 1 : 0);
