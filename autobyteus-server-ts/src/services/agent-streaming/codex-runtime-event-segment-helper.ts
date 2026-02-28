import {
  debugCodexRuntimeAdapter,
  formatRawCodexRuntimeEventForDebug,
  shouldLogRawCodexRuntimeEvent,
} from "./codex-runtime-event-debug.js";
import { asObject, asString, CodexRuntimeEventToolHelper } from "./codex-runtime-event-tool-helper.js";

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

export class CodexRuntimeEventSegmentHelper extends CodexRuntimeEventToolHelper {
  private readonly reasoningSegmentIdByTurnId = new Map<string, string>();
  private readonly maxReasoningTurnCacheSize = 128;
  private rawEventSequence = 0;

  protected resolveSegmentType(payload: Record<string, unknown>): string {
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
      this.resolveFileChangePatch(payload);
    if (patchCandidate) {
      return "edit_file";
    }

    const resolvedToolName = this.resolveToolName(payload, "run_bash");
    if (resolvedToolName && resolvedToolName !== "run_bash") {
      return asSegmentType(resolvedToolName);
    }

    return "text";
  }

  protected resolveSegmentStartId(payload: Record<string, unknown>, segmentType: string): string {
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

  protected resolveSegmentMetadata(payload: Record<string, unknown>): Record<string, unknown> | undefined {
    const metadata = asObject(payload.metadata);
    const item = asObject(payload.item);
    const payloadTool = asObject(payload.tool);
    const itemTool = asObject(item.tool);
    const fileChangePath = this.resolveFileChangePath(payload);
    const fileChangePatch = this.resolveFileChangePatch(payload);
    const commandValue = this.resolveCommandValue(payload);
    const toolName =
      asString(payload.tool) ??
      asString(payloadTool.name) ??
      asString(payloadTool.tool_name) ??
      asString(payloadTool.toolName) ??
      asString(payload.tool_name) ??
      asString(payload.toolName) ??
      asString(item.tool_name) ??
      asString(item.toolName) ??
      asString(item.tool) ??
      asString(itemTool.name) ??
      asString(itemTool.tool_name) ??
      asString(itemTool.toolName) ??
      asString(item.name);
    const pathValue =
      asString(payload.path) ??
      asString(item.path) ??
      fileChangePath;
    const patchValue =
      asString(payload.patch) ??
      asString(payload.diff) ??
      asString(item.patch) ??
      asString(item.diff) ??
      fileChangePatch;

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
    if (this.resolveSegmentType(payload) === "tool_call") {
      const toolArguments = this.resolveToolCallMetadataArguments(payload);
      if (Object.keys(toolArguments).length > 0) {
        next.arguments = toolArguments;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  protected resolveDelta(payload: Record<string, unknown>): string {
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

  protected resolveReasoningSnapshot(payload: Record<string, unknown>): string {
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

  protected resolveSegmentId(payload: Record<string, unknown>, fallback = "runtime-segment"): string {
    const item = asObject(payload.item);
    const candidate =
      payload.segment_id ??
      payload.item_id ??
      payload.itemId ??
      item.id ??
      payload.id;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback;
  }

  protected resolveReasoningSegmentId(payload: Record<string, unknown>): string {
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

  protected resolveTurnId(payload: Record<string, unknown>): string | null {
    const turn = asObject(payload.turn);
    return asString(payload.turnId) ?? asString(payload.turn_id) ?? asString(turn.id);
  }

  protected clearReasoningSegmentForTurn(payload: Record<string, unknown>): void {
    const turnId = this.resolveTurnId(payload);
    if (turnId) {
      this.reasoningSegmentIdByTurnId.delete(turnId);
      debugCodexRuntimeAdapter("Cleared reasoning turn cache", {
        turnId,
        cacheSize: this.reasoningSegmentIdByTurnId.size,
      });
    }
  }

  protected logRawRuntimeEvent(
    rawEvent: unknown,
    rawMethod: string | null,
    normalizedMethod: string,
    payload: Record<string, unknown>,
  ): void {
    if (!shouldLogRawCodexRuntimeEvent()) {
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
      rawEventJson: formatRawCodexRuntimeEventForDebug(rawEvent),
    });
  }

  protected resolveItemType(payload: Record<string, unknown>): string | null {
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

  protected isUserMessageItem(itemType: string | null): boolean {
    return itemType === "usermessage" || itemType === "inputmessage";
  }

  protected isReasoningItem(itemType: string | null): boolean {
    return itemType === "reasoning";
  }

  protected isWebSearchItem(itemType: string | null): boolean {
    return itemType === "websearch";
  }

  protected resolveWebSearchMetadata(payload: Record<string, unknown>): Record<string, unknown> {
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

  protected resolveWebSearchArguments(payload: Record<string, unknown>): Record<string, unknown> {
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

  private resolveStableReasoningItemId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const candidate =
      payload.segment_id ??
      payload.item_id ??
      payload.itemId ??
      item.id;
    return asString(candidate);
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

  private resolveFileChangePath(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const singleChangeCandidates = [
      asObject(payload.change),
      asObject(payload.file_change),
      asObject(item.change),
      asObject(item.file_change),
    ];
    for (const candidate of singleChangeCandidates) {
      const path = asString(candidate.path) ?? asString(asObject(candidate.file).path);
      if (path) {
        return path;
      }
    }

    const arrayCandidates = [payload.changes, item.changes];
    for (const candidate of arrayCandidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      for (const row of candidate) {
        const record = asObject(row);
        const path = asString(record.path) ?? asString(asObject(record.file).path);
        if (path) {
          return path;
        }
      }
    }
    return null;
  }

  private resolveFileChangePatch(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const singleChangeCandidates = [
      asObject(payload.change),
      asObject(payload.file_change),
      asObject(item.change),
      asObject(item.file_change),
    ];
    for (const candidate of singleChangeCandidates) {
      const file = asObject(candidate.file);
      const patch =
        asString(candidate.patch) ??
        asString(candidate.diff) ??
        asString(candidate.delta) ??
        asString(candidate.content) ??
        asString(file.patch) ??
        asString(file.diff);
      if (patch) {
        return patch;
      }
    }

    const arrayCandidates = [payload.changes, item.changes];
    for (const candidate of arrayCandidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      for (const row of candidate) {
        const record = asObject(row);
        const file = asObject(record.file);
        const patch =
          asString(record.patch) ??
          asString(record.diff) ??
          asString(record.delta) ??
          asString(record.content) ??
          asString(file.patch) ??
          asString(file.diff);
        if (patch) {
          return patch;
        }
      }
    }
    return null;
  }
}
