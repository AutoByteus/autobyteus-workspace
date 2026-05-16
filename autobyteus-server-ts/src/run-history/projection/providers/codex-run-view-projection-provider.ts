import fs from "node:fs";
import {
  CodexThreadHistoryReader,
  getCodexThreadHistoryReader,
} from "../../../agent-execution/backends/codex/history/codex-thread-history-reader.js";
import {
  normalizeCodexThreadHistoryItem,
  type CodexThreadHistoryToolStatus,
} from "../../../agent-execution/backends/codex/history/codex-thread-history-item-normalizer.js";
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

const resolveToolStatus = (
  status: CodexThreadHistoryToolStatus,
): HistoricalReplayToolEvent["status"] => {
  return status;
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
  const normalized = normalizeCodexThreadHistoryItem({
    item,
    turnIndex,
    itemIndex,
  });
  if (!normalized) {
    return null;
  }

  return {
    kind: "tool",
    invocationId: normalized.invocationId,
    toolName: normalized.toolName,
    toolArgs: normalized.toolArgs,
    toolResult: normalized.toolResult,
    toolError: normalized.toolError,
    content: null,
    media: null,
    ts: resolveEntryTimestamp(item) ?? turnTs,
    activityType: inferActivityType(normalized.toolName, normalized.toolArgs),
    status: resolveToolStatus(normalized.status),
    contextText: resolveContextText(normalized.toolName, normalized.toolArgs),
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
