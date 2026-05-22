// Context window sizes by model ID prefix
const MODEL_CONTEXT: Record<string, number> = {
  "claude-opus-4": 200_000,
  "claude-sonnet-4": 200_000,
  "claude-haiku-4": 200_000,
  "claude-3-5-sonnet": 200_000,
  "claude-3-5-haiku": 200_000,
  "claude-3-opus": 200_000,
  "claude-3-sonnet": 200_000,
  "claude-3-haiku": 200_000,
};

const DEFAULT_CONTEXT = 200_000;

export function contextMax(modelId: string): number {
  for (const [prefix, size] of Object.entries(MODEL_CONTEXT)) {
    if (modelId.startsWith(prefix)) return size;
  }
  return DEFAULT_CONTEXT;
}
