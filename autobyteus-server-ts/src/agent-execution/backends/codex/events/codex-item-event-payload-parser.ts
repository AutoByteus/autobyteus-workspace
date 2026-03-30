import { CodexFileChangePayloadHelper } from "./codex-file-change-payload-helper.js";
import { CodexReasoningSegmentTracker } from "./codex-reasoning-segment-tracker.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const parseJsonRecord = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

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
  if (token === "functioncall" || token === "dynamictoolcall") {
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
  private readonly reasoningSegmentTracker = new CodexReasoningSegmentTracker();
  private readonly fileChangePayloadHelper = new CodexFileChangePayloadHelper();

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

    const commandCandidate = asString(payload.command) ?? asString(item.command);
    if (commandCandidate) {
      return "run_bash";
    }

    const patchCandidate =
      asString(payload.patch) ??
      asString(payload.diff) ??
      asString(item.patch) ??
      asString(item.diff) ??
      this.fileChangePayloadHelper.resolvePatch(payload);
    if (patchCandidate) {
      return "edit_file";
    }

    return "text";
  }

  public resolveSegmentStartId(payload: Record<string, unknown>, segmentType: string): string {
    if (
      segmentType === "tool_call" ||
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

  public resolveSegmentMetadata(
    payload: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const metadata = asObject(payload.metadata);
    const item = asObject(payload.item);
    const fileChangePath = this.fileChangePayloadHelper.resolvePath(payload);
    const fileChangePatch = this.fileChangePayloadHelper.resolvePatch(payload);
    const commandValue = this.resolveCommandValue(payload);
    const toolName =
      asString(payload.tool_name) ??
      asString(payload.tool) ??
      asString(item.tool_name) ??
      asString(item.tool) ??
      asString(item.name);
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
    if (this.resolveSegmentType(payload) === "tool_call") {
      const toolArguments = this.resolveToolCallMetadataArguments(payload);
      if (Object.keys(toolArguments).length > 0) {
        next.arguments = toolArguments;
      }
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  public resolveDelta(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate =
      payload.delta ??
      payload.content ??
      payload.summary_part ??
      item.content;
    return typeof candidate === "string" ? candidate : "";
  }

  public resolveReasoningSnapshot(payload: Record<string, unknown>): string {
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
      asString(payload.summary) ??
      asString(item.text) ??
      ""
    );
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
    return this.reasoningSegmentTracker.resolveReasoningSegmentId(payload);
  }

  public clearReasoningSegmentForTurn(payload: Record<string, unknown>): void {
    this.reasoningSegmentTracker.clearReasoningSegmentForTurn(payload);
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

    const query = asString(action.query) ?? asString(item.query) ?? asString(payload.query);
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
    fallback: "run_bash" | "edit_file" = "run_bash",
  ): string | null {
    const item = asObject(payload.item);
    return (
      asString(payload.tool_name) ??
      asString(payload.tool) ??
      asString(payload.command_name) ??
      asString(item.tool_name) ??
      asString(item.tool) ??
      asString(item.name) ??
      fallback
    );
  }

  public resolveToolArguments(
    payload: Record<string, unknown>,
    fallbackToolName: "run_bash" | "edit_file",
  ): Record<string, unknown> {
    const item = asObject(payload.item);
    const explicitArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(
        payload.arguments,
        payload.args,
        payload.input,
      ),
    );
    const itemArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(
        item.arguments,
        item.args,
        item.input,
      ),
    );
    const mergedArguments: Record<string, unknown> = { ...itemArguments, ...explicitArguments };
    const command = this.resolveCommandValue(payload);
    const fileChangeFields = this.fileChangePayloadHelper.resolveFields(payload);
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

    const next: Record<string, unknown> = { ...mergedArguments };
    if (pathValue) {
      next.path = pathValue;
    }
    if (patchValue) {
      next.patch = patchValue;
    }
    return this.sanitizeRecord(next);
  }

  private resolveToolCallMetadataArguments(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const item = asObject(payload.item);
    const invocation = asObject(payload.invocation);
    const itemInvocation = asObject(item.invocation);
    const msg = asObject(payload.msg);
    const msgInvocation = asObject(msg.invocation);
    const explicitArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(
        payload.arguments,
        payload.args,
        payload.input,
        invocation.arguments,
        invocation.args,
        invocation.input,
        msgInvocation.arguments,
        msgInvocation.args,
        msgInvocation.input,
      ),
    );
    const itemArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(
        item.arguments,
        item.args,
        item.input,
        itemInvocation.arguments,
        itemInvocation.args,
        itemInvocation.input,
      ),
    );
    const mergedArguments: Record<string, unknown> = { ...itemArguments, ...explicitArguments };

    const query = asString(mergedArguments.query) ?? asString(payload.query) ?? asString(item.query);
    if (query) {
      mergedArguments.query = query;
    }

    const queriesCandidate = mergedArguments.queries ?? payload.queries ?? item.queries;
    if (Array.isArray(queriesCandidate)) {
      const queries = queriesCandidate
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      if (queries.length > 0) {
        mergedArguments.queries = queries;
      }
    }

    return this.sanitizeRecord(mergedArguments);
  }

  public resolveCommandValue(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    return (
      asString(payload.command) ??
      asString(item.command) ??
      this.resolveCommandActionValue(payload)
    );
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

  public resolveLogEntry(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    return (
      asString(payload.delta) ??
      asString(payload.output) ??
      asString(item.output) ??
      ""
    );
  }

  public resolveToolDecisionReason(payload: Record<string, unknown>): string | null {
    return asString(payload.reason);
  }

  public resolveToolResult(payload: Record<string, unknown>): unknown {
    const item = asObject(payload.item);
    const candidate =
      payload.result ??
      item.result ??
      payload.output ??
      item.output ??
      payload.aggregatedOutput ??
      item.aggregatedOutput;
    if (candidate !== undefined) {
      return candidate;
    }
    return { success: !this.isExecutionFailure(payload) };
  }

  public resolveToolError(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate =
      asString(payload.error) ??
      asString(payload.message) ??
      asString(item.error) ??
      asString(item.message);
    if (candidate) {
      return candidate;
    }
    const status = asString(payload.status) ?? asString(item.status);
    if (status === "declined") {
      return "Tool execution denied.";
    }
    return "Tool execution failed.";
  }

  public resolveExecutionStatus(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    return asString(item.status) ?? asString(payload.status);
  }

  public isExecutionFailure(payload: Record<string, unknown>): boolean {
    const item = asObject(payload.item);
    if (payload.success === false || item.success === false) {
      return true;
    }
    const status = this.resolveExecutionStatus(payload);
    return status === "failed" || status === "error";
  }

  public resolveReasoningDelta(payload: Record<string, unknown>): string {
    return this.resolveDelta(payload) || this.resolveReasoningSnapshot(payload);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return {};
      }
      return parseJsonRecord(trimmed);
    }
    return {};
  }

  private resolveStructuredArguments(...candidates: unknown[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const candidate of candidates) {
      Object.assign(merged, this.asRecord(candidate));
    }
    return merged;
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

}
