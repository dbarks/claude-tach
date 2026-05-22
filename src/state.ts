import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "";
export const STATE_DIR = join(HOME, ".claude-tach");
export const STATE_FILE = join(STATE_DIR, "state.json");

export interface TachState {
  session_id: string;
  model: string;
  context_tokens: number;
  context_max: number;
  session_in: number;
  session_out: number;
  cwd: string;
  updated_at: string;
}

export function readState(): TachState | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as TachState;
  } catch {
    return null;
  }
}

export function writeState(state: TachState): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
