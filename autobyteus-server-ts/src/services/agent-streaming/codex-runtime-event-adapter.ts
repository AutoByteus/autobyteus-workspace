import { normalizeCodexRuntimeMethod } from "../../runtime-execution/codex-app-server/codex-runtime-method-normalizer.js";
import { serializePayload } from "./payload-serialization.js";
import { ServerMessage, ServerMessageType } from "./models.js";

type CodexRuntimeNotification = {
  method?: unknown;
  params?: unknown;
  payload?: unknown;
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const normalizeSegmentTypeToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const asSegmentType = (value: string | null): string => {
  if (!value) {
    return "text";
  }
  const normalized = value.toLowerCase();
  const token = normalizeSegmentTypeToken(value);
  if (
    normalized === "text" ||
    normalized === "message" ||
    normalized === "assistant_message" ||
    token === "text" ||
    token === "message" ||
    token === "assistantmessage"
  ) {
    return "text";
  }
  if (
    normalized === "reasoning" ||
    normalized === "think" ||
    token === "reasoning" ||
    token === "think" ||
    token.includes("reasoning")
  ) {
    return "reasoning";
  }
  if (
    normalized === "tool_call" ||
    normalized === "tool" ||
    normalized === "function_call" ||
    normalized === "web_search" ||
    normalized === "websearch" ||
    token === "toolcall" ||
    token === "tool" ||
    token === "functioncall" ||
    token === "websearch" ||
    token.includes("functioncall") ||
    token.includes("toolcall") ||
    token.includes("websearch")
  ) {
    return "tool_call";
  }
  if (normalized === "write_file" || token === "writefile" || token.includes("writefile")) {
    return "write_file";
  }
  if (
    normalized === "run_bash" ||
    normalized === "command_execution" ||
    normalized === "command" ||
    token === "runbash" ||
    token === "commandexecution" ||
    token === "commandexecutioncall" ||
    token === "terminalcommand" ||
    token === "shellcommand" ||
    token.includes("commandexecution")
  ) {
    return "run_bash";
  }
  if (
    normalized === "edit_file" ||
    normalized === "file_change" ||
    normalized === "filechange" ||
    token === "editfile" ||
    token === "filechange" ||
    token === "filechangecall" ||
    token.includes("filechange")
  ) {
    return "edit_file";
  }
  if (normalized === "media" || normalized === "image" || normalized === "audio" || normalized === "video") {
    return "media";
  }
  return "text";
};

const isCodexRuntimeAdapterDebugEnabled = process.env.CODEX_RUNTIME_ADAPTER_DEBUG === "1";
const isCodexRuntimeRawEventDebugEnabled = process.env.CODEX_RUNTIME_RAW_EVENT_DEBUG === "1";
const codexRuntimeRawEventMaxChars = Number.isFinite(Number(process.env.CODEX_RUNTIME_RAW_EVENT_MAX_CHARS))
  ? Math.max(512, Number(process.env.CODEX_RUNTIME_RAW_EVENT_MAX_CHARS))
  : 20_000;

const debugCodexRuntimeAdapter = (message: string, details?: Record<string, unknown>): void => {
  if (!isCodexRuntimeAdapterDebugEnabled) {
    return;
  }
  if (details) {
    console.log(`[CodexRuntimeEventAdapter] ${message}`, details);
    return;
  }
  console.log(`[CodexRuntimeEventAdapter] ${message}`);
};

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-runtime-event]";
  }
};

const truncateForDebug = (value: string): string => {
  if (value.length <= codexRuntimeRawEventMaxChars) {
    return value;
  }
  return `${value.slice(0, codexRuntimeRawEventMaxChars)}...<truncated>`;
};

export class CodexRuntimeEventAdapter {
  private readonly reasoningSegmentIdByTurnId = new Map<string, string>();
  private readonly maxReasoningTurnCacheSize = 128;
  private rawEventSequence = 0;

