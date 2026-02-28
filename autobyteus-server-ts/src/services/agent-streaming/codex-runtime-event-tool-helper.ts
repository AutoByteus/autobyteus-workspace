export const asObject = (value: unknown): Record<string, unknown> =>
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

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export class CodexRuntimeEventToolHelper {
  protected asRecord(value: unknown): Record<string, unknown> {
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

  protected resolveInvocationId(payload: Record<string, unknown>): string | null {
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

  protected resolveToolName(
    payload: Record<string, unknown>,
    fallback: "run_bash" | "edit_file" = "run_bash",
  ): string | null {
    const item = asObject(payload.item);
    const command = asObject(payload.command);
    const payloadTool = asObject(payload.tool);
    const itemTool = asObject(item.tool);
    return (
      asString(payload.tool) ??
      asString(payloadTool.name) ??
      asString(payloadTool.tool_name) ??
      asString(payloadTool.toolName) ??
      asString(payload.tool_name) ??
      asString(payload.toolName) ??
      asString(payload.command_name) ??
      asString(command.tool_name) ??
      asString(command.toolName) ??
      asString(command.name) ??
      asString(item.tool_name) ??
      asString(item.toolName) ??
      asString(item.tool) ??
      asString(itemTool.name) ??
      asString(itemTool.tool_name) ??
      asString(itemTool.toolName) ??
      asString(item.name) ??
      fallback
    );
  }

  protected resolveToolArguments(
    payload: Record<string, unknown>,
    fallbackToolName: "run_bash" | "edit_file",
  ): Record<string, unknown> {
    const item = asObject(payload.item);
    const invocation = asObject(payload.invocation);
    const itemInvocation = asObject(item.invocation);
    const explicitArguments = this.sanitizeRecord(
      this.resolveStructuredArguments(
        payload.arguments,
        payload.args,
        payload.input,
        invocation.arguments,
        invocation.args,
        invocation.input,
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

  protected resolveToolCallMetadataArguments(payload: Record<string, unknown>): Record<string, unknown> {
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

    const query =
      asString(mergedArguments.query) ??
      asString(payload.query) ??
      asString(item.query);
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

  protected resolveCommandValue(payload: Record<string, unknown>): string | null {
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

  protected sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
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

  protected resolveLogEntry(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    return (
      asString(payload.log_entry) ??
      asString(payload.logEntry) ??
      asString(payload.delta) ??
      asString(payload.chunk) ??
      asString(payload.output) ??
      asString(item.log_entry) ??
      asString(item.logEntry) ??
      asString(item.output) ??
      ""
    );
  }

  protected resolveToolDecisionReason(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    return asString(payload.reason) ?? asString(item.reason);
  }

  protected resolveToolResult(payload: Record<string, unknown>): unknown {
    const item = asObject(payload.item);
    const candidate = payload.result ?? item.result ?? payload.output ?? item.output;
    if (candidate !== undefined) {
      return candidate;
    }
    return { success: !this.isExecutionFailure(payload) };
  }

  protected resolveToolError(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const candidate =
      asString(payload.error) ??
      asString(payload.message) ??
      asString(item.error) ??
      asString(item.message);
    return candidate ?? "Tool execution failed.";
  }

  protected isExecutionFailure(payload: Record<string, unknown>): boolean {
    const item = asObject(payload.item);
    if (payload.success === false || item.success === false) {
      return true;
    }
    const status =
      asString(payload.status) ??
      asString(item.status);
    return status === "failed" || status === "error";
  }
}
