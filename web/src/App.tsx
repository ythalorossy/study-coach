import { useEffect, useState } from "react";
import { parseRoute } from "./lib/route.ts";
import { Coverage } from "./screens/Coverage.tsx";
import { Docs } from "./screens/Docs.tsx";
import { Home } from "./screens/Home.tsx";
import { Practice } from "./screens/Practice.tsx";
import { Room } from "./screens/Room.tsx";

function useRoute() {
	const [hash, setHash] = useState(window.location.hash);
	useEffect(() => {
		const onChange = () => setHash(window.location.hash);
		window.addEventListener("hashchange", onChange);
		return () => window.removeEventListener("hashchange", onChange);
	}, []);
	return parseRoute(hash);
}

export function App() {
	const route = useRoute();
	return (
		<>
			<header className="topbar">
				<span className="brand">Study Coach</span>
				<nav>
					<a href="#/" aria-current={route.name === "home" ? "page" : undefined}>
						Home
					</a>
					<a href="#/docs" aria-current={route.name === "docs" ? "page" : undefined}>
						Docs
					</a>
					<a href="#/coverage" aria-current={route.name === "coverage" ? "page" : undefined}>
						Coverage
					</a>
				</nav>
			</header>
			<main className={route.name === "room" || route.name === "practice" || route.name === "docs" ? "content wide" : "content"}>
				{route.name === "home" && <Home />}
				{route.name === "room" && <Room key={route.sessionId} sessionId={route.sessionId} />}
				{route.name === "practice" && <Practice key={route.sessionId} sessionId={route.sessionId} />}
				{route.name === "coverage" && <Coverage />}
				{route.name === "docs" && <Docs skillId={route.skillId} tab={route.tab} pageUrl={route.pageUrl} />}
			</main>
		</>
	);
}
