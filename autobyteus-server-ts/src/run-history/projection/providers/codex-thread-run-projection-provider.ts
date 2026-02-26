import fs from "node:fs";
import type { MemoryConversationEntry } from "../../../agent-memory-view/domain/models.js";
import {
  CodexThreadHistoryReader,
  getCodexThreadHistoryReader,
} from "../../../runtime-execution/codex-app-server/codex-thread-history-reader.js";
import type { RunProjectionProvider, RunProjectionProviderInput } from "../run-projection-provider-port.js";
import { buildRunProjection } from "../run-projection-utils.js";
import type { RunProjection } from "../run-projection-types.js";

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asArray = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeTimestampSeconds = (value: unknown): number | null => {
  const numberValue = asNumber(value);
  if (numberValue !== null) {
    return numberValue > 10_000_000_000 ? numberValue / 1000 : numberValue;
  }
  const stringValue = asString(value);
  if (!stringValue) {
    return null;
  }
  const parsed = Date.parse(stringValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed / 1000;
};

const resolveEntryTimestamp = (entry: Record<string, unknown>): number | null =>
  normalizeTimestampSeconds(
    entry.ts ??
      entry.timestamp ??
      entry.createdAt ??
      entry.created_at ??
      entry.updatedAt ??
      entry.updated_at ??
      null,
  );

const collectTextFragments = (value: unknown, depth = 0): string[] => {
  if (depth > 4 || value === null || value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextFragments(entry, depth + 1));
  }
  const objectValue = asObject(value);
  if (!objectValue) {
    return [];
  }

  const fieldsInPriorityOrder = [
    objectValue.text,
    objectValue.content,
    objectValue.value,
    objectValue.prompt,
    objectValue.delta,
    objectValue.summary,
  ];
  return fieldsInPriorityOrder.flatMap((entry) => collectTextFragments(entry, depth + 1));
};

