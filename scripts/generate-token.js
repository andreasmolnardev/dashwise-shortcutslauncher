#!/usr/bin/env node
// postinstall.js — runs after `bun install` or `npm install`
// Generates a bearer token on first install and saves it to ~/.macropad/config.json

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";

const CONFIG_DIR = join(homedir(), ".dashwise");
const TOKEN_FILE = join(CONFIG_DIR, "config.json");

if (!existsSync(CONFIG_DIR)) {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

if (existsSync(TOKEN_FILE)) {
  try {
    const raw = readFileSync(TOKEN_FILE, "utf8");
    const cfg = JSON.parse(raw);
    if (cfg.token && cfg.port) {
      console.log(`\n[Dashwise] Config already exists at ${TOKEN_FILE}`);
      console.log(`[Dashwise] Token: ${cfg.token.substring(0, 12)}...`);
      process.exit(0);
    }
  } catch {}
}

const token = randomBytes(32).toString("hex");
const config = {
  token,
  port: 47821,
  createdAt: new Date().toISOString(),
};

writeFileSync(TOKEN_FILE, JSON.stringify(config, null, 2), "utf8");

const line = "═".repeat(55);
console.log(`\n╔${line}╗`);
console.log(`║${"  DASHWISE — Installation Complete".padEnd(55)}║`);
console.log(`╠${line}╣`);
console.log(`║${"  Bearer token generated and saved to:".padEnd(55)}║`);
console.log(`║  ${TOKEN_FILE.padEnd(53)}║`);
console.log(`╠${line}╣`);
console.log(`║  Token: ${token.padEnd(46)}║`);
console.log(`║  Port:  ${String(config.port).padEnd(46)}║`);
console.log(`╠${line}╣`);
console.log(`║${"  Usage: Authorization: Bearer <token>".padEnd(55)}║`);
console.log(`╚${line}╝\n`);
