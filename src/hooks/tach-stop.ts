#!/usr/bin/env bun
/**
 * tach-stop.ts — claude-tach Stop hook
 * Reads the session transcript JSONL, aggregates token usage, writes state.
 *
 * Installed to: ~/.claude-tach/tach-stop.ts
 * Triggered by: Claude Code Stop hook
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "";
const STATE_DIR = join(HOME, ".claude-tach");
const STATE_FILE = join(STATE_DIR, "state.json");

// Context window sizes by model prefix
function contextMax(modelId: string): number {
  const map: Record<string, number> = {
    "claude-opus-4": 200_000,
    "claude-sonnet-4": 200_000,
    "claude-haiku-4": 200_000,
    "claude-3-5": 200_000,
    "claude-3": 200_000,
  };
  for (const [prefix, size] of Object.entries(map)) {
    if (modelId.startsWith(prefix)) return size;
  }
  return 200_000;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
}

interface UsageRecord {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
}

interface AssistantMessage {
  type: "assistant";
  message?: {
    model?: string;
    usage?: UsageRecord;
  };
}

const raw = await readStdin().catch(() => "{}");
const input: HookInput = JSON.parse(raw || "{}");

const sessionId = input.session_id ?? "unknown";
const cwd = input.cwd ?? process.cwd();
const transcriptPath = input.transcript_path;

let sessionIn = 0;
let sessionOut = 0;
let latestContextTokens = 0;
let model = "claude-sonnet-4-6";

if (transcriptPath && existsSync(transcriptPath)) {
  const lines = readFileSync(transcriptPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  for (const line of lines) {
    try {
      const record = JSON.parse(line) as AssistantMessage;
      if (record.type !== "assistant" || !record.message?.usage) continue;

      const u = record.message.usage;
      const inp = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      const out = u.output_tokens ?? 0;

      sessionIn += inp;
      sessionOut += out;
      latestContextTokens = inp; // last turn context size ≈ current fill
      if (record.message.model) model = record.message.model;
    } catch {
      // malformed line — skip
    }
  }
}

const state = {
  session_id: sessionId,
  model,
  context_tokens: latestContextTokens,
  context_max: contextMax(model),
  session_in: sessionIn,
  session_out: sessionOut,
  cwd,
  updated_at: new Date().toISOString(),
};

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

process.exit(0);
