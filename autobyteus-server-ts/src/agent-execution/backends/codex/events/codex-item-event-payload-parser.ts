import { CodexFileChangePayloadHelper } from "./codex-file-change-payload-helper.js";
import { CodexReasoningPayloadParser } from "./codex-reasoning-payload-parser.js";
import { CodexToolPayloadParser } from "./codex-tool-payload-parser.js";

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
  const token = normalizeSegmentTypeToken(value);
  if (token === "text" || token === "message" || token === "agentmessage") {
    return "text";
  }
  if (token === "reasoning") {
    return "reasoning";
  }
  if (token === "functioncall" || token === "dynamictoolcall" || token === "mcptoolcall") {
    return "tool_call";
  }
  if (token === "runbash" || token === "commandexecution") {
    return "run_bash";
  }
  if (token === "editfile" || token === "filechange") {
    return "edit_file";
  }
  if (token === "media" || token === "image" || token === "audio" || token === "video") {
    return "media";
  }
  return "text";
};

export class CodexItemEventPayloadParser {
  private readonly fileChangePayloadHelper = new CodexFileChangePayloadHelper();
  private readonly reasoningPayloadParser = new CodexReasoningPayloadParser();
  private readonly toolPayloadParser = new CodexToolPayloadParser(
    this.fileChangePayloadHelper,
  );

  public resolveSegmentType(payload: Record<string, unknown>): string {
    const explicitType = asString(payload.segment_type);
    if (explicitType) {
      return asSegmentType(explicitType);
    }

    const item = asObject(payload.item);
    const itemType = asString(item.type);
    if (itemType) {
      return asSegmentType(itemType);
    }

    const commandCandidate = this.toolPayloadParser.resolveCommandValue(payload);
    if (commandCandidate) {
      return "run_bash";
    }

    const patchCandidate = this.fileChangePayloadHelper.resolvePatch(payload);
    if (patchCandidate) {
      return "edit_file";
    }

    return "text";
  }

  public resolveSegmentStartId(payload: Record<string, unknown>, segmentType: string): string {
    const invocationAware =
      segmentType === "tool_call" || segmentType === "run_bash" || segmentType === "edit_file";
    return invocationAware
      ? this.resolveInvocationId(payload) ?? this.resolveSegmentId(payload)
      : this.resolveSegmentId(payload);
  }

  public resolveSegmentMetadata(
    payload: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const segmentType = this.resolveSegmentType(payload);
    const metadata = asObject(payload.metadata);
    const item = asObject(payload.item);
    const fileChangePath = this.fileChangePayloadHelper.resolvePath(payload);
    const fileChangePatch = this.fileChangePayloadHelper.resolvePatch(payload);
    const commandValue = this.toolPayloadParser.resolveCommandValue(payload);
    const fallbackToolName =
      segmentType === "edit_file"
        ? "edit_file"
        : segmentType === "run_bash"
          ? "run_bash"
          : undefined;
    const toolName = this.toolPayloadParser.resolveToolName(payload, fallbackToolName);
    const pathValue = asString(payload.path) ?? asString(item.path) ?? fileChangePath;
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
    if (segmentType === "tool_call") {
      const toolArguments = this.toolPayloadParser.resolveToolCallMetadataArguments(payload);
      if (Object.keys(toolArguments).length > 0) {
        next.arguments = toolArguments;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  public resolveDelta(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate = payload.delta ?? payload.content ?? payload.summary_part ?? item.content;
    return typeof candidate === "string" ? candidate : "";
  }

  public resolveReasoningSnapshot(payload: Record<string, unknown>): string {
    return this.reasoningPayloadParser.resolveReasoningSnapshot(payload);
  }

  public resolveSegmentId(
    payload: Record<string, unknown>,
    fallback = "runtime-segment",
  ): string {
    const item = asObject(payload.item);
    const candidate =
      payload.segment_id ??
      payload.item_id ??
      payload.itemId ??
      item.id ??
      payload.id;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback;
  }

  public resolveReasoningSegmentId(payload: Record<string, unknown>): string {
    return this.reasoningPayloadParser.resolveReasoningSegmentId(payload);
  }

  public clearReasoningSegmentForTurn(payload: Record<string, unknown>): void {
    this.reasoningPayloadParser.clearReasoningSegmentForTurn(payload);
  }

  public resolveItemType(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const type = asString(item.type) ?? asString(payload.item_type);
    if (!type) {
      return null;
    }
    return type.replace(/[_-]/g, "").toLowerCase();
  }

  public isUserMessageItem(itemType: string | null): boolean {
    return itemType === "usermessage" || itemType === "inputmessage";
  }

  public isReasoningItem(itemType: string | null): boolean {
    return itemType === "reasoning";
  }

  public isWebSearchItem(itemType: string | null): boolean {
    return itemType === "websearch";
  }

  public resolveWebSearchMetadata(payload: Record<string, unknown>): Record<string, unknown> {
    return this.toolPayloadParser.resolveWebSearchMetadata(payload);
  }

  public resolveInvocationId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const invocationBase =
      asString(payload.invocation_id) ??
      asString(payload.tool_invocation_id) ??
      asString(payload.itemId) ??
      asString(payload.item_id) ??
      asString(payload.call_id) ??
      asString(payload.callId) ??
      asString(payload.id) ??
      asString(item.call_id) ??
      asString(item.id);
    if (!invocationBase) {
      return null;
    }
    const approvalId = asString(payload.approval_id) ?? asString(payload.approvalId);
    if (approvalId && !invocationBase.includes(":")) {
      return `${invocationBase}:${approvalId}`;
    }
    return invocationBase;
  }

  public resolveToolName(
    payload: Record<string, unknown>,
    fallback?: "run_bash" | "edit_file",
  ): string | null {
    return this.toolPayloadParser.resolveToolName(payload, fallback);
  }

  public resolveToolArguments(
    payload: Record<string, unknown>,
    fallbackToolName: "run_bash" | "edit_file",
  ): Record<string, unknown> {
    return this.toolPayloadParser.resolveToolArguments(payload, fallbackToolName);
  }

  public resolveDynamicToolArguments(payload: Record<string, unknown>): Record<string, unknown> {
    return this.toolPayloadParser.resolveDynamicToolArguments(payload);
  }

  public resolveCommandValue(payload: Record<string, unknown>): string | null {
    return this.toolPayloadParser.resolveCommandValue(payload);
  }

  public resolveLogEntry(payload: Record<string, unknown>): string {
    return this.toolPayloadParser.resolveLogEntry(payload);
  }

  public resolveToolDecisionReason(payload: Record<string, unknown>): string | null {
    return this.toolPayloadParser.resolveToolDecisionReason(payload);
  }

  public resolveToolResult(payload: Record<string, unknown>): unknown {
    return this.toolPayloadParser.resolveToolResult(payload);
  }

  public resolveToolError(payload: Record<string, unknown>): string {
    return this.toolPayloadParser.resolveToolError(payload);
  }

  public resolveExecutionStatus(payload: Record<string, unknown>): string | null {
    return this.toolPayloadParser.resolveExecutionStatus(payload);
  }

  public isExecutionFailure(payload: Record<string, unknown>): boolean {
    return this.toolPayloadParser.isExecutionFailure(payload);
  }

  public resolveReasoningDelta(payload: Record<string, unknown>): string {
    return this.reasoningPayloadParser.resolveReasoningDelta(payload, this.resolveDelta(payload));
  }

  private sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const [key, row] of Object.entries(value)) {
      if (typeof row === "string" && row.trim().length === 0) {
        continue;
      }
      if (row !== undefined) {
        next[key] = row;
      }
    }
    return next;
  }
}
