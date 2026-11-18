import { PROTOCOL_VERSION, type InitializeResponse } from "@agentclientprotocol/sdk";

/** Product needs the shared ACP layer checks against an agent's standard capabilities. */
export type AcpRequiredCapability = "restoreSession" | "mcpHttp";

/** How an agent reopens an existing session: `session/load` (preferred) or `session/resume`. */
export type AcpRestoreMethod = "load" | "resume";

export class AcpMissingCapabilityError extends Error {
  constructor(readonly agentLabel: string, readonly missing: readonly string[]) {
    super(`ACP_AGENT_CAPABILITY_MISSING: ${agentLabel} does not support ${missing.join(", ")}.`);
    this.name = "AcpMissingCapabilityError";
  }
}

/**
 * Normalized view of the standard `initialize` result. Only standard ACP fields are read;
 * agent extension metadata stays with the agent's own profile.
 */
export class AcpAgentCapabilities {
  private constructor(
    readonly protocolVersion: number,
    readonly loadSession: boolean,
    readonly resumeSession: boolean,
    readonly imagePrompt: boolean,
    readonly mcpHttp: boolean,
    readonly authMethodIds: readonly string[],
    readonly agentInfo: Readonly<{ name: string; version: string }> | null,
  ) {}

  static fromInitialize(result: InitializeResponse): AcpAgentCapabilities {
    const capabilities = result.agentCapabilities;
    return new AcpAgentCapabilities(
      result.protocolVersion,
      capabilities?.loadSession === true,
      !!capabilities?.sessionCapabilities?.resume,
      capabilities?.promptCapabilities?.image === true,
      capabilities?.mcpCapabilities?.http === true,
      (result.authMethods ?? []).map((method) => method.id),
      result.agentInfo ? { name: result.agentInfo.name, version: result.agentInfo.version } : null,
    );
  }

  /** What a run needs: a way to reopen its session to restore, HTTP MCP when Agent Tools are exposed. */
  static requiredFor(input: Readonly<{ restore: boolean; mcp: boolean }>): AcpRequiredCapability[] {
    return [
      ...(input.restore ? ["restoreSession" as const] : []),
      ...(input.mcp ? ["mcpHttp" as const] : []),
    ];
  }

  /** `session/load` when the agent offers it, else `session/resume`; `null` when it offers neither. */
  restoreMethod(): AcpRestoreMethod | null {
    if (this.loadSession) return "load";
    return this.resumeSession ? "resume" : null;
  }

  missing(needs: readonly AcpRequiredCapability[]): string[] {
    const missing: string[] = [];
    if (this.protocolVersion !== PROTOCOL_VERSION) missing.push(`protocol version ${PROTOCOL_VERSION}`);
    for (const need of needs) {
      if (need === "restoreSession" && !this.restoreMethod()) missing.push("session/load or session/resume");
      if (need === "mcpHttp" && !this.mcpHttp) missing.push("HTTP MCP servers");
    }
    return missing;
  }

  require(agentLabel: string, needs: readonly AcpRequiredCapability[]): void {
    const missing = this.missing(needs);
    if (missing.length > 0) throw new AcpMissingCapabilityError(agentLabel, missing);
  }
}
