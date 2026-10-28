import type { Exhibit as ExhibitData } from "../lib/types.ts";

export function Exhibit({ exhibit }: { exhibit: ExhibitData }) {
	if (exhibit.kind === "code") {
		return (
			<pre className="exhibit exhibit-code" data-language={exhibit.language}>
				<code>{exhibit.text}</code>
			</pre>
		);
	}
	return (
		<table className="exhibit exhibit-table">
			<thead>
				<tr>
					{exhibit.columns.map((c, i) => (
						<th key={i}>{c}</th>
					))}
				</tr>
			</thead>
			<tbody>
				{exhibit.rows.map((row, r) => (
					<tr key={r}>
						{row.map((cell, c) => (
							<td key={c}>{cell}</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
