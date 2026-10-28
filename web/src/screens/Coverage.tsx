import { Fragment, useEffect, useState } from "react";
import { getCoverage, getSkills } from "../lib/api.ts";
import type { AreaSummary, CoverageResponse, QuestionFormat } from "../lib/types.ts";

const FORMATS: { id: QuestionFormat; title: string }[] = [
	{ id: "multiple-choice", title: "Multiple choice" },
	{ id: "drag-drop", title: "Drag and drop" },
	{ id: "complete-sentence", title: "Complete the sentence" },
];

export function Coverage() {
	const [data, setData] = useState<CoverageResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState<Set<string>>(new Set());
	const [areas, setAreas] = useState<AreaSummary[]>([]);

	useEffect(() => {
		getCoverage()
			.then(setData)
			.catch((e) => setError(e instanceof Error ? e.message : String(e)));
		// Area names for the group rows; the table still renders without them.
		getSkills()
			.then((s) => setAreas(s.areas))
			.catch(() => {});
	}, []);

	const toggle = (id: string) => {
		const next = new Set(open);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setOpen(next);
	};

	if (error) return <p className="error">{error}</p>;
	if (!data) return <p className="muted">Loading coverage...</p>;
	const target = data.target as Record<QuestionFormat, number>;

	return (
		<div className="coverage">
			<h1>Question bank coverage</h1>
			<p className="muted">
				Verified questions per skill and format, against the target (
				{FORMATS.map((f) => `${target[f.id]} ${f.title.toLowerCase()}`).join(", ")}).
			</p>
			<div className="card table-wrap">
				<table className="coverage-table">
					<thead>
						<tr>
							<th>Skill</th>
							{FORMATS.map((f) => (
								<th key={f.id}>{f.title}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.skills.map((s, i) => {
							const newArea = i === 0 || data.skills[i - 1].areaId !== s.areaId;
							const areaTitle = areas.find((a) => a.id === s.areaId)?.name ?? s.areaId;
							const subtopics = Object.entries((s.subtopics ?? {}) as Record<string, number>).sort(
								(a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
							);
							const expanded = open.has(s.id);
							return (
								<Fragment key={s.id}>
									{newArea && (
										<tr className="area-row">
											<th scope="rowgroup" role="rowheader" colSpan={FORMATS.length + 1}>
												{areaTitle}
											</th>
										</tr>
									)}
									<tr>
										<td>
											<button
												type="button"
												className="link-button"
												aria-expanded={expanded}
												onClick={() => toggle(s.id)}
											>
												{expanded ? "▾" : "▸"} {s.name}
											</button>
										</td>
										{FORMATS.map((f) => {
											const count = s.counts[f.id] ?? 0;
											return (
												<td key={f.id} className="count" data-met={count >= target[f.id]}>
													{count} / {target[f.id]}
												</td>
											);
										})}
									</tr>
									{expanded && (
										<tr className="subtopics">
											<td colSpan={FORMATS.length + 1}>
												{subtopics.length === 0 ? (
													<span className="muted">No verified questions yet.</span>
												) : (
													<ul>
														{subtopics.map(([t, c]) => (
															<li key={t}>
																{t}: {c}
															</li>
														))}
													</ul>
												)}
											</td>
										</tr>
									)}
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>

			<section className="card">
				<h2>Flagged questions</h2>
				{data.flags.length === 0 ? (
					<p className="muted">Nothing flagged.</p>
				) : (
					<ul className="flag-list">
						{data.flags.map((f, i) => (
							<li key={`${f.questionId}-${i}`}>
								<p className="flag-stem">{f.stem}</p>
								<p className="muted">
									{f.skillId} · {f.questionId} · {new Date(f.createdAt).toLocaleString()}
								</p>
								<p>Reason: {f.reason}</p>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
