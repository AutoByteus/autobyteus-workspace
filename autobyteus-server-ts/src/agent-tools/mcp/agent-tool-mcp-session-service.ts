import {
  AGENT_TOOLS_MCP_SERVER_NAME,
  AGENT_TOOLS_MCP_TRANSPORT,
  cloneAgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpDescriptor,
  type AgentToolMcpSession,
  type AgentToolMcpSessionBaseExecutionCapabilities,
  type AgentToolMcpSessionExecutionCapabilities,
} from "./agent-tool-mcp-session.js";
import type {
  ActiveAgentToolMcpRunSession,
  AgentToolMcpRunSessionActivationInput,
  AgentToolMcpRunSessionActivationResult,
} from "./agent-tool-mcp-session-authority.js";
import type { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";

type AgentToolMcpSessionServiceDeps = {
  registry: AgentToolMcpSessionRegistry;
  catalog: AgentToolMcpCatalog;
  getLocalBaseUrl: () => string;
  executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
};

export class AgentToolMcpSessionService {
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private readonly getLocalBaseUrl: () => string;
  private readonly executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;

  constructor(deps: AgentToolMcpSessionServiceDeps) {
    if (!deps?.registry || !deps.catalog) {
      throw new Error("Agent Tools MCP session registry and catalog are required.");
    }
    if (typeof deps.getLocalBaseUrl !== "function") {
      throw new Error("Agent Tools MCP local base URL reader is required.");
    }
    if (!deps.executionCapabilities?.publishedArtifactPublisher) {
      throw new Error("Agent Tools MCP execution capabilities are required.");
    }
    if (!("applicationAgentTools" in deps.executionCapabilities)) {
      throw new Error("Agent Tools MCP application capability disposition is required.");
    }
    this.registry = deps.registry;
    this.catalog = deps.catalog;
    this.getLocalBaseUrl = deps.getLocalBaseUrl;
    this.executionCapabilities = Object.freeze({
      publishedArtifactPublisher:
        deps.executionCapabilities.publishedArtifactPublisher,
      applicationAgentTools: deps.executionCapabilities.applicationAgentTools,
    });
  }

  activateForRun(
    input: AgentToolMcpRunSessionActivationInput,
  ): AgentToolMcpRunSessionActivationResult {
    const executionCapabilities = this.buildExecutionCapabilities(input);
    const exposure = this.catalog.resolveRuntimeSessionToolExposure({
      runtimeExposure: input.runtimeExposure,
      sender: input.sender,
      executionContext: input.executionContext ?? {},
      applicationAgentTools: executionCapabilities.applicationAgentTools,
    });
    if (exposure.enabledTools.length === 0) {
      return Object.freeze({ kind: "not_exposed" as const });
    }
    const localBaseUrl = this.getLocalBaseUrl();
    const session = this.registry.activateSession({
      ...input,
      executionCapabilities,
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    });
    return this.buildActivation(session, localBaseUrl);
  }

  private buildExecutionCapabilities(
    input: AgentToolMcpRunSessionActivationInput,
  ): AgentToolMcpSessionExecutionCapabilities {
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
        publishedArtifactPublisher:
          this.executionCapabilities.publishedArtifactPublisher,
        applicationAgentTools: this.executionCapabilities.applicationAgentTools,
      });
    }

    const memberIdentity = member.identity;
    if (
      input.owner.runId !== memberIdentity.agentRunId
      || !ownerTeamIdentity
      || ownerTeamIdentity.rootTeamRunId !== memberIdentity.rootTeamRunId
      || ownerTeamIdentity.memberAddress !== memberIdentity.memberAddress
      || ownerTeamIdentity.agentRunId !== memberIdentity.agentRunId
    ) {
      throw new Error(
        "Agent Tools MCP Team owner identity does not match the Team-member sender context.",
      );
    }
    return Object.freeze({
      kind: "team_member",
      publishedArtifactPublisher:
        this.executionCapabilities.publishedArtifactPublisher,
      applicationAgentTools: this.executionCapabilities.applicationAgentTools,
      taskDelegation: Object.freeze({
        identity: { ...memberIdentity },
        rootResolver: member.taskRootResolver,
      }),
    });
  }

  private buildActivation(
    session: AgentToolMcpSession,
    localBaseUrl: string,
  ): ActiveAgentToolMcpRunSession {
    const descriptor = Object.freeze<AgentToolMcpDescriptor>({
      name: AGENT_TOOLS_MCP_SERVER_NAME,
      transport: AGENT_TOOLS_MCP_TRANSPORT,
      serverUrl: `${localBaseUrl}/mcp/agent-tools/${session.sessionId}`,
      enabledTools: Object.freeze([...session.enabledTools]) as string[],
    });
    const owner = cloneAgentToolMcpSessionOwnerIdentity(session.owner);
    if (owner.teamIdentity) Object.freeze(owner.teamIdentity);
    Object.freeze(owner);
    return Object.freeze({
      kind: "active" as const,
      sessionId: session.sessionId,
      owner,
      descriptor,
    });
  }
}
