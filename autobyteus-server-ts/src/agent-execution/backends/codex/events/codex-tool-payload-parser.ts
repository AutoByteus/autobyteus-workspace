import { CodexFileChangePayloadHelper } from "./codex-file-change-payload-helper.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

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

const parseJsonValue = (value: string): { parsed: true; value: unknown } | { parsed: false } => {
  try {
    return {
      parsed: true,
      value: JSON.parse(value),
    };
  } catch {
    return { parsed: false };
  }
};

export class CodexToolPayloadParser {
  constructor(private readonly fileChangePayloadHelper: CodexFileChangePayloadHelper) {}

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

  public resolveToolName(
    payload: Record<string, unknown>,
    fallback?: "run_bash" | "edit_file",
  ): string | null {
    const item = asObject(payload.item);
    return (
      asString(payload.tool_name) ??
      asString(payload.tool) ??
      asString(payload.command_name) ??
      asString(item.tool_name) ??
      asString(item.tool) ??
      asString(item.name) ??
      fallback ??
      null
    );
  }

  public resolveToolArguments(
    payload: Record<string, unknown>,
    fallbackToolName: "run_bash" | "edit_file",
  ): Record<string, unknown> {
    const item = asObject(payload.item);
    const explicitArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(payload.arguments, payload.args, payload.input),
    );
    const itemArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(item.arguments, item.args, item.input),
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
      const commandValue =
        asString(mergedArguments.command) ?? asString(mergedArguments.cmd) ?? command;
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

  public resolveDynamicToolArguments(payload: Record<string, unknown>): Record<string, unknown> {
    const item = asObject(payload.item);
    const explicitArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(payload.arguments, payload.args, payload.input),
    );
    const itemArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(item.arguments, item.args, item.input),
    );
    return this.sanitizeRecord({ ...itemArguments, ...explicitArguments });
  }

  public resolveToolCallMetadataArguments(
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

  public resolveLogEntry(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    return asString(payload.delta) ?? asString(payload.output) ?? asString(item.output) ?? "";
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

    const textCandidate = this.resolveToolResultText(payload);
    if (textCandidate) {
      const parsed = parseJsonValue(textCandidate);
      if (parsed.parsed) {
        return parsed.value;
      }
      return textCandidate;
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

    const textCandidate = this.resolveToolResultText(payload);
    if (textCandidate) {
      const parsed = parseJsonValue(textCandidate);
      if (parsed.parsed) {
        const parsedError = this.resolveParsedErrorText(parsed.value);
        if (parsedError) {
          return parsedError;
        }
      }
      return textCandidate;
    }

    const status = (asString(payload.status) ?? asString(item.status))?.toLowerCase();
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
    const status = this.resolveExecutionStatus(payload)?.toLowerCase();
    return status === "failed" || status === "error";
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

  private resolveToolResultText(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate =
      this.collectText(payload.contentItems) ||
      this.collectText(item.contentItems) ||
      this.collectText(payload.content) ||
      this.collectText(item.content);
    return candidate.trim();
  }

  private resolveParsedErrorText(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    const parsed = asObject(value);
    const direct = asString(parsed.error) ?? asString(parsed.message);
    if (direct) {
      return direct;
    }
    const nestedError = asObject(parsed.error);
    return asString(nestedError.message) ?? asString(nestedError.code);
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
