import { useState } from "react";
import type { KeyboardEvent } from "react";
import type {
	AnswerResult,
	Choice,
	PublicQuestion,
	QuestionResponse,
	SlotMap,
} from "../lib/types.ts";
import { Exhibit } from "./Exhibit.tsx";

export type QuestionResult = Pick<AnswerResult, "correct" | "key" | "explanation">;

type Props = {
	question: PublicQuestion;
	onSubmit: (response: QuestionResponse) => void;
	result?: QuestionResult;
	/** The submitted response; defaults to what the learner last picked in this view. */
	response?: QuestionResponse;
};

type State = "correct" | "wrong" | undefined;

/** Enter or Space activates a button; onClick covers the mouse and assistive tech. */
function activateKeys(action: () => void) {
	return {
		onKeyDown(e: KeyboardEvent) {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				action();
			}
		},
		onKeyUp(e: KeyboardEvent) {
			if (e.key === " ") e.preventDefault();
		},
	};
}

function Explanation({ text, notes }: { text: string; notes: string[] }) {
	return (
		<div className="qv-explanation">
			<p>{text}</p>
			{notes.length > 0 && (
				<ul>
					{notes.map((n, i) => (
						<li key={i}>{n}</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function QuestionView({ question, onSubmit, result, response }: Props) {
	const body = question.body;
	const [picked, setPicked] = useState<SlotMap>({});
	const locked = result !== undefined;
	const mine: SlotMap = (response as SlotMap | undefined) ?? picked;
	const key = (result?.key ?? {}) as SlotMap;
	const perChoice = result?.explanation.perChoice ?? {};
	const notes: string[] = [];
	const note = (id: string) => {
		if (perChoice[id]) notes.push(perChoice[id]);
	};

	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	let control: React.ReactNode;
	let ready: boolean;
	let submitted: QuestionResponse;

	if (body.format === "multiple-choice") {
		const chosen = mine.optionId;
		ready = chosen !== undefined;
		submitted = { optionId: chosen ?? "" };
		if (locked && chosen !== undefined && chosen !== key.optionId) note(chosen);
		control = (
			<div role="radiogroup" aria-label="Answer choices" className="qv-options">
				{body.options.map((o) => {
					const state: State = !locked
						? undefined
						: o.id === key.optionId
							? "correct"
							: o.id === chosen
								? "wrong"
								: undefined;
					return (
						<div key={o.id} className="qv-option" data-option={o.id} data-state={state}>
							<label>
									<input
									type="radio"
									name={`q-${question.id}`}
									value={o.id}
									checked={chosen === o.id}
									disabled={locked}
									onChange={() => setPicked({ optionId: o.id })}
								/>
								<span>{o.text}</span>
							</label>
							{state && <span className="qv-mark">{state === "correct" ? "Correct answer" : "Your answer"}</span>}
						</div>
					);
				})}
			</div>
		);
	} else if (body.format === "drag-drop") {
		const itemText = (id: string | undefined) => body.items.find((i) => i.id === id)?.text ?? "";
		const placed = new Set(Object.values(mine));
		ready = body.slots.every((s) => mine[s.id] !== undefined);
		submitted = mine;
		const place = (slotId: string, itemId: string) => {
			const next: SlotMap = {};
			for (const [s, i] of Object.entries(mine)) if (i !== itemId) next[s] = i;
			next[slotId] = itemId;
			setPicked(next);
			setSelectedItem(null);
		};
		const clear = (slotId: string) => {
			const next = { ...mine };
			delete next[slotId];
			setPicked(next);
		};
		const pickItem = (id: string) => setSelectedItem((cur) => (cur === id ? null : id));
		const pickSlot = (slotId: string) => {
			if (selectedItem !== null) place(slotId, selectedItem);
		};
		if (locked) {
			for (const s of body.slots) {
				const got = mine[s.id];
				if (got !== undefined && got !== key[s.id]) note(got);
			}
		}
		control = (
			<div className="qv-dragdrop">
				<div className="qv-items" role="group" aria-label="Items">
					{body.items
						.filter((i) => !placed.has(i.id))
						.map((i) => (
							<button
								key={i.id}
								type="button"
								className="qv-item"
								draggable={!locked}
								disabled={locked}
								aria-pressed={selectedItem === i.id}
								aria-label={`Item ${i.text}`}
								onClick={() => pickItem(i.id)}
								{...activateKeys(() => pickItem(i.id))}
								onDragStart={(e) => e.dataTransfer.setData("text/plain", i.id)}
							>
								{i.text}
							</button>
						))}
				</div>
				<ul className="qv-slots">
					{body.slots.map((s) => {
						const got = mine[s.id];
						const state: State = !locked ? undefined : got === key[s.id] ? "correct" : "wrong";
						return (
							<li key={s.id} className="qv-slot-row" data-slot={s.id} data-state={state}>
								<span className="qv-slot-label">{s.label}</span>
								<button
									type="button"
									className="qv-slot"
									disabled={locked}
									aria-pressed={got !== undefined}
									aria-label={`Slot ${s.label}${got !== undefined ? `: ${itemText(got)}` : ": empty"}`}
									onClick={() => pickSlot(s.id)}
									{...activateKeys(() => pickSlot(s.id))}
									onDragOver={(e) => e.preventDefault()}
									onDrop={(e) => {
										e.preventDefault();
										const id = e.dataTransfer.getData("text/plain");
										if (id && !locked) place(s.id, id);
									}}
								>
									{got !== undefined ? itemText(got) : "Drop here"}
								</button>
								{got !== undefined && !locked && (
									<button
										type="button"
										className="secondary qv-remove"
										aria-label={`Remove ${itemText(got)}`}
										onClick={() => clear(s.id)}
									>
										Remove
									</button>
								)}
								{locked && state === "wrong" && (
									<span className="qv-mark">Correct: {itemText(key[s.id])}</span>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		);
	} else {
		ready = body.slots.every((s) => mine[s.id] !== undefined && mine[s.id] !== "");
		submitted = mine;
		const optionText = (opts: Choice[], id: string | undefined) => opts.find((o) => o.id === id)?.text ?? "";
		const slotById = new Map(body.slots.map((s) => [s.id, s]));
		if (locked) {
			for (const s of body.slots) {
				const got = mine[s.id];
				if (got !== undefined && got !== key[s.id]) note(`${s.id}:${got}`);
			}
		}
		const parts = body.statement.split(/\{\{([^{}]*)\}\}/);
		control = (
			<p className="qv-statement">
				{parts.map((part, idx) => {
					if (idx % 2 === 0) return <span key={idx}>{part}</span>;
					const slot = slotById.get(part);
					if (!slot) return <span key={idx}>{`{{${part}}}`}</span>;
					const got = mine[slot.id];
					const state: State = !locked ? undefined : got === key[slot.id] ? "correct" : "wrong";
					return (
						<span key={idx} className="qv-inline" data-slot={slot.id} data-state={state}>
							<select
								aria-label={`Blank ${body.slots.indexOf(slot) + 1}`}
								value={got ?? ""}
								disabled={locked}
								onChange={(e) => setPicked({ ...picked, [slot.id]: e.target.value })}
							>
								<option value="" disabled>
									Select...
								</option>
								{slot.options.map((o) => (
									<option key={o.id} value={o.id}>
										{o.text}
									</option>
								))}
							</select>
							{state === "wrong" && (
								<span className="qv-mark"> Correct: {optionText(slot.options, key[slot.id])}</span>
							)}
						</span>
					);
				})}
			</p>
		);
	}

	return (
		<section className="qv" aria-label="Question" data-format={body.format}>
			<p className="qv-stem">{body.stem}</p>
			{body.exhibit && <Exhibit exhibit={body.exhibit} />}
			{control}
			{result ? (
				<div className="qv-result" role="status" data-correct={result.correct}>
					<strong>{result.correct ? "Correct" : "Not quite"}</strong>
					<Explanation text={result.explanation.correct} notes={notes} />
				</div>
			) : (
				<button type="button" disabled={!ready} onClick={() => onSubmit(submitted)}>
					Check your answer
				</button>
			)}
		</section>
	);
}
