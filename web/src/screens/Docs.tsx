import { useEffect, useState, type MouseEvent } from "react";
import { getDocsPage, getDocsSkill, getSkills } from "../lib/api.ts";
import type { DocsTab } from "../lib/route.ts";
import { WEB_INSTRUCTORS } from "../lib/instructors.ts";
import type { DocsPage, DocsSkill, SkillsResponse } from "../lib/types.ts";

function message(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

function pagesHref(skillId: string, url: string): string {
	return `#/docs/${encodeURIComponent(skillId)}/pages/${encodeURIComponent(url)}`;
}

// Same-page anchors scroll without touching the hash, which holds the route.
function onAnchorClick(e: MouseEvent<HTMLDivElement>) {
	const link = (e.target as HTMLElement).closest("a[data-anchor]");
	if (!link) return;
	e.preventDefault();
	document.getElementById(link.getAttribute("data-anchor") ?? "")?.scrollIntoView({ behavior: "smooth" });
}

function SkillList({ skillId }: { skillId?: string }) {
	const [data, setData] = useState<SkillsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		getSkills()
			.then(setData)
			.catch((e) => setError(message(e)));
	}, []);
	return (
		<nav className="docs-skills" aria-label="Skills">
			{error && <p className="error">{error}</p>}
			{data &&
				data.areas
					.filter((a) => a.skillCount > 0)
					.map((area) => (
						<section key={area.id} aria-label={area.name}>
							<h2 className="docs-area">{area.name}</h2>
							{WEB_INSTRUCTORS.filter((i) => i.areaId === area.id).map((g) => (
								<section key={g.id}>
									<h3 style={{ color: `var(--c-${g.id})` }}>{g.name}</h3>
									<ul>
										{data.skills
											.filter((s) => s.specialist === g.id)
											.map((s) => (
												<li key={s.id}>
													<a
														href={`#/docs/${encodeURIComponent(s.id)}`}
														aria-current={s.id === skillId ? "page" : undefined}
													>
														{s.name}
													</a>
												</li>
											))}
									</ul>
								</section>
							))}
						</section>
					))}
		</nav>
	);
}

function SourcePage({ skillId, url }: { skillId: string; url: string }) {
	const [page, setPage] = useState<DocsPage | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		setPage(null);
		setError(null);
		getDocsPage(skillId, url)
			.then(setPage)
			.catch((e) => setError(message(e)));
	}, [skillId, url]);
	if (error) return <p className="error">{error}</p>;
	if (!page) return <p className="muted">Loading…</p>;
	return (
		<article className="doc-page">
			{/* The server sanitizes this HTML (src/coach/doc-render.ts). */}
			<div className="doc-html" onClick={onAnchorClick} dangerouslySetInnerHTML={{ __html: page.html }} />
			<footer className="caption">
				From{" "}
				<a href={page.source.githubUrl} target="_blank" rel="noopener noreferrer">
					MicrosoftDocs/{page.source.repo} on GitHub
				</a>
				, licensed {page.source.license}.{" "}
				<a href={page.url} target="_blank" rel="noopener noreferrer">
					Open on Learn
				</a>
			</footer>
		</article>
	);
}

function SkillDocs({ skillId, tab, pageUrl }: { skillId: string; tab: DocsTab; pageUrl?: string }) {
	const [docs, setDocs] = useState<DocsSkill | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		setDocs(null);
		setError(null);
		getDocsSkill(skillId)
			.then(setDocs)
			.catch((e) => setError(message(e)));
	}, [skillId]);
	if (error) return <p className="error">{error}</p>;
	if (!docs) return <p className="muted">Loading…</p>;
	const shown = pageUrl ?? docs.pages.find((p) => p.local)?.url;
	return (
		<div className="docs-skill">
			<h1>{docs.name}</h1>
			<div className="docs-tabs" role="tablist">
				<a role="tab" aria-selected={tab === "sheet"} href={`#/docs/${encodeURIComponent(skillId)}/sheet`}>
					Fact sheet
				</a>
				<a role="tab" aria-selected={tab === "pages"} href={`#/docs/${encodeURIComponent(skillId)}/pages`}>
					Source pages
				</a>
			</div>
			{tab === "sheet" &&
				(docs.factSheet ? (
					<article className="doc-page">
						{docs.factSheet.status === "stale" && (
							<p className="stale-badge" title="Its source pages changed since it was built. Run npm run docs:sheets.">
								stale
							</p>
						)}
						{/* The server sanitizes this HTML (src/coach/doc-render.ts). */}
						<div className="doc-html" onClick={onAnchorClick} dangerouslySetInnerHTML={{ __html: docs.factSheet.html }} />
					</article>
				) : (
					<p className="muted">No fact sheet yet. Run npm run docs:sheets.</p>
				))}
			{tab === "pages" && (
				<>
					<ul className="docs-pages">
						{docs.pages.map((p) => (
							<li key={p.url}>
								{p.local ? (
									<a href={pagesHref(skillId, p.url)} aria-current={p.url === shown ? "page" : undefined}>
										{p.title}
									</a>
								) : (
									<a href={p.url} target="_blank" rel="noopener noreferrer">
										{p.title} (Open on Learn)
									</a>
								)}
							</li>
						))}
					</ul>
					{shown ? (
						<SourcePage skillId={skillId} url={shown} />
					) : (
						<p className="muted">None of this skill's pages are in the local docs. Open them on Learn.</p>
					)}
				</>
			)}
		</div>
	);
}

export function Docs({ skillId, tab, pageUrl }: { skillId?: string; tab: DocsTab; pageUrl?: string }) {
	return (
		<div className="docs">
			<SkillList skillId={skillId} />
			<div className="docs-main">
				{skillId ? (
					<SkillDocs key={skillId} skillId={skillId} tab={tab} pageUrl={pageUrl} />
				) : (
					<p className="muted">Choose a skill to read its fact sheet and source pages.</p>
				)}
			</div>
		</div>
	);
}
