#!/usr/bin/env bun
/**
 * claude-tach — tachometer for Claude Code
 *
 * Commands:
 *   install    Add Stop hook + statusBarCommands to ~/.claude/settings.json
 *   uninstall  Remove hook and status bar config
 *   status     Print current tachometer reading
 *   watch      Live-update display (polls state file)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join, dirname } from "path";

const HOME = process.env.HOME ?? "";
const TACH_DIR = join(HOME, ".claude-tach");
const STATE_FILE = join(TACH_DIR, "state.json");
const CLAUDE_SETTINGS = join(HOME, ".claude", "settings.json");

const HOOK_DEST = join(TACH_DIR, "tach-stop.ts");
const BAR_DEST = join(TACH_DIR, "statusbar.ts");

// ── Formatting ──────────────────────────────────────────────────────────────

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

function renderStatus(): string {
  if (!existsSync(STATE_FILE)) return "⏲  no session data — run a Claude Code session first";
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    const pct = Math.min(100, Math.round((s.context_tokens / s.context_max) * 100));
    const bar = renderBar(pct);
    const dir = shortenPath(s.cwd ?? process.cwd());
    return `[${bar}] ${String(pct).padStart(3)}% ctx  ↑${formatK(s.session_in).padStart(6)}  ↓${formatK(s.session_out).padStart(6)}  ${dir}`;
  } catch {
    return "⏲  error reading state";
  }
}

// ── Script sources (written to ~/.claude-tach on install) ───────────────────

function hookScript(): string {
  return readFileSync(join(import.meta.dir, "hooks/tach-stop.ts"), "utf-8");
}

function statusbarScript(): string {
  return readFileSync(join(import.meta.dir, "statusbar.ts"), "utf-8");
}

// ── Settings.json patching ───────────────────────────────────────────────────

function loadSettings(): Record<string, unknown> {
  if (!existsSync(CLAUDE_SETTINGS)) return {};
  try {
    return JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>): void {
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(settings, null, 2) + "\n");
}

function addStopHook(settings: Record<string, unknown>): void {
  const hooks = (settings.hooks as Record<string, unknown[]>) ?? {};
  const stopArr = (hooks.Stop as Array<{ hooks: Array<{ type: string; command: string }> }>) ?? [];

  const hookEntry = { type: "command", command: `$HOME/.claude-tach/tach-stop.ts` };

  if (stopArr.length === 0) {
    stopArr.push({ hooks: [hookEntry] });
  } else {
    const existing = stopArr[0].hooks ?? [];
    const alreadyAdded = existing.some((h) => h.command?.includes("claude-tach"));
    if (!alreadyAdded) existing.push(hookEntry);
    stopArr[0].hooks = existing;
  }

  hooks.Stop = stopArr;
  settings.hooks = hooks;
}

function removeStopHook(settings: Record<string, unknown>): void {
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks?.Stop) return;
  const stopArr = hooks.Stop as Array<{ hooks: Array<{ type: string; command: string }> }>;
  for (const group of stopArr) {
    if (group.hooks) {
      group.hooks = group.hooks.filter((h) => !h.command?.includes("claude-tach"));
    }
  }
}

function addStatusBar(settings: Record<string, unknown>): void {
  const cmds = (settings.statusBarCommands as string[]) ?? [];
  const entry = `$HOME/.claude-tach/statusbar.ts`;
  if (!cmds.includes(entry)) cmds.push(entry);
  settings.statusBarCommands = cmds;
}

function removeStatusBar(settings: Record<string, unknown>): void {
  const cmds = (settings.statusBarCommands as string[]) ?? [];
  settings.statusBarCommands = cmds.filter((c) => !c.includes("claude-tach"));
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function install(): Promise<void> {
  console.log("Installing claude-tach...\n");

  // 1. Create ~/.claude-tach/
  if (!existsSync(TACH_DIR)) {
    mkdirSync(TACH_DIR, { recursive: true });
    console.log(`  ✓ Created ${TACH_DIR}`);
  }

  // 2. Write hook and statusbar scripts
  writeFileSync(HOOK_DEST, hookScript());
  chmodSync(HOOK_DEST, 0o755);
  console.log(`  ✓ Wrote ${HOOK_DEST}`);

  writeFileSync(BAR_DEST, statusbarScript());
  chmodSync(BAR_DEST, 0o755);
  console.log(`  ✓ Wrote ${BAR_DEST}`);

  // 3. Patch ~/.claude/settings.json
  if (!existsSync(CLAUDE_SETTINGS)) {
    console.error(`\n  ✗ ${CLAUDE_SETTINGS} not found — is Claude Code installed?`);
    process.exit(1);
  }

  const settings = loadSettings();
  addStopHook(settings);
  addStatusBar(settings);
  saveSettings(settings);
  console.log(`  ✓ Patched ${CLAUDE_SETTINGS}`);

  console.log("\n✓ claude-tach installed.");
  console.log("  Restart Claude Code to activate the Stop hook and status bar.");
}

async function uninstall(): Promise<void> {
  console.log("Uninstalling claude-tach...\n");

  const settings = loadSettings();
  removeStopHook(settings);
  removeStatusBar(settings);
  saveSettings(settings);
  console.log(`  ✓ Removed entries from ${CLAUDE_SETTINGS}`);

  // Leave ~/.claude-tach/state.json in place (user data), just note it
  console.log(`  ℹ State file left at ${STATE_FILE} (delete manually if desired)`);

  console.log("\n✓ claude-tach uninstalled. Restart Claude Code to take effect.");
}

async function watch(): Promise<void> {
  process.stdout.write("\x1b[?25l"); // hide cursor
  const cleanup = () => {
    process.stdout.write("\x1b[?25h\n");
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  console.log("claude-tach — watching (Ctrl+C to stop)\n");
  while (true) {
    process.stdout.write("\r\x1b[K" + renderStatus());
    await Bun.sleep(1000);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2];

switch (cmd) {
  case "install":
    await install();
    break;
  case "uninstall":
    await uninstall();
    break;
  case "status":
    console.log(renderStatus());
    break;
  case "watch":
    await watch();
    break;
  default:
    console.log(
      [
        "claude-tach — tachometer for Claude Code",
        "",
        "Usage:",
        "  claude-tach install     Add Stop hook + status bar to Claude Code settings",
        "  claude-tach uninstall   Remove from Claude Code settings",
        "  claude-tach status      Print current reading",
        "  claude-tach watch       Live-updating display (1s poll)",
        "",
        "After install, restart Claude Code. The status bar shows:",
        "  [████████░░░░░░░] 52% ctx  ↑ 12.4k  ↓ 8.2k  ~/projects/myapp",
      ].join("\n")
    );
}
