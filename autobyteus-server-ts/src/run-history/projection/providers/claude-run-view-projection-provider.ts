import type { MemoryConversationEntry } from "../../../agent-memory/domain/models.js";
import {
  getClaudeSessionManager,
  type ClaudeSessionManager,
} from "../../../agent-execution/backends/claude/session/claude-session-manager.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
} from "../run-projection-types.js";
import { buildRunProjection } from "../run-projection-utils.js";

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toTimestampSeconds = (value: unknown): number | null => {
  const asNum = asNumber(value);
  if (asNum !== null) {
    return asNum > 10_000_000_000 ? asNum / 1000 : asNum;
  }

  const asStr = asString(value);
  if (!asStr) {
    return null;
  }
  const parsed = Date.parse(asStr);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed / 1000;
};

const collectTextFragments = (value: unknown, depth = 0): string[] => {
  if (depth > 5 || value === null || value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((row) => collectTextFragments(row, depth + 1));
  }
  const objectValue = asObject(value);
  if (!objectValue) {
    return [];
  }

  const candidates = [
    objectValue.text,
    objectValue.content,
    objectValue.value,
    objectValue.delta,
    objectValue.output,
    objectValue.message,
  ];

  return candidates.flatMap((candidate) => collectTextFragments(candidate, depth + 1));
};

const toRole = (row: Record<string, unknown>): string | null => {
  const candidate =
    asString(row.role) ??
    asString(row.sender) ??
    asString(row.author) ??
    asString(row.type);

  if (!candidate) {
    return null;
  }

  const normalized = candidate.toLowerCase();
  if (normalized.includes("assistant") || normalized.includes("model")) {
    return "assistant";
  }
  if (normalized.includes("user") || normalized.includes("human")) {
    return "user";
  }
  if (normalized.includes("system")) {
    return "system";
  }
  return normalized;
};

const toConversationEntry = (row: Record<string, unknown>): MemoryConversationEntry | null => {
  const role = toRole(row);
  const content = collectTextFragments(row.content ?? row.text ?? row.message ?? row.parts).join("\n\n");
  const timestamp =
    toTimestampSeconds(row.ts) ??
    toTimestampSeconds(row.timestamp) ??
    toTimestampSeconds(row.createdAt) ??
    toTimestampSeconds(row.created_at);

  if (!role && !content) {
    return null;
  }

  return {
    kind: "message",
    role,
    content: content || null,
    ts: timestamp,
  };
};

export class ClaudeRunViewProjectionProvider implements RunProjectionProvider {
  readonly runtimeKind = RuntimeKind.CLAUDE_AGENT_SDK;

  private readonly sessionManager: ClaudeSessionManager;

  constructor(sessionManager: ClaudeSessionManager = getClaudeSessionManager()) {
    this.sessionManager = sessionManager;
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection | null> {
    if (input.runtimeKind !== RuntimeKind.CLAUDE_AGENT_SDK) {
      return null;
    }

    const sessionId = asString(input.metadata?.platformAgentRunId) ?? input.runId;

    const messages = await this.sessionManager.getSessionMessages(sessionId);
    const conversation = messages
      .map((message) => toConversationEntry(message))
      .filter((entry): entry is MemoryConversationEntry => entry !== null);

    return buildRunProjection(input.runId, conversation);
  }
}

let cachedClaudeRunViewProjectionProvider: ClaudeRunViewProjectionProvider | null = null;

export const getClaudeRunViewProjectionProvider = (): ClaudeRunViewProjectionProvider => {
  if (!cachedClaudeRunViewProjectionProvider) {
    cachedClaudeRunViewProjectionProvider = new ClaudeRunViewProjectionProvider();
  }
  return cachedClaudeRunViewProjectionProvider;
};
