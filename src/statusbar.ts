#!/usr/bin/env bun
/**
 * statusbar.ts — claude-tach status bar renderer
 * Fast read of state.json, outputs one line for Claude Code statusBarCommands.
 *
 * Installed to: ~/.claude-tach/statusbar.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "";
const STATE_FILE = join(HOME, ".claude-tach", "state.json");

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function shortenPath(dir: string): string {
  if (dir.startsWith(HOME)) dir = "~" + dir.slice(HOME.length);
  const parts = dir.split("/");
  if (parts.length > 4) return "~/.." + "/" + parts.slice(-2).join("/");
  return dir;
}

function renderBar(pct: number, width = 15): string {
  const filled = Math.min(width, Math.round((pct / 100) * width));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

if (!existsSync(STATE_FILE)) {
  process.stdout.write("⏲ no data");
  process.exit(0);
}

try {
  const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  const pct = Math.min(100, Math.round((state.context_tokens / state.context_max) * 100));
  const bar = renderBar(pct);
  const dir = shortenPath(state.cwd ?? process.cwd());
  const line = `[${bar}] ${String(pct).padStart(3)}% ctx  ↑${formatK(state.session_in).padStart(6)}  ↓${formatK(state.session_out).padStart(6)}  ${dir}`;
  process.stdout.write(line);
} catch {
  process.stdout.write("⏲ error reading state");
}
