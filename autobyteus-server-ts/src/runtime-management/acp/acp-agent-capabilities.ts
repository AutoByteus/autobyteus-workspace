import { PROTOCOL_VERSION, type InitializeResponse } from "@agentclientprotocol/sdk";

/** Product needs the shared ACP layer checks against an agent's standard capabilities. */
export type AcpRequiredCapability = "loadSession" | "mcpHttp";

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
      capabilities?.promptCapabilities?.image === true,
      capabilities?.mcpCapabilities?.http === true,
      (result.authMethods ?? []).map((method) => method.id),
      result.agentInfo ? { name: result.agentInfo.name, version: result.agentInfo.version } : null,
    );
  }

  /** What a run needs: `session/load` to restore, HTTP MCP when Agent Tools are exposed. */
  static requiredFor(input: Readonly<{ restore: boolean; mcp: boolean }>): AcpRequiredCapability[] {
    return [
      ...(input.restore ? ["loadSession" as const] : []),
      ...(input.mcp ? ["mcpHttp" as const] : []),
    ];
  }

  missing(needs: readonly AcpRequiredCapability[]): string[] {
    const missing: string[] = [];
    if (this.protocolVersion !== PROTOCOL_VERSION) missing.push(`protocol version ${PROTOCOL_VERSION}`);
    for (const need of needs) {
      if (need === "loadSession" && !this.loadSession) missing.push("session/load");
      if (need === "mcpHttp" && !this.mcpHttp) missing.push("HTTP MCP servers");
    }
    return missing;
  }

  require(agentLabel: string, needs: readonly AcpRequiredCapability[]): void {
    const missing = this.missing(needs);
    if (missing.length > 0) throw new AcpMissingCapabilityError(agentLabel, missing);
  }
}
