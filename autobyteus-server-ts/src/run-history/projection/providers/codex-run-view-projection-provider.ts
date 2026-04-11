import fs from "node:fs";
import {
  CodexThreadHistoryReader,
  getCodexThreadHistoryReader,
} from "../../../agent-execution/backends/codex/history/codex-thread-history-reader.js";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "../historical-replay-event-types.js";
import type {
  RunProjectionProvider,
  RunProjectionProviderInput,
  RunProjection,
} from "../run-projection-types.js";
import { buildRunProjectionBundleFromEvents } from "../run-projection-utils.js";

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
  normalizeTimestampSeconds(entry.createdAt ?? entry.updatedAt ?? null);

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

const createMessageEvent = (
  role: "user" | "assistant",
  content: string,
  ts: number | null,
): HistoricalReplayEvent => ({
  kind: "message",
  role,
  content,
  media: null,
  ts,
});

const createReasoningEvent = (
  content: string,
  ts: number | null,
): HistoricalReplayEvent => ({
  kind: "reasoning",
  content,
  media: null,
  ts,
});

const resolveUserMessageContent = (item: Record<string, unknown>): string | null => {
  const kind = normalizeItemKind(item);
  if (!kind.includes("usermessage")) {
    return null;
  }
  const fragments = collectTextFragments(item.content)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);
  if (fragments.length === 0) {
    return null;
  }
  return fragments.join("\n\n");
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

const resolveWebSearchResult = (
  item: Record<string, unknown>,
  toolArgs: Record<string, unknown> | null,
): Record<string, unknown> | null => {
  const status = asString(item.status) ?? "completed";
  if (!toolArgs && !status) {
    return null;
  }

  const next: Record<string, unknown> = { status };
  if (typeof toolArgs?.query === "string") {
    next.query = toolArgs.query;
  }
  if (Array.isArray(toolArgs?.queries)) {
    next.queries = toolArgs.queries;
  }
  return next;
};

const resolveInvocationId = (
  item: Record<string, unknown>,
  turnIndex: number,
  itemIndex: number,
): string =>
  asString(item.invocationId) ??
  asString(item.callId) ??
  asString(item.toolCallId) ??
  asString(item.id) ??
  `codex-${turnIndex}-${itemIndex}`;

const resolveToolStatus = (
  item: Record<string, unknown>,
  toolResult: unknown,
): HistoricalReplayToolEvent["status"] => {
  if (asString(item.error)) {
    return "error";
  }
  const normalizedStatus = (asString(item.status) ?? "").toLowerCase();
  if (normalizedStatus === "error" || normalizedStatus === "failed") {
    return "error";
  }
  if (
    normalizedStatus === "success" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "done" ||
    normalizedStatus === "ok"
  ) {
    return "success";
  }
  return toolResult == null ? "parsed" : "success";
};

const inferActivityType = (
  toolName: string,
  toolArgs: Record<string, unknown> | null,
): HistoricalReplayToolEvent["activityType"] => {
  if (toolName === "write_file") {
    return "write_file";
  }
  if (
    toolName === "edit_file" ||
    typeof toolArgs?.patch === "string" ||
    typeof toolArgs?.diff === "string"
  ) {
    return "edit_file";
  }
  if (toolName === "run_bash" || typeof toolArgs?.command === "string") {
    return "terminal_command";
  }
  return "tool_call";
};

const resolveContextText = (
  toolName: string,
  toolArgs: Record<string, unknown> | null,
): string => {
  const pathCandidate = typeof toolArgs?.path === "string" ? toolArgs.path.trim() : "";
  if (pathCandidate) {
    return pathCandidate;
  }
  const commandCandidate = typeof toolArgs?.command === "string" ? toolArgs.command.trim() : "";
  if (commandCandidate) {
    return commandCandidate;
  }
  return toolName;
};

const resolveToolEvent = (
  item: Record<string, unknown>,
  turnTs: number | null,
  turnIndex: number,
  itemIndex: number,
): HistoricalReplayToolEvent | null => {
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
    toolResult = resolveWebSearchResult(item, toolArgs);
  } else {
    return null;
  }

  const normalizedToolName = toolName ?? "tool";
  return {
    kind: "tool",
    invocationId: resolveInvocationId(item, turnIndex, itemIndex),
    toolName: normalizedToolName,
    toolArgs,
    toolResult,
    toolError: asString(item.error),
    content: null,
    media: null,
    ts: resolveEntryTimestamp(item) ?? turnTs,
    activityType: inferActivityType(normalizedToolName, toolArgs),
    status: resolveToolStatus(item, toolResult),
    contextText: resolveContextText(normalizedToolName, toolArgs),
    logs: [],
    detailLevel: "source_limited",
  };
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

const extractTurns = (
  payload: Record<string, unknown>,
): Array<{ turn: Record<string, unknown>; index: number }> => {
  const thread = asObject(payload.thread);
  const turns = asArray(thread?.turns) ?? [];

  return turns
    .map((turn, index) => ({ turn: asObject(turn), index }))
    .filter((entry): entry is { turn: Record<string, unknown>; index: number } => Boolean(entry.turn))
    .sort((left, right) => {
      const leftTs = resolveEntryTimestamp(left.turn) ?? left.index;
      const rightTs = resolveEntryTimestamp(right.turn) ?? right.index;
      return leftTs - rightTs;
    });
};

const transformThreadPayload = (payload: Record<string, unknown>): HistoricalReplayEvent[] => {
  const turns = extractTurns(payload);
  const events: HistoricalReplayEvent[] = [];

  turns.forEach(({ turn, index: turnIndex }) => {
    const turnTs = resolveEntryTimestamp(turn);

    const items = asArray(turn.items) ?? [];

    items.forEach((item, itemIndex) => {
      const itemObject = asObject(item);
      if (!itemObject) {
        return;
      }

      const itemTs = resolveEntryTimestamp(itemObject) ?? turnTs;

      const userContent = resolveUserMessageContent(itemObject);
      if (userContent) {
        events.push(createMessageEvent("user", userContent, itemTs));
        return;
      }

      const toolEvent = resolveToolEvent(itemObject, itemTs, turnIndex, itemIndex);
      if (toolEvent) {
        events.push(toolEvent);
        return;
      }

      const textPart = resolveTextPart(itemObject);
      if (textPart) {
        events.push(createMessageEvent("assistant", textPart, itemTs));
      }
      const reasoningPart = resolveReasoningPart(itemObject);
      if (reasoningPart) {
        events.push(createReasoningEvent(reasoningPart, itemTs));
      }
    });
  });

  return events;
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

    const events = transformThreadPayload(payload);
    if (events.length === 0) {
      return null;
    }
    return buildRunProjectionBundleFromEvents(input.source.runId, events);
  }
}

let cachedCodexRunViewProjectionProvider: CodexRunViewProjectionProvider | null = null;

export const getCodexRunViewProjectionProvider = (): CodexRunViewProjectionProvider => {
  if (!cachedCodexRunViewProjectionProvider) {
    cachedCodexRunViewProjectionProvider = new CodexRunViewProjectionProvider();
  }
  return cachedCodexRunViewProjectionProvider;
};
