import { createFlueClient } from "@flue/sdk";
import { useFlueAgent } from "@flue/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Diagram } from "../components/Diagram.tsx";
import { InstructorStrip, Transcript } from "../components/InstructorPanel.tsx";
import { QuestionView } from "../components/QuestionView.tsx";
import type { QuestionResult } from "../components/QuestionView.tsx";
import { flagQuestion, getSession, submitAnswer } from "../lib/api.ts";
import type { PendingQuestion } from "../lib/room-view.ts";
import { toRoomView, START_MESSAGE } from "../lib/room-view.ts";
import type { AnswerPurpose, PublicQuestion, QuestionResponse, SessionSummary } from "../lib/types.ts";

function message(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/**
 * One coach conversation: the session row, a single memoized client shared by
 * the hook and signal sends, and the room view of its messages.
 */
export function useCoachSession(sessionId: string) {
	const [session, setSession] = useState<SessionSummary | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	useEffect(() => {
		let live = true;
		setSession(null);
		setLoadError(null);
		getSession(sessionId)
			.then((s) => live && setSession(s))
			.catch((e) => live && setLoadError(message(e)));
		return () => {
			live = false;
		};
	}, [sessionId]);

	const client = useMemo(() => createFlueClient({ url: `/agents/coach/${encodeURIComponent(sessionId)}` }), [sessionId]);
	const agent = useFlueAgent({ client });
	const view = useMemo(
		() => toRoomView(agent.messages, { streaming: agent.status === "streaming" }),
		[agent.messages, agent.status],
	);
	const initialData = useMemo(
		() =>
			session
				? { kind: session.kind, skillIds: session.skillIds, ...(session.areaId ? { areaId: session.areaId } : {}) }
				: undefined,
		[session],
	);
	const busy = agent.status === "submitted" || agent.status === "streaming";

	/** Tells the coach how the learner answered; creates the conversation if this is its first delivery. */
	const { messages, refresh } = agent;
	const sendAnswerResult = useCallback(
		async (question: PublicQuestion, response: QuestionResponse, purpose: AnswerPurpose, correct: boolean) => {
			const absent = messages.length === 0;
			await client.send({
				message: {
					kind: "signal",
					type: "answer-result",
					body: `The learner answered question ${question.id} ${correct ? "correctly" : "incorrectly"}.`,
					attributes: {
						questionId: question.id,
						correct: String(correct),
						purpose,
						response: JSON.stringify(response),
					},
				},
				// Only consulted when this send creates the conversation.
				initialData,
			});
			if (absent) refresh();
		},
		[client, initialData, messages.length, refresh],
	);

	return { session, loadError, agent, view, initialData, busy, sendAnswerResult };
}

export type CoachSession = ReturnType<typeof useCoachSession>;

const PURPOSES: readonly string[] = ["practice", "lesson-check", "followup"];

/** Inline "Flag this question" control: a reason field, never a browser dialog. */
export function FlagQuestion({ questionId }: { questionId: string }) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [state, setState] = useState<"idle" | "saving" | "done">("idle");
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		setOpen(false);
		setReason("");
		setState("idle");
		setError(null);
	}, [questionId]);

	if (state === "done") return <p className="flag-done">Flagged. This question will not be served again.</p>;
	if (!open) {
		return (
			<button type="button" className="link-button" onClick={() => setOpen(true)}>
				Flag this question
			</button>
		);
	}
	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setState("saving");
		setError(null);
		try {
			await flagQuestion(questionId, reason.trim());
			setState("done");
		} catch (err) {
			setState("idle");
			setError(message(err));
		}
	};
	return (
		<form className="flag-form" onSubmit={submit}>
			<label>
				What is wrong with this question?
				<input
					type="text"
					value={reason}
					maxLength={500}
					autoFocus
					onChange={(e) => setReason(e.target.value)}
					placeholder="For example: two options are correct"
				/>
			</label>
			<div className="row-actions">
				<button type="submit" disabled={reason.trim() === "" || state === "saving"}>
					Flag
				</button>
				<button type="button" className="secondary" onClick={() => setOpen(false)}>
					Cancel
				</button>
			</div>
			{error && <p className="error">{error}</p>}
		</form>
	);
}

