import fs from "node:fs";
import type { MemoryConversationEntry } from "../../../agent-memory/domain/models.js";
import {
  CodexThreadHistoryReader,
  getCodexThreadHistoryReader,
} from "../../../agent-execution/backends/codex/history/codex-thread-history-reader.js";
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

const asArray = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asRawNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

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
    entry.createdAt ?? entry.updatedAt ?? null,
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

  const fieldsInPriorityOrder = [objectValue.text, objectValue.content, objectValue.summary];
  return fieldsInPriorityOrder.flatMap((entry) => collectTextFragments(entry, depth + 1));
};

const normalizeItemKind = (item: Record<string, unknown>): string =>
  (asString(item.type) ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const extractInputTexts = (turn: Record<string, unknown>): string[] => {
  const messages: string[] = [];
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
    for (const text of fromContent) {
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

const asArrayOfObjects = (value: unknown): Array<Record<string, unknown>> =>
  (asArray(value) ?? [])
    .map((entry) => asObject(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

const resolveFileChangeArguments = (
  item: Record<string, unknown>,
): Record<string, unknown> | null => {
  const changes = asArrayOfObjects(item.changes).map((change) => {
    const kind = asObject(change.kind);
    const next: Record<string, unknown> = {};
    const path = asString(change.path);
    const patch = asRawNonEmptyString(change.diff);
    const kindType = asString(kind?.type);
    if (path) {
      next.path = path;
    }
    if (patch) {
      next.patch = patch;
    }
    if (kindType) {
      next.kind = kindType;
    }
    return next;
  });

  if (changes.length === 0) {
    return null;
  }
  if (changes.length === 1) {
    return changes[0];
  }
  return { changes };
};

const resolveCommandExecutionArguments = (
  item: Record<string, unknown>,
): Record<string, unknown> | null => {
  const command = asRawNonEmptyString(item.command);
  if (!command) {
    return null;
  }
  return { command };
};

const resolveWebSearchArguments = (
  item: Record<string, unknown>,
): Record<string, unknown> | null => {
  const action = asObject(item.action);
  const query = asRawNonEmptyString(item.query) ?? asRawNonEmptyString(action?.query);
  const queriesCandidate = asArray(action?.queries);
  const queries = (queriesCandidate ?? [])
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const next: Record<string, unknown> = {};
  const actionType = asString(action?.type);
  if (query) {
    next.query = query;
  }
  if (actionType) {
    next.action_type = actionType;
  }
  if (queries.length > 0) {
    next.queries = queries;
  }
  return Object.keys(next).length > 0 ? next : null;
};

const resolveToolEntry = (item: Record<string, unknown>): MemoryConversationEntry | null => {
  const type = normalizeItemKind(item);
  let toolName: string | null = null;
  let toolArgs: Record<string, unknown> | null = null;
  let toolResult: unknown = null;

  if (type === "filechange") {
    toolName = "edit_file";
    toolArgs = resolveFileChangeArguments(item);
    toolResult = {
      status: asString(item.status) ?? null,
      changes: asArray(item.changes) ?? null,
    };
  } else if (type === "commandexecution") {
    toolName = "run_bash";
    toolArgs = resolveCommandExecutionArguments(item);
    toolResult = {
      status: asString(item.status) ?? null,
      output: item.aggregatedOutput ?? null,
      exit_code: item.exitCode ?? null,
    };
  } else if (type === "websearch") {
    toolName = "search_web";
    toolArgs = resolveWebSearchArguments(item);
    toolResult = null;
  } else {
    return null;
  }

  const entry: MemoryConversationEntry = {
    kind: "tool_call",
    role: null,
    content: null,
    toolName,
    toolArgs,
    toolResult,
    toolError: asString(item.error),
    media: null,
    ts: resolveEntryTimestamp(item),
  };

  return entry;
};

const resolveTextPart = (item: Record<string, unknown>): string | null => {
  const kind = normalizeItemKind(item);
  if (kind !== "agentmessage") {
    return null;
  }
  return asString(item.text);
};

const resolveReasoningPart = (item: Record<string, unknown>): string | null => {
  const kind = normalizeItemKind(item);
  if (kind !== "reasoning") {
    return null;
  }
  const fragments = [
    ...collectTextFragments(item.summary),
    ...collectTextFragments(item.content),
  ].filter((entry): entry is string => Boolean(entry));
  if (fragments.length === 0) {
    return null;
  }
  return fragments.join("\n");
};

const extractTurns = (payload: Record<string, unknown>): Array<Record<string, unknown>> => {
  const thread = asObject(payload.thread);
  const turns = asArray(thread?.turns) ?? [];

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

export class CodexRunViewProjectionProvider implements RunProjectionProvider {
  readonly runtimeKind = RuntimeKind.CODEX_APP_SERVER;
  private readonly historyReader: CodexThreadHistoryReader;

  constructor(
    historyReader: CodexThreadHistoryReader = getCodexThreadHistoryReader(),
  ) {
    this.historyReader = historyReader;
  }

  async buildProjection(input: RunProjectionProviderInput): Promise<RunProjection | null> {
    if (input.source.runtimeKind !== RuntimeKind.CODEX_APP_SERVER) {
      return null;
    }
    const threadId = asString(input.source.platformRunId);
    if (!threadId) {
      return null;
    }

    const workspaceRootPath = asString(input.source.workspaceRootPath);
    const cwd =
      workspaceRootPath && fs.existsSync(workspaceRootPath)
        ? workspaceRootPath
        : process.cwd();

    const payload = await this.historyReader.readThread(threadId, cwd);
    if (!payload) {
      return null;
    }

    const conversation = transformThreadPayload(payload);
    if (conversation.length === 0) {
      return null;
    }
    return buildRunProjection(input.source.runId, conversation);
  }
}

let cachedCodexRunViewProjectionProvider: CodexRunViewProjectionProvider | null = null;

export const getCodexRunViewProjectionProvider = (): CodexRunViewProjectionProvider => {
  if (!cachedCodexRunViewProjectionProvider) {
    cachedCodexRunViewProjectionProvider = new CodexRunViewProjectionProvider();
  }
  return cachedCodexRunViewProjectionProvider;
};
