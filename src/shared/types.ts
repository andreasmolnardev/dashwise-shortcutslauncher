import type { RPCSchema } from "electrobun/bun";

// ─── Action Types ───────────────────────────────────────────────────────────

export type MediaAction = "play" | "pause" | "stop" | "next" | "previous";

export type App = {
  name: string;
  path: string;
  bundleId?: string;
};

export type ActionResult = {
  success: boolean;
  message?: string;
  data?: unknown;
};

// ─── RPC Schema ─────────────────────────────────────────────────────────────

export type MacropadRPCType = {
  bun: RPCSchema<{
    requests: {
      // App management
      listApps: {
        params: Record<string, never>;
        response: App[];
      };
      launchApp: {
        params: { path: string };
        response: ActionResult;
      };
      searchApps: {
        params: { query: string };
        response: App[];
      };
      // Media controls
      mediaControl: {
        params: { action: MediaAction };
        response: ActionResult;
      };
      // System actions
      setDoNotDisturb: {
        params: { enabled: boolean };
        response: ActionResult;
      };
      setBrightness: {
        params: { delta: number }; // +/- percentage steps
        response: ActionResult;
      };
      getBrightness: {
        params: Record<string, never>;
        response: { level: number };
      };
      // Raycast
      launchRaycast: {
        params: { query?: string };
        response: ActionResult;
      };
      isRaycastInstalled: {
        params: Record<string, never>;
        response: { installed: boolean };
      };
      // API server info
      getApiInfo: {
        params: Record<string, never>;
        response: { port: number; token: string };
      };
    };
    messages: {
      log: { msg: string };
    };
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: {
      statusUpdate: { message: string; type: "success" | "error" | "info" };
      appsRefreshed: { apps: App[] };
    };
  }>;
};