  map(rawEvent: unknown): ServerMessage {
    const envelope = asObject(rawEvent) as CodexRuntimeNotification;
    const rawMethod = typeof envelope.method === "string" ? envelope.method : null;
    const method = rawMethod ? this.normalizeMethodAlias(rawMethod) : "";
    const payload = asObject(envelope.params ?? envelope.payload ?? {});
    this.logRawRuntimeEvent(rawEvent, rawMethod, method, payload);

    if (!method) {
      return new ServerMessage(ServerMessageType.ERROR, {
        code: "RUNTIME_EVENT_UNMAPPED",
        message: "Runtime event method is missing.",
      });
    }

    if (method === "turn/started") {
      return new ServerMessage(ServerMessageType.AGENT_STATUS, {
        new_status: "RUNNING",
        old_status: null,
        runtime_event_method: method,
      });
    }

    if (method === "turn/completed") {
      this.clearReasoningSegmentForTurn(payload);
      return new ServerMessage(ServerMessageType.AGENT_STATUS, {
        new_status: "IDLE",
        old_status: "RUNNING",
        runtime_event_method: method,
      });
    }

    if (method === "turn/diffUpdated") {
      return new ServerMessage(ServerMessageType.ARTIFACT_UPDATED, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "turn/taskProgressUpdated") {
      return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "codex/event/web_search_begin" || method === "codex/event/web_search_end") {
      return this.toNoopMessage(method, payload);
    }

    if (method === "item/added") {
      const itemType = this.resolveItemType(payload);
      if (this.isUserMessageItem(itemType) || this.isReasoningItem(itemType)) {
        return this.toNoopMessage(method, payload);
      }
      if (this.isWebSearchItem(itemType)) {
        return new ServerMessage(ServerMessageType.SEGMENT_START, {
          ...serializePayload(payload),
          id: this.resolveSegmentStartId(payload, "tool_call"),
          segment_type: "tool_call",
          metadata: this.resolveWebSearchMetadata(payload),
          runtime_event_method: method,
        });
      }
      const segmentType = this.resolveSegmentType(payload);
      return new ServerMessage(ServerMessageType.SEGMENT_START, {
        ...serializePayload(payload),
        id: this.resolveSegmentStartId(payload, segmentType),
        segment_type: segmentType,
        metadata: this.resolveSegmentMetadata(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/delta") {
      const resolvedSegmentType = this.resolveSegmentType(payload);
      if (resolvedSegmentType === "reasoning") {
        return this.mapSegmentDelta(method, payload, "reasoning");
      }
      if (resolvedSegmentType === "text") {
        return this.mapSegmentDelta(method, payload, "text");
      }
      return this.mapSegmentDelta(method, payload);
    }

    if (method === "item/completed") {
      const itemType = this.resolveItemType(payload);
      if (this.isUserMessageItem(itemType)) {
        return this.toNoopMessage(method, payload);
      }
      if (this.isReasoningItem(itemType)) {
        const reasoningDelta = this.resolveReasoningSnapshot(payload);
        if (!reasoningDelta) {
          return this.toNoopMessage(method, payload);
        }
        return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
          ...serializePayload(payload),
          id: this.resolveReasoningSegmentId(payload),
          delta: reasoningDelta,
          segment_type: "reasoning",
          runtime_event_method: method,
        });
      }
      if (this.isWebSearchItem(itemType)) {
        return new ServerMessage(ServerMessageType.SEGMENT_END, {
          ...serializePayload(payload),
          id: this.resolveSegmentId(payload),
          metadata: this.resolveWebSearchMetadata(payload),
          runtime_event_method: method,
        });
      }
      return new ServerMessage(ServerMessageType.SEGMENT_END, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload),
        metadata: this.resolveSegmentMetadata(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/outputText/delta") {
      return this.mapSegmentDelta(method, payload, "text");
    }

    if (method === "item/outputText/completed") {
      return new ServerMessage(ServerMessageType.SEGMENT_END, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/reasoning/delta" || method === "item/reasoning/summaryPartAdded") {
      return this.mapSegmentDelta(method, payload, "reasoning");
    }

    if (method === "item/reasoning/completed") {
      const reasoningDelta = this.resolveReasoningSnapshot(payload);
      if (!reasoningDelta) {
        return this.toNoopMessage(method, payload);
      }
      return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
        ...serializePayload(payload),
        id: this.resolveReasoningSegmentId(payload),
        delta: reasoningDelta,
        segment_type: "reasoning",
        runtime_event_method: method,
      });
    }

    if (method === "item/plan/delta") {
      return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/started") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = this.resolveToolName(payload, "run_bash");
      return new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        arguments: this.resolveToolArguments(payload, "run_bash"),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/delta") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = this.resolveToolName(payload, "run_bash");
      return new ServerMessage(ServerMessageType.TOOL_LOG, {
        ...serializePayload(payload),
        ...(invocationId ? { tool_invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        log_entry: this.resolveLogEntry(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/completed") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = this.resolveToolName(payload, "run_bash");
      return new ServerMessage(
        this.isExecutionFailure(payload)
          ? ServerMessageType.TOOL_EXECUTION_FAILED
          : ServerMessageType.TOOL_EXECUTION_SUCCEEDED,
        {
          ...serializePayload(payload),
          ...(invocationId ? { invocation_id: invocationId } : {}),
          ...(toolName ? { tool_name: toolName } : {}),
          ...(this.isExecutionFailure(payload)
            ? { error: this.resolveToolError(payload) }
            : { result: this.resolveToolResult(payload) }),
          runtime_event_method: method,
        },
      );
    }

    if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval") {
      const invocationId = this.resolveInvocationId(payload);
      const fallbackToolName = method === "item/fileChange/requestApproval" ? "edit_file" : "run_bash";
      const toolName = this.resolveToolName(payload, fallbackToolName);
      return new ServerMessage(ServerMessageType.TOOL_APPROVAL_REQUESTED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        arguments: this.resolveToolArguments(payload, fallbackToolName),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/approved") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = this.resolveToolName(payload, "run_bash");
      const reason = this.resolveToolDecisionReason(payload);
      return new ServerMessage(ServerMessageType.TOOL_APPROVED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        ...(reason ? { reason } : {}),
        runtime_event_method: method,
      });
    }

    if (method === "item/commandExecution/denied") {
      const invocationId = this.resolveInvocationId(payload);
      const toolName = this.resolveToolName(payload, "run_bash");
      const reason = this.resolveToolDecisionReason(payload) ?? "Tool execution denied.";
      return new ServerMessage(ServerMessageType.TOOL_DENIED, {
        ...serializePayload(payload),
        ...(invocationId ? { invocation_id: invocationId } : {}),
        ...(toolName ? { tool_name: toolName } : {}),
        reason,
        error: this.resolveToolError(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/fileChange/started") {
      return new ServerMessage(ServerMessageType.SEGMENT_START, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload, "file-change"),
        segment_type: "edit_file",
        metadata: this.resolveSegmentMetadata(payload),
        runtime_event_method: method,
      });
    }

    if (method === "item/fileChange/delta") {
      return new ServerMessage(ServerMessageType.ARTIFACT_UPDATED, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload, "file-change"),
        runtime_event_method: method,
      });
    }

    if (method === "item/fileChange/completed") {
      return new ServerMessage(ServerMessageType.ARTIFACT_PERSISTED, {
        ...serializePayload(payload),
        id: this.resolveSegmentId(payload, "file-change"),
        runtime_event_method: method,
      });
    }

    if (method === "thread/tokenUsage/updated") {
      return new ServerMessage(ServerMessageType.AGENT_STATUS, {
        ...serializePayload(payload),
        runtime_event_method: method,
      });
    }

    if (method === "error") {
      const nestedError = asObject(payload.error);
      const errorCode = nestedError.code ?? payload.code;
      const errorMessage = nestedError.message ?? payload.message;
      return new ServerMessage(ServerMessageType.ERROR, {
        code: typeof errorCode === "string" ? errorCode : "RUNTIME_ERROR",
        message:
          typeof errorMessage === "string"
            ? errorMessage
            : "Runtime emitted an error event.",
        runtime_event_method: method,
      });
    }

    return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
      id:
        (typeof payload.segment_id === "string" && payload.segment_id) ||
        (typeof payload.id === "string" && payload.id) ||
        "runtime-event",
      runtime_event_method: method,
      payload: serializePayload(payload),
    });
  }

  normalizeMethodAlias(method: string): string {
    return normalizeCodexRuntimeMethod(method);
  }

  private mapSegmentDelta(
    method: string,
    payload: Record<string, unknown>,
    segmentType?: "text" | "reasoning",
  ): ServerMessage {
    const delta = this.resolveDelta(payload);
    if (!delta) {
      return this.toNoopMessage(method, payload);
    }
    return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
      ...serializePayload(payload),
      id: segmentType === "reasoning" ? this.resolveReasoningSegmentId(payload) : this.resolveSegmentId(payload),
      delta,
      ...(segmentType ? { segment_type: segmentType } : {}),
      runtime_event_method: method,
    });
  }

  private resolveSegmentType(payload: Record<string, unknown>): string {
    const explicitType = asString(payload.segment_type ?? payload.segmentType);
    if (explicitType) {
      return asSegmentType(explicitType);
    }

    const item = asObject(payload.item);
    const itemType = asString(item.type ?? item.item_type ?? item.itemType ?? item.kind);
    if (itemType) {
      return asSegmentType(itemType);
    }

    const commandCandidate =
      asString(payload.command) ??
      asString(payload.cmd) ??
      asString(item.command) ??
      asString(item.cmd);
    if (commandCandidate) {
      return "run_bash";
    }

    const patchCandidate =
      asString(payload.patch) ??
      asString(payload.diff) ??
      asString(item.patch) ??
      asString(item.diff) ??
      this.resolveFileChangeFields(payload).patch;
    if (patchCandidate) {
      return "edit_file";
    }

    const resolvedToolName = this.resolveToolName(payload, "run_bash");
    if (resolvedToolName && resolvedToolName !== "run_bash") {
      return asSegmentType(resolvedToolName);
    }

    return "text";
  }

  private resolveSegmentStartId(payload: Record<string, unknown>, segmentType: string): string {
    if (
      segmentType === "tool_call" ||
      segmentType === "write_file" ||
      segmentType === "run_bash" ||
      segmentType === "edit_file"
    ) {
      const invocationId = this.resolveInvocationId(payload);
      if (invocationId) {
        return invocationId;
      }
    }
    return this.resolveSegmentId(payload);
  }

  private resolveSegmentMetadata(payload: Record<string, unknown>): Record<string, unknown> | undefined {
    const metadata = asObject(payload.metadata);
    const item = asObject(payload.item);
    const fileChangeFields = this.resolveFileChangeFields(payload);
    const commandValue = this.resolveCommandValue(payload);
    const toolName =
      asString(payload.tool_name) ??
      asString(payload.toolName) ??
      asString(item.tool_name) ??
      asString(item.toolName) ??
      asString(item.name);
    const pathValue =
      asString(payload.path) ??
      asString(item.path) ??
      fileChangeFields.path;
    const patchValue =
      asString(payload.patch) ??
      asString(payload.diff) ??
      asString(item.patch) ??
      asString(item.diff) ??
      fileChangeFields.patch;

    const next: Record<string, unknown> = this.sanitizeRecord(metadata);
    if (toolName) {
      next.tool_name = toolName;
    }
    if (pathValue) {
      next.path = pathValue;
    }
    if (patchValue) {
      next.patch = patchValue;
    }
    if (commandValue) {
      next.command = commandValue;
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  private resolveDelta(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate =
      payload.delta ??
      payload.chunk ??
      payload.content ??
      payload.summary_part ??
      item.delta ??
      item.content;
    return typeof candidate === "string" ? candidate : "";
  }

  private collectText(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    if (!Array.isArray(value)) {
      return "";
    }

    const chunks: string[] = [];
    for (const entry of value) {
      if (typeof entry === "string") {
        chunks.push(entry);
        continue;
      }
      const row = asObject(entry);
      const text =
        asString(row.text) ??
        asString(row.content) ??
        asString(row.summary) ??
        asString(row.delta) ??
        asString(row.reasoning) ??
        asString(row.value) ??
        null;
      if (text) {
        chunks.push(text);
      }
    }

    return chunks.join("");
  }

  private resolveReasoningSnapshot(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const fromSummary = this.collectText(item.summary);
    if (fromSummary) {
      return fromSummary;
    }
    const fromContent = this.collectText(item.content);
    if (fromContent) {
      return fromContent;
    }
    return (
      asString(payload.summary_part) ??
      asString(payload.summaryPart) ??
      asString(payload.summary) ??
      asString(item.summary_text) ??
      asString(item.summaryText) ??
      asString(item.text) ??
      ""
    );
  }

  private resolveSegmentId(payload: Record<string, unknown>, fallback = "runtime-segment"): string {
    const item = asObject(payload.item);
    // Prefer stable item identity over per-event envelope IDs.
    const candidate =
      payload.segment_id ??
      payload.item_id ??
      payload.itemId ??
      item.id ??
      payload.id;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback;
  }

  private resolveReasoningSegmentId(payload: Record<string, unknown>): string {
    const eventId = asString(payload.id);
    const turnId = this.resolveTurnId(payload);
    const stableItemId = this.resolveStableReasoningItemId(payload);

    if (turnId) {
      const existing = this.reasoningSegmentIdByTurnId.get(turnId);
      if (existing) {
        this.logReasoningSegmentResolution("turn-cache-hit", payload, existing, eventId, turnId);
        return existing;
      }
      const nextSegmentId = stableItemId ?? eventId ?? `reasoning:${turnId}`;
      this.reasoningSegmentIdByTurnId.set(turnId, nextSegmentId);
      while (this.reasoningSegmentIdByTurnId.size > this.maxReasoningTurnCacheSize) {
        const oldest = this.reasoningSegmentIdByTurnId.keys().next().value;
        if (!oldest) {
          break;
        }
        this.reasoningSegmentIdByTurnId.delete(oldest);
      }
      this.logReasoningSegmentResolution("turn-cache-miss", payload, nextSegmentId, eventId, turnId);
      return nextSegmentId;
    }

    if (stableItemId) {
      this.logReasoningSegmentResolution("stable-item-id", payload, stableItemId, eventId, turnId);
      return stableItemId;
    }

    const fallbackId = eventId ?? this.resolveSegmentId(payload, "reasoning-segment");
    this.logReasoningSegmentResolution("fallback", payload, fallbackId, eventId, turnId);
    return fallbackId;
  }

  private resolveStableReasoningItemId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const candidate =
      payload.segment_id ??
      payload.item_id ??
      payload.itemId ??
      item.id;
    return asString(candidate);
  }

  private resolveTurnId(payload: Record<string, unknown>): string | null {
    const turn = asObject(payload.turn);
    return asString(payload.turnId) ?? asString(payload.turn_id) ?? asString(turn.id);
  }

  private clearReasoningSegmentForTurn(payload: Record<string, unknown>): void {
    const turnId = this.resolveTurnId(payload);
    if (turnId) {
      this.reasoningSegmentIdByTurnId.delete(turnId);
      debugCodexRuntimeAdapter("Cleared reasoning turn cache", {
        turnId,
        cacheSize: this.reasoningSegmentIdByTurnId.size,
      });
    }
  }

  private logReasoningSegmentResolution(
    strategy: "stable-item-id" | "turn-cache-hit" | "turn-cache-miss" | "fallback",
    payload: Record<string, unknown>,
    resolvedSegmentId: string,
    eventId: string | null,
    turnId: string | null,
  ): void {
    const item = asObject(payload.item);
    const itemId = asString(item.id) ?? asString(payload.item_id) ?? asString(payload.itemId);
    debugCodexRuntimeAdapter("Resolved reasoning segment id", {
      strategy,
      resolvedSegmentId,
      eventId,
      itemId,
      turnId,
      runtimeMethod:
        asString(payload.runtime_event_method) ??
        asString(payload.method),
      summaryPartLength: asString(payload.summary_part)?.length ?? 0,
      deltaLength: asString(payload.delta)?.length ?? 0,
      cacheSize: this.reasoningSegmentIdByTurnId.size,
    });
  }

  private logRawRuntimeEvent(
    rawEvent: unknown,
    rawMethod: string | null,
    normalizedMethod: string,
    payload: Record<string, unknown>,
  ): void {
    if (!isCodexRuntimeRawEventDebugEnabled) {
      return;
    }
    this.rawEventSequence += 1;
    const item = asObject(payload.item);
    const turn = asObject(payload.turn);
    const summaryPart = asString(payload.summary_part) ?? asString(payload.summaryPart) ?? "";

    debugCodexRuntimeAdapter("Raw runtime event", {
      sequence: this.rawEventSequence,
      rawMethod,
      normalizedMethod: normalizedMethod || null,
      eventId: asString(payload.id),
      itemId: asString(payload.item_id) ?? asString(payload.itemId) ?? asString(item.id),
      itemType: asString(item.type) ?? asString(payload.item_type) ?? asString(payload.itemType),
      turnId: asString(payload.turnId) ?? asString(payload.turn_id) ?? asString(turn.id),
      payloadKeys: Object.keys(payload),
      summaryPartLength: summaryPart.length,
      rawEventJson: truncateForDebug(stringifyForDebug(rawEvent)),
    });
  }

  private resolveItemType(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const type =
      asString(payload.item_type) ??
      asString(payload.itemType) ??
      asString(item.type) ??
      asString(item.item_type) ??
      asString(item.itemType) ??
      asString(item.kind);
    if (!type) {
      return null;
    }
    return type.replace(/[_-]/g, "").toLowerCase();
  }

  private isUserMessageItem(itemType: string | null): boolean {
    return itemType === "usermessage" || itemType === "inputmessage";
  }

  private isReasoningItem(itemType: string | null): boolean {
    return itemType === "reasoning";
  }

  private isWebSearchItem(itemType: string | null): boolean {
    return itemType === "websearch";
  }

  private resolveWebSearchMetadata(payload: Record<string, unknown>): Record<string, unknown> {
    const metadata = this.sanitizeRecord(asObject(payload.metadata));
    const argumentsPayload = this.resolveWebSearchArguments(payload);
    const next: Record<string, unknown> = {
      ...metadata,
      tool_name: "search_web",
    };
    if (Object.keys(argumentsPayload).length > 0) {
      next.arguments = argumentsPayload;
    }
    return next;
  }

  private resolveWebSearchArguments(payload: Record<string, unknown>): Record<string, unknown> {
    const item = asObject(payload.item);
    const action = asObject(item.action ?? payload.action);
    const next: Record<string, unknown> = {};

    const query =
      asString(action.query) ??
      asString(item.query) ??
      asString(payload.query);
    if (query) {
      next.query = query;
    }

    const actionType = asString(action.type);
    if (actionType && actionType !== "other") {
      next.action_type = actionType;
    }

    const queriesCandidate = action.queries ?? item.queries ?? payload.queries;
    if (Array.isArray(queriesCandidate)) {
      const queries = queriesCandidate
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      if (queries.length > 0) {
        next.queries = queries;
      }
    }

    return this.sanitizeRecord(next);
  }

  private toNoopMessage(method: string, payload: Record<string, unknown>): ServerMessage {
    return new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
      id: this.resolveSegmentId(payload),
      delta: "",
      runtime_event_method: method,
    });
  }

