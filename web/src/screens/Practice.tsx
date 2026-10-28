import { useCallback, useEffect, useRef, useState } from "react";
import { Transcript } from "../components/InstructorPanel.tsx";
import { QuestionView } from "../components/QuestionView.tsx";
import type { QuestionResult } from "../components/QuestionView.tsx";
import { nextQuestion, submitAnswer } from "../lib/api.ts";
import type { PublicQuestion, QuestionResponse } from "../lib/types.ts";
import { CoachQuestion, FlagQuestion, useCoachSession } from "./Room.tsx";

const ROUND = 10;

type Current =
	| { state: "loading" }
	| { state: "empty" }
	| { state: "done" }
	| { state: "question"; question: PublicQuestion; result?: QuestionResult; response?: QuestionResponse };

export function Practice({ sessionId }: { sessionId: string }) {
	const coach = useCoachSession(sessionId);
	const { session, view, busy } = coach;
	const [n, setN] = useState(0);
	const [correct, setCorrect] = useState(0);
	const [current, setCurrent] = useState<Current>({ state: "loading" });
	const [error, setError] = useState<string | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	// Questions skipped this round; skipping records no attempt, so the server is told to avoid them.
	const skipped = useRef<string[]>([]);

	const load = useCallback(async () => {
		if (!session) return;
		setError(null);
		setCurrent({ state: "loading" });
		try {
			const q = await nextQuestion(session.skillIds, sessionId, skipped.current);
			if (q) {
				setCurrent({ state: "question", question: q });
				setN((x) => x + 1);
			} else setCurrent({ state: "empty" });
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, [session, sessionId]);

	useEffect(() => {
		void load();
	}, [load]);

	// Reopening a session that already talked to the coach shows that conversation.
	const hasTurns = view.turns.length > 0;
	useEffect(() => {
		if (hasTurns) setPanelOpen(true);
	}, [hasTurns]);

	const check = async (response: QuestionResponse) => {
		if (current.state !== "question") return;
		const question = current.question;
		setError(null);
		try {
			const result = await submitAnswer({ questionId: question.id, response, purpose: "practice", sessionId });
			setCurrent({ state: "question", question, result, response });
			if (result.correct) {
				setCorrect((x) => x + 1);
			} else {
				setPanelOpen(true);
				await coach.sendAnswerResult(question, response, "practice", false);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	const next = () => {
		if (n >= ROUND) setCurrent({ state: "done" });
		else void load();
	};

	const skip = () => {
		if (current.state !== "question") return;
		skipped.current = [...skipped.current, current.question.id];
		setN((x) => x - 1);
		void load();
	};

	const newRound = () => {
		skipped.current = [];
		setN(0);
		setCorrect(0);
		void load();
	};

	return (
		<div className="practice" data-panel={panelOpen}>
			<div className="practice-main">
				<div className="room-head">
					<div>
						<p className="eyebrow">Practice</p>
						<h1>{session?.title ?? sessionId}</h1>
					</div>
					<div className="row-actions">
						{!panelOpen && view.turns.length > 0 && (
							<button type="button" className="secondary" onClick={() => setPanelOpen(true)}>
								Show coach
							</button>
						)}
						<a href="#/" className="back">
							Back to skills
						</a>
					</div>
				</div>
				{coach.loadError && <p className="error">{coach.loadError}</p>}
				{error && <p className="error">{error}</p>}
				{current.state === "question" && (
					<>
						<div className="progress-label">
							Question {n} of {ROUND}
						</div>
						<div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={ROUND} aria-valuenow={n}>
							<div className="progress-fill" style={{ width: `${(n / ROUND) * 100}%` }} />
						</div>
						<QuestionView
							key={current.question.id}
							question={current.question}
							onSubmit={check}
							result={current.result}
							response={current.response}
						/>
						<div className="row-actions spread">
							<FlagQuestion questionId={current.question.id} />
							{current.result ? (
								<button type="button" onClick={next}>
									{n >= ROUND ? "Finish round" : "Next"}
								</button>
							) : (
								<button type="button" className="secondary" onClick={skip}>
									Skip
								</button>
							)}
						</div>
					</>
				)}
				{current.state === "loading" && !error && <p className="muted">Loading the next question...</p>}
				{current.state === "empty" && (
					<div className="card notice">
						<p>
							No questions for this skill yet. Run <code>npm run generate</code>.
						</p>
					</div>
				)}
				{current.state === "done" && (
					<div className="card notice">
						<h2>Round complete</h2>
						<p>
							You answered {correct} of {n} correctly.
						</p>
						<div className="row-actions">
							<button type="button" onClick={newRound}>
								Start another round
							</button>
							<a href="#/" className="back">
								Back to skills
							</a>
						</div>
					</div>
				)}
			</div>
			{panelOpen && (
				<aside className="card practice-panel" aria-label="Coach">
					<div className="panel-head">
						<h2>Coach</h2>
						<button type="button" className="secondary" onClick={() => setPanelOpen(false)}>
							Hide
						</button>
					</div>
					<Transcript turns={view.turns} busy={busy} />
					{coach.agent.error && <p className="error">{coach.agent.error.message}</p>}
					<CoachQuestion coach={coach} sessionId={sessionId} />
				</aside>
			)}
		</div>
	);
}
