import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";

const CONFIG_DIR = join(homedir(), ".dashwise");
const TOKEN_FILE = join(CONFIG_DIR, "config.json");

export type DashwiseConfig = {
  token: string;
  port: number;
  createdAt: string;
};

export function ensureConfig(): DashwiseConfig {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (existsSync(TOKEN_FILE)) {
    try {
      const raw = readFileSync(TOKEN_FILE, "utf8");
      const cfg = JSON.parse(raw) as DashwiseConfig;
      if (cfg.token && cfg.port) return cfg;
    } catch {
      // fall through to regenerate
    }
  }

  // First install — generate token
  const token = randomBytes(32).toString("hex");
  const config: DashwiseConfig = {
    token,
    port: 47821,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(TOKEN_FILE, JSON.stringify(config, null, 2), "utf8");

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║          DASHWISE — First-time Setup               ║");
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log(`║  Bearer token generated and saved to:              ║`);
  console.log(`║  ${TOKEN_FILE.padEnd(50)}║`);
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log(`║  Token: ${token.substring(0, 42)}...  ║`);
  console.log(`║  Port:  ${String(config.port).padEnd(42)} ║`);
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log("║  Use this token as: Authorization: Bearer <token>  ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  return config;
}