  private resolveInvocationId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const invocationBase =
      asString(payload.invocation_id) ??
      asString(payload.invocationId) ??
      asString(payload.tool_invocation_id) ??
      asString(payload.toolInvocationId) ??
      asString(payload.itemId) ??
      asString(payload.item_id) ??
      asString(payload.id) ??
      asString(item.id);
    if (!invocationBase) {
      return null;
    }
    const approvalId = asString(payload.approvalId) ?? asString(payload.approval_id);
    if (approvalId && !invocationBase.includes(":")) {
      return `${invocationBase}:${approvalId}`;
    }
    return invocationBase;
  }

  private resolveToolName(
    payload: Record<string, unknown>,
    fallback: "run_bash" | "edit_file" = "run_bash",
  ): string | null {
    const item = asObject(payload.item);
    const command = asObject(payload.command);
    return (
      asString(payload.tool_name) ??
      asString(payload.toolName) ??
      asString(payload.command_name) ??
      asString(command.tool_name) ??
      asString(command.toolName) ??
      asString(command.name) ??
      asString(item.tool_name) ??
      asString(item.toolName) ??
      asString(item.name) ??
      fallback
    );
  }

  private resolveToolArguments(
    payload: Record<string, unknown>,
    fallbackToolName: "run_bash" | "edit_file",
  ): Record<string, unknown> {
    const item = asObject(payload.item);
    const explicitArguments = this.sanitizeRecord(asObject(payload.arguments));
    const itemArguments = this.sanitizeRecord(asObject(item.arguments));
    const mergedArguments: Record<string, unknown> = { ...itemArguments, ...explicitArguments };
    const command = this.resolveCommandValue(payload);
    const fileChangeFields = this.resolveFileChangeFields(payload);
    const pathValue =
      asString(mergedArguments.path) ??
      asString(payload.path) ??
      asString(item.path) ??
      fileChangeFields.path;
    const patchValue =
      asString(mergedArguments.patch) ??
      asString(mergedArguments.diff) ??
      asString(payload.patch) ??
      asString(payload.diff) ??
      asString(item.patch) ??
      asString(item.diff) ??
      fileChangeFields.patch;

    if (fallbackToolName === "run_bash") {
      const commandValue = asString(mergedArguments.command) ?? asString(mergedArguments.cmd) ?? command;
      if (commandValue) {
        mergedArguments.command = commandValue;
      }
      return this.sanitizeRecord(mergedArguments);
    }

    if (fallbackToolName === "edit_file") {
      const next: Record<string, unknown> = { ...mergedArguments };
      if (pathValue) {
        next.path = pathValue;
      }
      if (patchValue) {
        next.patch = patchValue;
      }
      return this.sanitizeRecord(next);
    }
    return {};
  }

  private resolveCommandValue(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    return (
      asString(payload.command) ??
      asString(payload.cmd) ??
      asString(item.command) ??
      asString(item.cmd) ??
      this.resolveCommandActionValue(payload)
    );
  }

  private resolveCommandActionValue(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const actionCandidates = [payload.commandActions, item.commandActions];
    for (const candidate of actionCandidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      for (const row of candidate) {
        const action = asObject(row);
        const command =
          asString(action.command) ??
          asString(action.cmd) ??
          asString(action.shell_command) ??
          asString(action.shellCommand);
        if (command) {
          return command;
        }
      }
    }
    return null;
  }

  private resolveFileChangeFields(payload: Record<string, unknown>): { path: string | null; patch: string | null } {
    const item = asObject(payload.item);
    const singleChangeCandidates = [
      asObject(payload.change),
      asObject(payload.file_change),
      asObject(item.change),
      asObject(item.file_change),
    ];
    for (const candidate of singleChangeCandidates) {
      const resolved = this.resolveFileChangeEntry(candidate);
      if (resolved.path || resolved.patch) {
        return resolved;
      }
    }

    const arrayCandidates = [payload.changes, item.changes];
    for (const candidate of arrayCandidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      for (const row of candidate) {
        const resolved = this.resolveFileChangeEntry(asObject(row));
        if (resolved.path || resolved.patch) {
          return resolved;
        }
      }
    }

    return { path: null, patch: null };
  }

  private resolveFileChangeEntry(change: Record<string, unknown>): { path: string | null; patch: string | null } {
    const file = asObject(change.file);
    return {
      path: asString(change.path) ?? asString(file.path),
      patch:
        asString(change.patch) ??
        asString(change.diff) ??
        asString(change.delta) ??
        asString(change.content) ??
        asString(file.patch) ??
        asString(file.diff),
    };
  }

  private sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const [key, row] of Object.entries(value)) {
      if (typeof row === "string" && row.trim().length === 0) {
        continue;
      }
      next[key] = row;
    }
    return next;
  }

  private resolveLogEntry(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate =
      payload.log_entry ??
      payload.log ??
      payload.delta ??
      payload.chunk ??
      payload.content ??
      payload.output ??
      payload.message ??
      item.delta ??
      item.content;
    return typeof candidate === "string" ? candidate : "";
  }

  private resolveToolDecisionReason(payload: Record<string, unknown>): string | null {
    const candidate = payload.reason ?? payload.message;
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
  }

  private resolveToolResult(payload: Record<string, unknown>): unknown {
    if (payload.result !== undefined) {
      return payload.result;
    }
    if (payload.output !== undefined) {
      return payload.output;
    }
    return payload;
  }

  private resolveToolError(payload: Record<string, unknown>): string {
    const nestedError = asObject(payload.error);
    const candidate =
      asString(nestedError.message) ??
      asString(payload.error) ??
      asString(payload.message) ??
      "Tool execution failed.";
    return candidate;
  }

  private isExecutionFailure(payload: Record<string, unknown>): boolean {
    const success = payload.success;
    if (typeof success === "boolean") {
      return !success;
    }
    const status = payload.status;
    if (typeof status === "string") {
      const lowered = status.toLowerCase();
      if (lowered.includes("fail") || lowered.includes("error") || lowered.includes("denied")) {
        return true;
      }
    }
    return false;
  }
}
