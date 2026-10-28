import { defineTool } from "@flue/runtime";
import * as v from "valibot";
import type { CoachDb } from "../coach/db.ts";
import { readDoc } from "../coach/corpus.ts";

export function makeReadMsDocsTool(getDb: () => CoachDb) {
	return defineTool({
		name: "read_ms_docs",
		description:
			"Read a Microsoft Learn page (https://learn.microsoft.com/ only) and return its text, so lessons and answers rest on current documentation.",
		input: v.object({ url: v.string() }),
		timeoutMs: 20_000,
		async run({ data }) {
			// Local docs first; a live fetch error (DocFetchError) starts with the reason, so the model sees why.
			const doc = await readDoc(getDb(), data.url);
			return { output: { url: doc.url, text: doc.text, readAt: doc.readAt } };
		},
	});
}
