import { useEffect, useState } from "react";
import { colorOf } from "../components/InstructorPanel.tsx";
import { createSession, getSkills, listSessions } from "../lib/api.ts";
import { WEB_INSTRUCTORS } from "../lib/instructors.ts";
import type { AreaSummary, SessionKind, SessionSummary, SkillSummary, SkillsResponse } from "../lib/types.ts";

function readinessText(s: SkillSummary): string {
	if (s.readiness.status === "not-enough-data" || s.readiness.score === null) return "not enough data";
	return `${Math.round(s.readiness.score * 100)}% ready`;
}

function questionTotal(s: SkillSummary): number {
	return Object.values(s.questionCounts).reduce((a, b) => a + b, 0);
}

function when(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function Home() {
	const [data, setData] = useState<SkillsResponse | null>(null);
	const [sessions, setSessions] = useState<SessionSummary[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [starting, setStarting] = useState(false);

	useEffect(() => {
		getSkills()
			.then(setData)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
		listSessions()
			.then(setSessions)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
	}, []);

	const start = async (kind: SessionKind, skillIds: string[], areaId?: string) => {
		setStarting(true);
		setError(null);
		try {
			const s = areaId ? await createSession(kind, skillIds, areaId) : await createSession(kind, skillIds);
			window.location.hash = `#/${kind === "lesson" ? "room" : "practice"}/${encodeURIComponent(s.id)}`;
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setStarting(false);
		}
	};

	const toggle = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelected(next);
	};

	const skillRow = (s: SkillSummary) => (
		<li key={s.id} className="skill-row">
			<label className="skill-name">
				<input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} />
				<span>{s.name}</span>
			</label>
			<span className="skill-meta" data-taught={s.taught}>
				{s.taught ? "✓ Taught" : "Not taught"}
			</span>
			<span className="skill-meta" data-readiness={s.readiness.status}>
				{readinessText(s)}
			</span>
			<span className="skill-meta">
				{questionTotal(s)} {questionTotal(s) === 1 ? "question" : "questions"}
			</span>
			<span className="row-actions">
				<button type="button" disabled={starting} onClick={() => start("lesson", [s.id])}>
					Learn
				</button>
				<button type="button" className="secondary" disabled={starting} onClick={() => start("practice", [s.id])}>
					Practice
				</button>
			</span>
		</li>
	);

	const areaSection = (area: AreaSummary, skills: SkillSummary[]) => (
		<section key={area.id} className="area" aria-label={area.name}>
			<div className="area-head">
				<div>
					<h2>{area.name}</h2>
					<p className="muted">
						{area.weightMin}–{area.weightMax}% of the exam
					</p>
				</div>
				{area.skillCount === 0 ? (
					<span className="area-badge" data-later="true">
						Coming later
					</span>
				) : (
					<>
						<span className="area-badge" data-ready={area.ready}>
							{area.ready ? "Ready" : "Not ready yet"}
						</span>
						<button type="button" disabled={starting} onClick={() => start("lesson", [], area.id)}>
							Let the lead choose
						</button>
					</>
				)}
			</div>
			{WEB_INSTRUCTORS.filter((i) => i.areaId === area.id).map((g) => {
				const own = skills.filter((s) => s.specialist === g.id);
				if (own.length === 0) return null;
				return (
					<section key={g.id} className="card skill-group" style={colorOf(g.id)}>
						<h3 className="group-title">{g.name}</h3>
						<ul className="skill-list">{own.map(skillRow)}</ul>
					</section>
				);
			})}
		</section>
	);

	return (
		<div className="home">
			<div className="home-head">
				<div>
					<h1>AZ-104 study coach</h1>
					<p className="muted">Learn a skill with the instructors or practice it.</p>
				</div>
				{data && (
					<div className="ready" data-ready={data.readyAreas === data.totalAreas}>
						<strong>
							{data.readyAreas} of {data.totalAreas} areas ready
						</strong>
						<span className="caption">Study rule of thumb, not Microsoft's scaled score (700 passes)</span>
					</div>
				)}
			</div>

			{error && <p className="error">{error}</p>}

			<div className="home-actions">
				<button
					type="button"
					className="secondary"
					disabled={starting || selected.size === 0}
					onClick={() => start("practice", [...selected])}
				>
					Practice selected{selected.size > 0 ? ` (${selected.size})` : ""}
				</button>
			</div>

			{!data && !error && <p className="muted">Loading skills...</p>}
			{data && data.areas.map((a) => areaSection(a, data.skills.filter((s) => s.areaId === a.id)))}

			<section className="card">
				<h2>Recent sessions</h2>
				{sessions.length === 0 ? (
					<p className="muted">No sessions yet.</p>
				) : (
					<ul className="session-list">
						{sessions.map((s) => (
							<li key={s.id}>
								<a href={`#/${s.kind === "lesson" ? "room" : "practice"}/${encodeURIComponent(s.id)}`}>{s.title}</a>
								<span className="muted">
									{s.kind === "lesson" ? "Lesson" : "Practice"} · {when(s.updatedAt)}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