const normalizeItemKind = (item: Record<string, unknown>): string =>
  (
    asString(item.type) ??
    asString(item.method) ??
    asString(item.kind) ??
    ""
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const extractInputTexts = (turn: Record<string, unknown>): string[] => {
  const messages: string[] = [];
  const input = turn.input;
  if (typeof input === "string") {
    messages.push(input);
  }

  const inputArray = asArray(input);
  if (inputArray) {
    for (const item of inputArray) {
      if (typeof item === "string") {
        messages.push(item);
        continue;
      }
      const objectItem = asObject(item);
      if (!objectItem) {
        continue;
      }
      const text =
        asString(objectItem.text) ??
        asString(objectItem.content) ??
        asString(objectItem.value) ??
        asString(objectItem.prompt);
      if (text) {
        messages.push(text);
      }
    }
  }

  const fallback =
    asString(turn.userMessage) ??
    asString(turn.user_message) ??
    asString(turn.prompt);
  if (fallback) {
    messages.push(fallback);
  }

  const items = asArray(turn.items) ?? [];
  for (const item of items) {
    const objectItem = asObject(item);
    if (!objectItem) {
      continue;
    }
    const itemKind = normalizeItemKind(objectItem);
    if (!itemKind.includes("usermessage")) {
      continue;
    }
    const fromContent = collectTextFragments(objectItem.content);
    const directText = asString(objectItem.text);
    for (const text of [...fromContent, ...(directText ? [directText] : [])]) {
      messages.push(text);
    }
  }

  return Array.from(
    new Set(messages.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
};

const combineAssistantContent = (textParts: string[], reasoningParts: string[]): string | null => {
  const sections: string[] = [];
  const joinedText = textParts.join("\n\n");
  if (joinedText.trim()) {
    sections.push(joinedText.trim());
  }
  const joinedReasoning = reasoningParts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n");
  if (joinedReasoning) {
    sections.push(`[reasoning]\n${joinedReasoning}`);
  }
  if (sections.length === 0) {
    return null;
  }
  return sections.join("\n\n");
};

const resolveToolEntry = (item: Record<string, unknown>): MemoryConversationEntry | null => {
  const method = (
    asString(item.method) ??
    asString(item.type) ??
    asString(item.kind) ??
    ""
  ).toLowerCase();

  const indicatesTool =
    method.includes("commandexecution") ||
    method.includes("filechange") ||
    method.includes("tool");
  if (!indicatesTool) {
    return null;
  }

  const errorObject = asObject(item.error);
  const toolError =
    asString(item.toolError) ??
    asString(item.tool_error) ??
    asString(item.error) ??
    asString(errorObject?.message) ??
    null;

  const entry: MemoryConversationEntry = {
    kind: "tool_call",
    role: null,
    content: null,
    toolName:
      asString(item.toolName) ??
      asString(item.tool_name) ??
      asString(item.command) ??
      asString(item.name) ??
      "unknown_tool",
    toolArgs:
      asObject(item.arguments) ??
      asObject(item.toolArgs) ??
      asObject(item.tool_args) ??
      asObject(item.args) ??
      null,
    toolResult:
      item.result ??
      item.toolResult ??
      item.tool_result ??
      null,
    toolError,
    media: null,
    ts: resolveEntryTimestamp(item),
  };

  return entry;
};

const resolveTextPart = (item: Record<string, unknown>): string | null => {
  const kind = normalizeItemKind(item);
  if (
    !kind.includes("outputtext") &&
    !kind.includes("assistant") &&
    !kind.includes("agentmessage")
  ) {
    return null;
  }
  const fragments = [
    asString(item.delta),
    asString(item.text),
    ...collectTextFragments(item.content),
    asString(item.value),
  ].filter((entry): entry is string => Boolean(entry));
  if (fragments.length === 0) {
    return null;
  }
  return fragments.join("\n");
};

const resolveReasoningPart = (item: Record<string, unknown>): string | null => {
  const kind = normalizeItemKind(item);
  if (!kind.includes("reasoning")) {
    return null;
  }
  const fragments = [
    asString(item.delta),
    asString(item.text),
    ...collectTextFragments(item.summary),
    ...collectTextFragments(item.content),
    asString(item.value),
  ].filter((entry): entry is string => Boolean(entry));
  if (fragments.length === 0) {
    return null;
  }
  return fragments.join("\n");
};

const extractTurns = (payload: Record<string, unknown>): Array<Record<string, unknown>> => {
  const thread = asObject(payload.thread);
  const turns =
    asArray(thread?.turns) ??
    asArray(payload.turns) ??
    asArray(thread?.history) ??
    asArray(payload.history) ??
    [];

  return turns
    .map((turn, index) => ({ turn: asObject(turn), index }))
    .filter((entry): entry is { turn: Record<string, unknown>; index: number } => Boolean(entry.turn))
    .sort((left, right) => {
      const leftTs = resolveEntryTimestamp(left.turn) ?? left.index;
      const rightTs = resolveEntryTimestamp(right.turn) ?? right.index;
      return leftTs - rightTs;
    })
    .map((entry) => entry.turn);
};

const transformThreadPayload = (payload: Record<string, unknown>): MemoryConversationEntry[] => {
  const turns = extractTurns(payload);
  const conversation: MemoryConversationEntry[] = [];

  for (const turn of turns) {
    const turnTs = resolveEntryTimestamp(turn);

    for (const text of extractInputTexts(turn)) {
      conversation.push({
        kind: "message",
        role: "user",
        content: text,
        toolName: null,
        toolArgs: null,
        toolResult: null,
        toolError: null,
        media: null,
        ts: turnTs,
      });
    }

    const items = asArray(turn.items) ?? [];
    const assistantTextParts: string[] = [];
    const assistantReasoningParts: string[] = [];

    for (const item of items) {
      const itemObject = asObject(item);
      if (!itemObject) {
        continue;
      }

      const toolEntry = resolveToolEntry(itemObject);
      if (toolEntry) {
        conversation.push(toolEntry);
        continue;
      }

      const textPart = resolveTextPart(itemObject);
      if (textPart) {
        assistantTextParts.push(textPart);
      }
      const reasoningPart = resolveReasoningPart(itemObject);
      if (reasoningPart) {
        assistantReasoningParts.push(reasoningPart);
      }
    }

    const assistantContent = combineAssistantContent(assistantTextParts, assistantReasoningParts);
    if (assistantContent) {
      conversation.push({
        kind: "message",
        role: "assistant",
        content: assistantContent,
        toolName: null,
        toolArgs: null,
        toolResult: null,
        toolError: null,
        media: null,
        ts: turnTs,
      });
    }
  }

  return conversation;
};

export class CodexThreadRunProjectionProvider implements RunProjectionProvider {
  readonly providerId = "codex_thread_projection";
  readonly runtimeKind = "codex_app_server" as const;
  private readonly historyReader: CodexThreadHistoryReader;

  constructor(
    historyReader: CodexThreadHistoryReader = getCodexThreadHistoryReader(),
  ) {
    this.historyReader = historyReader;
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection | null> {
    if (input.runtimeKind !== "codex_app_server") {
      return null;
    }
    const threadId = asString(input.runtimeReference?.threadId);
    if (!threadId) {
      return null;
    }

    const manifestWorkspacePath = asString(input.manifest?.workspaceRootPath);
    const cwd =
      manifestWorkspacePath && fs.existsSync(manifestWorkspacePath)
        ? manifestWorkspacePath
        : process.cwd();

    const payload = await this.historyReader.readThread(threadId, cwd);
    if (!payload) {
      return null;
    }

    const conversation = transformThreadPayload(payload);
    if (conversation.length === 0) {
      return null;
    }
    return buildRunProjection(input.runId, conversation);
  }
}

let cachedCodexThreadRunProjectionProvider: CodexThreadRunProjectionProvider | null = null;

export const getCodexThreadRunProjectionProvider = (): CodexThreadRunProjectionProvider => {
  if (!cachedCodexThreadRunProjectionProvider) {
    cachedCodexThreadRunProjectionProvider = new CodexThreadRunProjectionProvider();
  }
  return cachedCodexThreadRunProjectionProvider;
};
