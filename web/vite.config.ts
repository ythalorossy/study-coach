import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	root: "web",
	// The Flue dev server also runs Vite from the project root; a shared deps cache makes each invalidate the other.
	cacheDir: "../node_modules/.vite-web",
	plugins: [react()],
	server: {
		host: "127.0.0.1",
		port: 5173,
		proxy: {
			"/api": "http://127.0.0.1:8787",
			"/agents": { target: "http://127.0.0.1:8787", changeOrigin: true },
		},
	},
});
