import { getInternalServerBaseUrlOrThrow } from "../../config/server-runtime-endpoints.js";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
  AGENT_TOOLS_MCP_TRANSPORT,
  cloneAgentToolMcpSessionOwnerIdentity,
  redactAgentToolMcpDescriptor,
  type AgentToolMcpCreateSessionInput,
  type AgentToolMcpDescriptor,
  type AgentToolMcpSession,
  type AgentToolMcpSessionBaseExecutionCapabilities,
  type AgentToolMcpSessionExecutionCapabilities,
  type AgentToolMcpSessionOwnerIdentity,
  type RedactedAgentToolMcpDescriptor,
} from "./agent-tool-mcp-session.js";
import type {
  AgentToolMcpSessionIssueInput,
  AgentToolMcpSessionIssuer,
  IssuedAgentToolMcpSession,
} from "./agent-tool-mcp-session-authority.js";
import {
  AgentToolMcpCatalog,
  getAgentToolMcpCatalog,
} from "./agent-tool-mcp-catalog.js";
import {
  AgentToolMcpSessionRegistry,
  getAgentToolMcpSessionRegistry,
} from "./agent-tool-mcp-session-registry.js";

type AgentToolMcpSessionServiceDeps = {
  registry?: AgentToolMcpSessionRegistry;
  catalog?: AgentToolMcpCatalog;
  getInternalBaseUrl?: () => string;
  executionCapabilities?: AgentToolMcpSessionBaseExecutionCapabilities | null;
};

export class AgentToolMcpSessionService {
  private static instance: AgentToolMcpSessionService | null = null;
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private readonly getInternalBaseUrl: () => string;
  private readonly executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities | null;

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
      ? Object.freeze({
          publishedArtifactPublisher:
            deps.executionCapabilities.publishedArtifactPublisher,
        })
      : null;
  }

  createAgentToolMcpSession(
    input: AgentToolMcpSessionIssueInput,
  ): IssuedAgentToolMcpSession {
    const executionCapabilities = this.buildExecutionCapabilities(input);
    const exposure = this.catalog.resolveRuntimeSessionToolExposure({
      runtimeExposure: input.runtimeExposure,
      sender: input.sender,
      executionContext: input.executionContext ?? {},
    });
    const { session, capabilityToken } = this.registry.createSession({
      ...input,
      executionCapabilities,
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    });
    const descriptor = this.buildDescriptor(session, capabilityToken);
    const frozenDescriptor: AgentToolMcpDescriptor = {
      ...descriptor,
      headers: { ...descriptor.headers },
      enabledTools: [...descriptor.enabledTools],
    };
    Object.freeze(frozenDescriptor.headers);
    Object.freeze(frozenDescriptor.enabledTools);
    Object.freeze(frozenDescriptor);
    const redactedDescriptor = redactAgentToolMcpDescriptor(descriptor);
    Object.freeze(redactedDescriptor.headers);
    Object.freeze(redactedDescriptor.enabledTools);
    Object.freeze(redactedDescriptor);
    const owner = cloneAgentToolMcpSessionOwnerIdentity(session.owner);
    if (owner.teamIdentity) Object.freeze(owner.teamIdentity);
    Object.freeze(owner);
    return Object.freeze<IssuedAgentToolMcpSession>({
      sessionId: session.sessionId,
      owner,
      descriptor: frozenDescriptor,
      redactedDescriptor,
    });
  }

  private buildExecutionCapabilities(
    input: AgentToolMcpSessionIssueInput,
  ): AgentToolMcpSessionExecutionCapabilities {
    const base = this.executionCapabilities;
    if (!base) {
      throw new Error("Agent Tools MCP session issuance is unavailable for this scope.");
    }
    const member = input.sender.memberTeamContext;
    const ownerTeamIdentity = input.owner.teamIdentity ?? null;
    if (!member) {
      if (ownerTeamIdentity) {
        throw new Error(
          "Agent Tools MCP Team owner identity requires a Team-member sender context.",
        );
      }
      return Object.freeze({
        kind: "agent",
        publishedArtifactPublisher: base.publishedArtifactPublisher,
      });
    }

    const memberIdentity = member.identity;
    if (
      input.owner.runId !== memberIdentity.agentRunId ||
      !ownerTeamIdentity ||
      ownerTeamIdentity.rootTeamRunId !== memberIdentity.rootTeamRunId ||
      ownerTeamIdentity.memberAddress !== memberIdentity.memberAddress ||
      ownerTeamIdentity.agentRunId !== memberIdentity.agentRunId
    ) {
      throw new Error(
        "Agent Tools MCP Team owner identity does not match the Team-member sender context.",
      );
    }
    return Object.freeze({
      kind: "team_member",
      publishedArtifactPublisher: base.publishedArtifactPublisher,
      taskDelegation: Object.freeze({
        identity: { ...memberIdentity },
        rootResolver: member.taskRootResolver,
      }),
    });
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

export const getAgentToolMcpSessionIssuer = (): AgentToolMcpSessionIssuer =>
  Object.freeze({
    issueForRun: (input: AgentToolMcpSessionIssueInput) =>
      getAgentToolMcpSessionService().createAgentToolMcpSession(input),
  });

export const resetAgentToolMcpSessionServiceForTests = (): void => {
  AgentToolMcpSessionService.resetInstance();
};
