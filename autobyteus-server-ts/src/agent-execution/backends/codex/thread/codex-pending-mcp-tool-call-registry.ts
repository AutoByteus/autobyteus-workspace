import type { JsonObject } from "../codex-app-server-json.js";

export type CodexPendingMcpToolCall = {
  invocationId: string;
  turnId: string | null;
  serverName: string | null;
  toolName: string | null;
  arguments: JsonObject;
};

const normalizeLookupToken = (value: string | null): string | null =>
  value ? value.trim().toLowerCase() : null;

export class CodexPendingMcpToolCallRegistry {
  constructor(
    private readonly calls: Map<string, CodexPendingMcpToolCall> = new Map(),
  ) {}

  track(call: CodexPendingMcpToolCall): void {
    this.calls.set(call.invocationId, call);
  }

  complete(invocationId: string | null): CodexPendingMcpToolCall | null {
    if (!invocationId) return null;
    const pending = this.calls.get(invocationId) ?? null;
    this.calls.delete(invocationId);
    return pending;
  }

  find(input: {
    turnId: string | null;
    serverName: string | null;
    toolName: string | null;
  }): CodexPendingMcpToolCall | null {
    const turnId = normalizeLookupToken(input.turnId);
    const serverName = normalizeLookupToken(input.serverName);
    const toolName = normalizeLookupToken(input.toolName);
    const candidates = Array.from(this.calls.values()).filter((call) => {
      if (turnId && normalizeLookupToken(call.turnId) !== turnId) return false;
      if (serverName && normalizeLookupToken(call.serverName) !== serverName) return false;
      if (toolName && normalizeLookupToken(call.toolName) !== toolName) return false;
      return true;
    });
    return candidates.at(-1) ?? null;
  }

  clear(): void {
    this.calls.clear();
  }
}
