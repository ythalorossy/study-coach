// Mechanical answer-leak check: a word that only the correct choice uses must
// not appear in the text the learner reads before answering. Cheap, no network.
import type { CandidateQuestion, Exhibit } from "./question-schema.ts";

const SUFFIXES: [suffix: string, replacement: string][] = [
	["ations", ""],
	["ation", ""],
	["ments", ""],
	["ment", ""],
	["ions", ""],
	["ion", ""],
	["ives", ""],
	["ive", ""],
	["ings", ""],
	["ing", ""],
	["ies", "y"],
	["ied", "y"],
	["ers", ""],
	["er", ""],
	["ed", ""],
	["es", ""],
	["s", ""],
];

/** Light suffix-stripping stemmer: invite, invitation and Inviter share one stem. */
export function stem(word: string): string {
	let w = word.toLowerCase();
	for (const [suffix, replacement] of SUFFIXES) {
		if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
			w = w.slice(0, -suffix.length) + replacement;
			break;
		}
	}
	while (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
	return w;
}

// English function words plus words every question in this domain uses.
const STOPWORDS = new Set(
	`a an the and or nor of to in on at by for from with without into onto over under up down out off as is are was
	were be been being am it its this that these those there here you your yours we our us they their them he she his
	her i me my not no yes can could should would will shall may might must do does did done has have had having which
	what who whom whose when where why how all any each every some such only also than then so if but too very just
	same more own via per both other another either neither one ones new use used using make made need needs want wants
	ensure microsoft entra azure tenant directory admin center portal page blade user account setting settings configure
	enable disable set select open add assign allow grant create`
		.split(/\s+/)
		.filter(Boolean)
		.map(stem),
);

interface Token {
	word: string;
	stem: string;
}

function tokens(text: string): Token[] {
	return text
		.split(/[^A-Za-z0-9]+/)
		.filter((w) => w.length >= 2)
		.map((word) => ({ word, stem: stem(word) }))
		.filter((t) => !STOPWORDS.has(t.stem));
}

function stems(text: string): Set<string> {
	return new Set(tokens(text).map((t) => t.stem));
}

function exhibitText(exhibit: Exhibit | undefined): string {
	if (!exhibit) return "";
	if (exhibit.kind === "table") return [...exhibit.columns, ...exhibit.rows.flat()].join(" ");
	return exhibit.text;
}

/** The stems of `choice` that none of `others` uses. */
function distinguishing(choice: string, others: string[]): Set<string> {
	const shared = new Set(others.flatMap((o) => [...stems(o)]));
	return new Set([...stems(choice)].filter((s) => !shared.has(s)));
}

/**
 * Words in `segments` that match the key's distinguishing stems. A segment that
 * mentions every choice's distinguishing stems (an exhibit listing all the
 * accounts, say) treats the choices alike and is not a leak.
 */
function leaksIn(segments: string[], key: string, others: string[]): string[] {
	const keyStems = distinguishing(key, others);
	const otherStems = others.map((o, i) => distinguishing(o, [key, ...others.filter((_, j) => j !== i)]));
	const found: string[] = [];
	for (const segment of segments) {
		const toks = tokens(segment);
		const present = new Set(toks.map((t) => t.stem));
		const hits = toks.filter((t) => keyStems.has(t.stem));
		if (!hits.length) continue;
		const symmetric = otherStems.every((s) => s.size > 0 && [...s].some((x) => present.has(x)));
		if (!symmetric) found.push(...hits.map((t) => t.word));
	}
	return found;
}

function dedupe(words: string[]): string[] {
	const seen = new Set<string>();
	return words.filter((w) => {
		const k = w.toLowerCase();
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

/** The words that give the answer away, or null when the question is clean. */
export function findLeak(candidate: CandidateQuestion): string[] | null {
	const { body, key } = candidate;
	const keyMap = key as Record<string, string>;
	const found: string[] = [];
	if (body.format === "multiple-choice") {
		const correct = body.options.find((o) => o.id === keyMap.optionId);
		if (correct) {
			const others = body.options.filter((o) => o !== correct).map((o) => o.text);
			found.push(...leaksIn([body.stem, exhibitText(body.exhibit)], correct.text, others));
		}
	} else if (body.format === "complete-sentence") {
		const statement = body.statement.replace(/\{\{[^{}]*\}\}/g, " ");
		for (const slot of body.slots) {
			const correct = slot.options.find((o) => o.id === keyMap[slot.id]);
			if (!correct) continue;
			const others = slot.options.filter((o) => o !== correct).map((o) => o.text);
			found.push(...leaksIn([body.stem, exhibitText(body.exhibit), statement], correct.text, others));
		}
	} else {
		for (const slot of body.slots) {
			const item = body.items.find((i) => i.id === keyMap[slot.id]);
			if (!item) continue;
			const own = distinguishing(
				item.text,
				body.items.filter((i) => i !== item).map((i) => i.text),
			);
			found.push(...tokens(slot.label).filter((t) => own.has(t.stem)).map((t) => t.word));
		}
	}
	return found.length ? dedupe(found) : null;
}
