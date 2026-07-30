import { getInternalServerBaseUrlOrThrow } from "../../config/server-runtime-endpoints.js";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
  AGENT_TOOLS_MCP_TRANSPORT,
  redactAgentToolMcpDescriptor,
  type AgentToolMcpCreateSessionInput,
  type AgentToolMcpDescriptor,
  type AgentToolMcpSession,
  type AgentToolMcpSessionExecutionCapabilities,
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

export type AgentToolMcpSessionIssueInput = Omit<
  AgentToolMcpCreateSessionInput,
  "enabledTools" | "toolRoutes" | "configuredMcpToolSources" | "executionCapabilities"
>;

export type AgentToolMcpSessionManager = {
  createAgentToolMcpSession(
    input: AgentToolMcpSessionIssueInput,
  ): CreateAgentToolMcpSessionResult;
  revokeAgentToolMcpSession(sessionId: string): boolean;
  revokeAgentToolMcpSessionsForRun(runId: string): number;
  revokeAgentToolMcpSessionsForMemberRun(memberRunId: string): number;
  revokeAgentToolMcpSessionsForOwner(
    owner: Partial<AgentToolMcpSessionOwnerIdentity>,
  ): number;
  redactAgentToolMcpDescriptor(
    descriptor: AgentToolMcpDescriptor,
  ): RedactedAgentToolMcpDescriptor;
};

type AgentToolMcpSessionServiceDeps = {
  registry?: AgentToolMcpSessionRegistry;
  catalog?: AgentToolMcpCatalog;
  getInternalBaseUrl?: () => string;
  executionCapabilities?: AgentToolMcpSessionExecutionCapabilities | null;
};

export class AgentToolMcpSessionService {
  private static instance: AgentToolMcpSessionService | null = null;
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private readonly getInternalBaseUrl: () => string;
  private readonly executionCapabilities: AgentToolMcpSessionExecutionCapabilities | null;

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
    this.executionCapabilities = deps.executionCapabilities
      ? Object.freeze({ ...deps.executionCapabilities })
      : null;
  }

  createAgentToolMcpSession(
    input: AgentToolMcpSessionIssueInput,
  ): CreateAgentToolMcpSessionResult {
    const exposure = this.catalog.resolveConfiguredSessionToolExposure({
      configuredExposure: input.configuredExposure,
      sender: input.sender,
      executionContext: input.executionContext ?? {},
    });
    const { session, capabilityToken } = this.registry.createSession({
      ...input,
      executionCapabilities: this.executionCapabilities,
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

  revokeAgentToolMcpSessionsForMemberRun(memberRunId: string): number {
    const normalizedMemberRunId = memberRunId.trim();
    if (!normalizedMemberRunId) {
      return 0;
    }
    return this.registry.revokeSessionsForOwner({ memberRunId: normalizedMemberRunId });
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
