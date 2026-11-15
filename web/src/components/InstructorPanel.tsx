import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { LEARNER, type RoomTurn } from "../lib/room-view.ts";
import { instructorsFor, WEB_INSTRUCTORS } from "../lib/instructors.ts";

export function instructorName(id: string): string {
	if (id === LEARNER) return "You";
	return WEB_INSTRUCTORS.find((i) => i.id === id)?.name ?? id;
}

/** Sets `--c` to the instructor's color token (the lead's for an unknown id) so CSS can use one variable. */
export function colorOf(id: string): CSSProperties {
	return { "--c": `var(--c-${id}, var(--c-lead))` } as CSSProperties;
}

export function InstructorStrip({ speaking, areaId }: { speaking: string | null; areaId: string | null }) {
	return (
		<ul className="instructor-strip" aria-label="Instructors">
			{instructorsFor(areaId).map((i) => (
				<li key={i.id} className="instructor" data-speaking={speaking === i.id} style={colorOf(i.id)}>
					<span className="avatar" aria-hidden="true">
						{i.initials}
					</span>
					<span className="instructor-text">
						<span className="instructor-name">{i.name}</span>
						<span className="instructor-topic">{speaking === i.id ? "Speaking..." : i.topic}</span>
					</span>
				</li>
			))}
		</ul>
	);
}

export function Transcript({ turns, busy }: { turns: RoomTurn[]; busy: boolean }) {
	const end = useRef<HTMLDivElement>(null);
	useEffect(() => {
		end.current?.scrollIntoView({ block: "nearest" });
	}, [turns.length, busy]);
	return (
		<div className="transcript" aria-live="polite">
			{turns.length === 0 && !busy && <p className="muted">Nothing said yet.</p>}
			<ol>
				{turns.map((t) => (
					<li key={t.toolCallId} className={t.instructor === LEARNER ? "turn turn-learner" : "turn"} style={colorOf(t.instructor)}>
						<span className="turn-name">{instructorName(t.instructor)}</span>
						<p className="turn-text">{t.text}</p>
					</li>
				))}
			</ol>
			{busy && <p className="muted typing">The instructors are working...</p>}
			<div ref={end} />
		</div>
	);
}
