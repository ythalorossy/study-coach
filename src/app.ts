import { createAgentRouter } from "@flue/runtime/routing";
import { Hono } from "hono";
import { Assistant } from "./agents/assistant.ts";
import { Coach } from "./agents/coach.ts";
import { createCoachApi } from "./coach/api.ts";
import { getCoachDb } from "./coach/db.ts";
import { requireJsonBody } from "./coach/guard.ts";

const app = new Hono();

app.use("/api/*", requireJsonBody());
app.use("/agents/*", requireJsonBody({ allowEmpty: true }));

app.route("/agents/assistant", createAgentRouter(Assistant));
app.route("/agents/coach", createAgentRouter(Coach));
app.route("/api", createCoachApi(getCoachDb));

export default app;
