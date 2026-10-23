/** Numeric-only Claude Agent SDK result data. This is not a direct-API price quote. */
export interface ClaudeSdkModelUsage {
  rawModelId: string;
  canonicalModel: string | null;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export type ClaudeSdkSelectedMatchState = "matched" | "missing" | "ambiguous";
export type ClaudeSdkQueryKind = "create" | "resume" | "unknown";
