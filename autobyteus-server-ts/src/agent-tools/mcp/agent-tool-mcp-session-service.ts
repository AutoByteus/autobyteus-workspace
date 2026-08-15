import { getInternalServerBaseUrlOrThrow } from "../../config/server-runtime-endpoints.js";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
  AGENT_TOOLS_MCP_TRANSPORT,
  redactAgentToolMcpDescriptor,
  type AgentToolMcpCreateSessionInput,
  type AgentToolMcpDescriptor,
  type AgentToolMcpSession,
  type AgentToolMcpSessionOwnerIdentity,
  type RedactedAgentToolMcpDescriptor,
} from "./agent-tool-mcp-session.js";
import {
  AgentToolMcpCatalog,
  getAgentToolMcpCatalog,
} from "./agent-tool-mcp-catalog.js";
import {
  AgentToolMcpSessionRegistry,
  getAgentToolMcpSessionRegistry,
} from "./agent-tool-mcp-session-registry.js";

export type CreateAgentToolMcpSessionResult = {
  session: AgentToolMcpSession;
  descriptor: AgentToolMcpDescriptor;
  redactedDescriptor: RedactedAgentToolMcpDescriptor;
};

type AgentToolMcpSessionServiceDeps = {
  registry?: AgentToolMcpSessionRegistry;
  catalog?: AgentToolMcpCatalog;
  getInternalBaseUrl?: () => string;
};

export class AgentToolMcpSessionService {
  private static instance: AgentToolMcpSessionService | null = null;
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private readonly getInternalBaseUrl: () => string;

  static getInstance(): AgentToolMcpSessionService {
    if (!AgentToolMcpSessionService.instance) {
      AgentToolMcpSessionService.instance = new AgentToolMcpSessionService();
    }
    return AgentToolMcpSessionService.instance;
  }

  static resetInstance(): void {
    AgentToolMcpSessionService.instance = null;
  }

  constructor(deps: AgentToolMcpSessionServiceDeps = {}) {
    this.registry = deps.registry ?? getAgentToolMcpSessionRegistry();
    this.catalog = deps.catalog ?? getAgentToolMcpCatalog();
    this.getInternalBaseUrl = deps.getInternalBaseUrl ?? getInternalServerBaseUrlOrThrow;
  }

  createAgentToolMcpSession(
    input: Omit<AgentToolMcpCreateSessionInput, "enabledTools" | "toolRoutes" | "configuredMcpToolSources">,
  ): CreateAgentToolMcpSessionResult {
    const exposure = this.catalog.resolveRuntimeSessionToolExposure({
      runtimeExposure: input.runtimeExposure,
      sender: input.sender,
      executionContext: input.executionContext ?? {},
    });
    const { session, capabilityToken } = this.registry.createSession({
      ...input,
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    });
    const descriptor = this.buildDescriptor(session, capabilityToken);
    return {
      session,
      descriptor,
      redactedDescriptor: redactAgentToolMcpDescriptor(descriptor),
    };
  }

  revokeAgentToolMcpSession(sessionId: string): boolean {
    return this.registry.revokeSession(sessionId);
  }

  revokeAgentToolMcpSessionsForRun(runId: string): number {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      return 0;
    }
    return this.registry.revokeSessionsForOwner({ runId: normalizedRunId });
  }

  revokeAgentToolMcpSessionsForAgentRun(agentRunId: string): number {
    const normalizedAgentRunId = agentRunId.trim();
    if (!normalizedAgentRunId) {
      return 0;
    }
    return this.registry.revokeSessionsForOwner({ runId: normalizedAgentRunId });
  }

  revokeAgentToolMcpSessionsForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number {
    return this.registry.revokeSessionsForOwner(owner);
  }

  redactAgentToolMcpDescriptor(
    descriptor: AgentToolMcpDescriptor,
  ): RedactedAgentToolMcpDescriptor {
    return redactAgentToolMcpDescriptor(descriptor);
  }

  private buildDescriptor(
    session: AgentToolMcpSession,
    capabilityToken: string,
  ): AgentToolMcpDescriptor {
    return {
      name: AGENT_TOOLS_MCP_SERVER_NAME,
      transport: AGENT_TOOLS_MCP_TRANSPORT,
      serverUrl: `${this.getInternalBaseUrl()}/mcp/agent-tools/${encodeURIComponent(session.sessionId)}`,
      headers: {
        Authorization: `Bearer ${capabilityToken}`,
      },
      enabledTools: [...session.enabledTools],
    };
  }
}

export const getAgentToolMcpSessionService = (): AgentToolMcpSessionService =>
  AgentToolMcpSessionService.getInstance();

export const resetAgentToolMcpSessionServiceForTests = (): void => {
  AgentToolMcpSessionService.resetInstance();
};
