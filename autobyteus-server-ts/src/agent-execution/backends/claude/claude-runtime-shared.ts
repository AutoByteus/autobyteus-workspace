export const CLAUDE_AGENT_SDK_MODULE_NAME = "@anthropic-ai/claude-agent-sdk";
export const MODEL_DISCOVERY_PROBE_PROMPT = "Enumerate supported models only.";

export const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export type ClaudeSdkPermissionMode = "default" | "plan" | "acceptEdits" | "bypassPermissions";

export interface ClaudeSessionEvent {
  method: string;
  params?: Record<string, unknown>;
}

export const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const asNonEmptyRawString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const nowTimestampSeconds = (): number => Math.floor(Date.now() / 1000);

export const toLowerTrimmed = (value: string): string => value.trim().toLowerCase();
