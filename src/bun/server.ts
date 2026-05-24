import { Hono } from "hono";
import { cors } from "hono/cors";
import { Database } from "bun:sqlite";
import { join } from "path";
import { homedir } from "os";
import type { DashwiseConfig } from "./config";
import {
  mediaControl,
  getBrightness,
  setBrightness,
  setDoNotDisturb,
  listApps,
  searchApps,
  launchApp,
} from "./actions";

// ─── Shortcut Database ────────────────────────────────────────────────────────

const DB_PATH = join(homedir(), ".dashwise", "shortcuts.sqlite");
const db = new Database(DB_PATH);

// Initialize DB schema
db.run(`
  CREATE TABLE IF NOT EXISTS shortcuts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'app', 'media', 'action'
    payload TEXT NOT NULL -- JSON stringified data
  )
`);

// Seed default shortcuts if empty
const count = db.query("SELECT COUNT(*) as count FROM shortcuts").get() as { count: number };
if (count.count === 0) {
  const seed = [
    { id: crypto.randomUUID(), name: "Play/Pause", type: "media", payload: JSON.stringify({ action: "play" }) },
    { id: crypto.randomUUID(), name: "Brightness Up", type: "action", payload: JSON.stringify({ action: "brightness-up", delta: 0.1 }) },
    { id: crypto.randomUUID(), name: "Brightness Down", type: "action", payload: JSON.stringify({ action: "brightness-down", delta: -0.1 }) },
    { id: crypto.randomUUID(), name: "DND Toggle", type: "action", payload: JSON.stringify({ action: "dnd-toggle" }) },
  ];

  const insert = db.prepare("INSERT INTO shortcuts (id, name, type, payload) VALUES ($id, $name, $type, $payload)");
  for (const s of seed) {
    insert.run({ $id: s.id, $name: s.name, $type: s.type, $payload: s.payload });
  }
}

export function startApiServer(config: DashwiseConfig): void {
  const app = new Hono();

  // ─── Middleware ──────────────────────────────────────────────────────────────
  
  app.use("*", cors());
  
  app.use("/api/*", async (c, next) => {
    const auth = c.req.header("Authorization") ?? "";
    const isAuthenticated = auth === `Bearer ${config.token}` || auth === config.token;
    
    if (!isAuthenticated) {
      return c.json({ error: "Unauthorized — provide: Authorization: Bearer <token>" }, 401);
    }
    await next();
  });

  // ─── Routes ──────────────────────────────────────────────────────────────────

  // Public health check
  app.get("/", (c) => c.redirect("/health"));
  app.get("/openapi.json", async (c) => {
    try {
      const file = Bun.file("openapi.json");
      return c.json(await file.json());
    } catch (e) {
      return c.json({ error: "openapi.json not found" }, 404);
    }
  });
  
  app.get("/health", (c) => {
    return c.json({
      app: "Dashwise Launcher",
      version: "1.0.0",
      status: "running",
      port: config.port,
      docs: {
        auth: "Authorization: Bearer <token>",
        openapi: "/openapi.json",
        endpoints: [
          "GET  /api/shortcuts",
          "POST /api/shortcuts/run?id=<id>",
        ],
      },
    });
  });

  // ─── API Endpoints ──────────────────────────────────────────────────────────

  // GET /api/shortcuts - List all available shortcuts
  app.get("/api/shortcuts", (c) => {
    const shortcuts = db.query("SELECT * FROM shortcuts").all().map((s: any) => ({
      ...s,
      payload: JSON.parse(s.payload)
    }));
    return c.json({ shortcuts });
  });

  // POST /api/shortcuts/run?id=... - Execute a shortcut
  app.post("/api/shortcuts/run", async (c) => {
    const id = c.req.query("id");
    if (!id) return c.json({ error: "Shortcut ID required" }, 400);

    const shortcut = db.query("SELECT * FROM shortcuts WHERE id = ?").get(id) as any;
    if (!shortcut) return c.json({ error: "Shortcut not found" }, 404);

    const payload = JSON.parse(shortcut.payload);
    let result = { success: false, message: "Unknown shortcut type" };

    try {
      if (shortcut.type === "app") {
        result = await launchApp(payload.path);
      } else if (shortcut.type === "media") {
        result = await mediaControl(payload.action);
      } else if (shortcut.type === "action") {
        switch (payload.action) {
          case "brightness-up":
            result = await setBrightness(payload.delta ?? 0.1);
            break;
          case "brightness-down":
            result = await setBrightness(payload.delta ?? -0.1);
            break;
          case "dnd-toggle":
            // We'd need to track state or just toggle. 
            // For now let's assume setDoNotDisturb takes a boolean
            // We might need to fetch current state first or just toggle it in actions
            result = await setDoNotDisturb(true); // Placeholder
            break;
        }
      }
      return c.json(result, result.success ? 200 : 500);
    } catch (err) {
      return c.json({ success: false, error: String(err) }, 500);
    }
  });

  // ─── Start Server ──────────────────────────────────────────────────────────────

  Bun.serve({
    port: config.port,
    fetch: app.fetch,
  });

  console.log(`[Dashwise] API server running on http://localhost:${config.port}`);
}

