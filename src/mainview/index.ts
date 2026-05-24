import { Electroview } from "electrobun/browser";
import type { MacropadRPCType } from "../shared/types";

// ─── RPC Setup ────────────────────────────────────────────────────────────────

const electroview = new Electroview<MacropadRPCType>({
  webview: {
    handlers: {
      requests: {},
      messages: {
        statusUpdate: ({ message, type }) => showToast(message, type),
        appsRefreshed: ({ apps }) => renderApps(apps),
      },
    },
  },
});

const rpc = electroview.rpc;

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message: string, type: "success" | "error" | "info" = "info") {
  const area = document.getElementById("toast-area")!;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  area.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    const tab = (item as HTMLElement).dataset.tab!;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById(`tab-${tab}`)!.classList.add("active");

    // Lazy load data when tabs are activated
    if (tab === "apps") loadApps();
    if (tab === "system") loadSystemState();
    if (tab === "api") loadApiInfo();
  });
});

// ─── Dashboard Actions ────────────────────────────────────────────────────────

async function sendMedia(action: "play" | "pause" | "stop" | "next" | "previous") {
  const result = await rpc.request.mediaControl({ action });
  showToast(result.message ?? `Media: ${action}`, result.success ? "success" : "error");
}

let dndState = false;

document.getElementById("btn-play")!.addEventListener("click", () => sendMedia("play"));
document.getElementById("btn-prev")!.addEventListener("click", () => sendMedia("previous"));
document.getElementById("btn-next")!.addEventListener("click", () => sendMedia("next"));

document.getElementById("btn-bright-up")!.addEventListener("click", async () => {
  const result = await rpc.request.setBrightness({ delta: 1 });
  showToast(result.message ?? "Brightness up", result.success ? "success" : "error");
});

document.getElementById("btn-bright-down")!.addEventListener("click", async () => {
  const result = await rpc.request.setBrightness({ delta: -1 });
  showToast(result.message ?? "Brightness down", result.success ? "success" : "error");
});

document.getElementById("btn-dnd")!.addEventListener("click", async () => {
  dndState = !dndState;
  const btn = document.getElementById("btn-dnd")!;
  btn.classList.toggle("active", dndState);
  const result = await rpc.request.setDoNotDisturb({ enabled: dndState });
  showToast(result.message ?? `DND ${dndState ? "on" : "off"}`, result.success ? "success" : "error");
});

document.getElementById("btn-raycast")!.addEventListener("click", async () => {
  const result = await rpc.request.launchRaycast({});
  showToast(result.message ?? "Raycast", result.success ? "success" : "error");
});

// ─── Apps Tab ─────────────────────────────────────────────────────────────────

let allApps: Array<{ name: string; path: string }> = [];

async function loadApps() {
  const grid = document.getElementById("app-grid")!;
  grid.innerHTML = '<div class="loading-state">Loading applications…</div>';
  try {
    allApps = await rpc.request.listApps({});
    renderApps(allApps);
  } catch (e) {
    grid.innerHTML = '<div class="loading-state" style="color:var(--red)">Failed to load apps</div>';
  }
}

function renderApps(apps: typeof allApps) {
  const grid = document.getElementById("app-grid")!;
  if (!apps.length) {
    grid.innerHTML = '<div class="loading-state">No apps found</div>';
    return;
  }
  grid.innerHTML = apps
    .map(
      (app) => `
    <div class="app-card" data-path="${escHtml(app.path)}">
      <div class="app-name">${escHtml(app.name)}</div>
      <div class="app-path">${escHtml(app.path.replace(/^\/Applications\//, ""))}</div>
    </div>`
    )
    .join("");

  grid.querySelectorAll(".app-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const path = (card as HTMLElement).dataset.path!;
      const name = card.querySelector(".app-name")!.textContent!;
      showToast(`Launching ${name}…`, "info");
      const result = await rpc.request.launchApp({ path });
      showToast(result.message ?? `Launched ${name}`, result.success ? "success" : "error");
    });
  });
}

document.getElementById("app-search")!.addEventListener("input", (e) => {
  const q = (e.target as HTMLInputElement).value.toLowerCase();
  const filtered = allApps.filter(
    (a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q)
  );
  renderApps(filtered);
});

