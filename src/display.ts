const HOME = process.env.HOME ?? "";

export function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export function shortenPath(dir: string): string {
  if (dir.startsWith(HOME)) {
    dir = "~" + dir.slice(HOME.length);
  }
  const parts = dir.split("/");
  // Show last 3 segments max
  if (parts.length > 4) {
    return "~/.." + "/" + parts.slice(-2).join("/");
  }
  return dir;
}

export function renderBar(pct: number, width = 15): string {
  const filled = Math.min(width, Math.round((pct / 100) * width));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function renderLine(opts: {
  contextTokens: number;
  contextMax: number;
  sessionIn: number;
  sessionOut: number;
  cwd: string;
}): string {
  const pct = Math.min(100, Math.round((opts.contextTokens / opts.contextMax) * 100));
  const bar = renderBar(pct);
  const dir = shortenPath(opts.cwd);
  return `[${bar}] ${String(pct).padStart(3)}% ctx  ↑${formatK(opts.sessionIn).padStart(6)}  ↓${formatK(opts.sessionOut).padStart(6)}  ${dir}`;
}