type Answered = { pending: PendingQuestion; response: QuestionResponse; result: QuestionResult };

/**
 * The question the coach put on screen. It stays visible with its result after
 * the answer signal clears it, until the coach presents another one.
 */
export function CoachQuestion({ coach, sessionId }: { coach: CoachSession; sessionId: string }) {
	const pending = coach.view.pendingQuestion;
	const [answered, setAnswered] = useState<Answered | null>(null);
	const [error, setError] = useState<string | null>(null);
	const current = pending ?? answered?.pending ?? null;
	const shownResult = answered && current && answered.pending.question.id === current.question.id ? answered : undefined;
	if (!current) return null;

	const submit = async (response: QuestionResponse) => {
		const purpose = (PURPOSES.includes(current.purpose) ? current.purpose : "followup") as AnswerPurpose;
		setError(null);
		try {
			const result = await submitAnswer({ questionId: current.question.id, response, purpose, sessionId });
			setAnswered({ pending: current, response, result });
			await coach.sendAnswerResult(current.question, response, purpose, result.correct);
		} catch (e) {
			setError(message(e));
		}
	};

	return (
		<div className="coach-question">
			<p className="eyebrow">{current.purpose === "followup" ? "Follow-up question" : "Check your understanding"}</p>
			<QuestionView
				key={current.question.id}
				question={current.question}
				onSubmit={submit}
				result={shownResult?.result}
				response={shownResult?.response}
			/>
			{error && <p className="error">{error}</p>}
			<FlagQuestion questionId={current.question.id} />
		</div>
	);
}

export function Room({ sessionId }: { sessionId: string }) {
	const coach = useCoachSession(sessionId);
	const { session, agent, view, initialData, busy } = coach;
	const [text, setText] = useState("");
	const started = useRef(false);

	// A new lesson starts once; a reload finds history and does not restart it.
	useEffect(() => {
		if (!session || session.kind !== "lesson" || started.current) return;
		if (!agent.historyReady || agent.messages.length > 0) return;
		started.current = true;
		agent.sendMessage(START_MESSAGE, { initialData }).catch(() => {});
	}, [session, agent.historyReady, agent.messages.length, agent.sendMessage, initialData]);

	const send = (e: FormEvent) => {
		e.preventDefault();
		const t = text.trim();
		if (!t) return;
		setText("");
		agent.sendMessage(t, agent.messages.length === 0 ? { initialData } : undefined).catch(() => {});
	};

	return (
		<div className="room">
			<div className="room-head">
				<div>
					<p className="eyebrow">{session?.kind === "practice" ? "Practice coach" : "Lesson"}</p>
					<h1>{session?.title ?? sessionId}</h1>
				</div>
				<a href="#/" className="back">
					Back to skills
				</a>
			</div>
			{coach.loadError && <p className="error">{coach.loadError}</p>}
			<InstructorStrip speaking={view.speaking} areaId={session?.areaId ?? null} />
			<div className="room-grid">
				<section className="card room-board" aria-label="Whiteboard">
					<h2>Whiteboard</h2>
					<Diagram diagram={view.diagram} />
				</section>
				<section className="card room-talk" aria-label="Transcript">
					<h2>Transcript</h2>
					<Transcript turns={view.turns} busy={busy} />
					{agent.error && <p className="error">{agent.error.message}</p>}
					<form className="ask" onSubmit={send}>
						<input
							type="text"
							aria-label="Ask the instructors"
							placeholder="Ask a question at any time"
							value={text}
							onChange={(e) => setText(e.target.value)}
						/>
						<button type="submit" disabled={text.trim() === ""}>
							Send
						</button>
					</form>
				</section>
			</div>
			<CoachQuestion coach={coach} sessionId={sessionId} />
		</div>
	);
}