document.getElementById("btn-refresh-apps")!.addEventListener("click", loadApps);

// ─── Media Tab ────────────────────────────────────────────────────────────────

document.getElementById("m-play")!.addEventListener("click", () => sendMedia("play"));
document.getElementById("m-prev")!.addEventListener("click", () => sendMedia("previous"));
document.getElementById("m-next")!.addEventListener("click", () => sendMedia("next"));
document.getElementById("m-stop")!.addEventListener("click", () => sendMedia("stop"));

// ─── System Tab ───────────────────────────────────────────────────────────────

let systemDndState = false;

async function loadSystemState() {
  // Check brightness
  try {
    const { level } = await rpc.request.getBrightness({});
    (document.getElementById("brightness-fill") as HTMLElement).style.width = `${level * 100}%`;
  } catch {}

  // Check Raycast
  try {
    const { installed } = await rpc.request.isRaycastInstalled({});
    const el = document.getElementById("raycast-status")!;
    el.textContent = installed ? "✓ Installed" : "Not installed";
    el.className = `raycast-status ${installed ? "installed" : "not-installed"}`;
    (document.getElementById("s-raycast") as HTMLButtonElement).disabled = !installed;
  } catch {}
}

document.getElementById("s-bright-up")!.addEventListener("click", async () => {
  const result = await rpc.request.setBrightness({ delta: 1 });
  showToast(result.message ?? "Brightness up", result.success ? "success" : "error");
});

document.getElementById("s-bright-down")!.addEventListener("click", async () => {
  const result = await rpc.request.setBrightness({ delta: -1 });
  showToast(result.message ?? "Brightness down", result.success ? "success" : "error");
});

document.getElementById("dnd-toggle")!.addEventListener("click", async () => {
  systemDndState = !systemDndState;
  const btn = document.getElementById("dnd-toggle")!;
  btn.dataset.state = systemDndState ? "on" : "off";
  const result = await rpc.request.setDoNotDisturb({ enabled: systemDndState });
  showToast(result.message ?? `DND ${systemDndState ? "on" : "off"}`, result.success ? "success" : "error");
});

document.getElementById("s-raycast")!.addEventListener("click", async () => {
  const result = await rpc.request.launchRaycast({});
  showToast(result.message ?? "Raycast", result.success ? "success" : "error");
});

// ─── API Tab ──────────────────────────────────────────────────────────────────

let fullToken = "";

async function loadApiInfo() {
  try {
    const { port, token } = await rpc.request.getApiInfo({});
    fullToken = token;
    (document.getElementById("api-url") as HTMLElement).textContent = `http://localhost:${port}`;
    (document.getElementById("curl-example") as HTMLElement).textContent =
      `# List apps\ncurl http://localhost:${port}/api/apps \\\n  -H "Authorization: Bearer ${token.substring(0, 12)}..."\n\n# Play/Pause media\ncurl -X POST http://localhost:${port}/api/media \\\n  -H "Authorization: Bearer ${token.substring(0, 12)}..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"action":"play"}'\n\n# Launch an app\ncurl -X POST http://localhost:${port}/api/apps/launch \\\n  -H "Authorization: Bearer ${token.substring(0, 12)}..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Safari"}'`;
  } catch {}
}

document.getElementById("btn-reveal")!.addEventListener("click", () => {
  const el = document.getElementById("api-token")!;
  const btn = document.getElementById("btn-reveal")!;
  if (btn.textContent === "Show") {
    el.textContent = fullToken;
    btn.textContent = "Hide";
  } else {
    el.textContent = "••••••••••••••••";
    btn.textContent = "Show";
  }
});

document.getElementById("btn-copy")!.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(fullToken);
    showToast("Token copied to clipboard", "success");
  } catch {
    showToast("Copy failed", "error");
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Init ─────────────────────────────────────────────────────────────────────

// Load API info and check Raycast on startup
loadApiInfo();

// Pre-check Raycast availability for dashboard badge
rpc.request.isRaycastInstalled({}).then(({ installed }) => {
  const card = document.getElementById("btn-raycast")!;
  if (!installed) {
    card.setAttribute("title", "Raycast is not installed");
    card.style.opacity = "0.5";
  }
}).catch(() => {});
