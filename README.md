# claude-tach

A tachometer for Claude Code — shows context window usage, session tokens in/out, and current directory in the Claude Code status bar.

```
[████████░░░░░░░]  52% ctx  ↑ 12.4k  ↓  8.2k  ~/projects/myapp
```

## Install

```bash
bunx claude-tach install
```

Then restart Claude Code. The status bar activates immediately.

## What it shows

| Field | Description |
|---|---|
| `[████░░░░░░░░░░░]` | Context window fill (current turn / model max) |
| `52% ctx` | Percentage of context window used |
| `↑ 12.4k` | Cumulative session tokens sent in |
| `↓ 8.2k` | Cumulative session tokens generated |
| `~/projects/myapp` | Current working directory |

## How it works

1. A **Stop hook** (`~/.claude-tach/tach-stop.ts`) fires after each Claude Code turn, reads the session transcript JSONL, and aggregates the `usage` objects that Claude's API returns.
2. A **status bar command** (`~/.claude-tach/statusbar.ts`) is polled by Claude Code's `statusBarCommands` feature and renders the one-line display.

No external services, no API calls — reads your local transcript file only.

## Commands

```bash
claude-tach install     # Patch ~/.claude/settings.json and write hook scripts
claude-tach uninstall   # Reverse the install
claude-tach status      # Print current reading in your terminal
claude-tach watch       # Live-updating display (1s poll, Ctrl+C to stop)
```

## Uninstall

```bash
bunx claude-tach uninstall
```

Removes the Stop hook and status bar entry from `~/.claude/settings.json`. Restart Claude Code to take effect.
