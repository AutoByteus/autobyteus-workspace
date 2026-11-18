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
  AgentToolMcpRunSessionReplaceInput,
} from "./agent-tool-mcp-session-authority.js";
import type { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import type { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import type { AgentToolsMcpSessionStreams } from "./agent-tools-mcp-session-streams.js";
import { deriveAgentToolMcpRunSessionId } from "./agent-tool-mcp-run-session-id.js";

type AgentToolMcpSessionServiceDeps = {
  registry: AgentToolMcpSessionRegistry;
  catalog: AgentToolMcpCatalog;
  streams: AgentToolsMcpSessionStreams;
  getLocalBaseUrl: () => string;
  executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;
};

export class AgentToolMcpSessionService {
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private readonly streams: AgentToolsMcpSessionStreams;
  private readonly getLocalBaseUrl: () => string;
  private readonly executionCapabilities: AgentToolMcpSessionBaseExecutionCapabilities;

  constructor(deps: AgentToolMcpSessionServiceDeps) {
    if (!deps?.registry || !deps.catalog) {
      throw new Error("Agent Tools MCP session registry and catalog are required.");
    }
    if (!deps.streams) {
      throw new Error("Agent Tools MCP session streams are required.");
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
    this.streams = deps.streams;
    this.getLocalBaseUrl = deps.getLocalBaseUrl;
    this.executionCapabilities = Object.freeze({
      publishedArtifactPublisher:
        deps.executionCapabilities.publishedArtifactPublisher,
      applicationAgentTools: deps.executionCapabilities.applicationAgentTools,
    });
  }

  activateForRun(
    input: AgentToolMcpRunSessionActivationInput,
  ): ActiveAgentToolMcpRunSession {
    const executionCapabilities = this.buildExecutionCapabilities(input);
    const exposure = this.catalog.resolveRuntimeSessionToolExposure({
      runtimeExposure: input.runtimeExposure,
      sender: input.sender,
      executionContext: input.executionContext ?? {},
      applicationAgentTools: executionCapabilities.applicationAgentTools,
    });
    // Every external run has a session, even with no tools: an empty list is
    // a valid record, so a tool added later is reachable without a restart.
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

  /**
   * Re-resolves the run's exposure the way activation does, replaces the
   * session record in one step (removal is refused from the next request on),
   * then tells the session's open GET streams that the tool list changed.
   */
  replaceForRun(input: AgentToolMcpRunSessionReplaceInput): AgentToolMcpDescriptor {
    const current = this.requireSession(input.runId);
    const localBaseUrl = this.getLocalBaseUrl();
    const exposure = this.catalog.resolveRuntimeSessionToolExposure({
      runtimeExposure: input.runtimeExposure,
      sender: current.sender,
      executionContext: current.executionContext,
      applicationAgentTools: current.executionCapabilities.applicationAgentTools,
    });
    const session = this.registry.replaceToolExposure(current.sessionId, {
      runtimeExposure: input.runtimeExposure,
      enabledTools: exposure.enabledTools,
      toolRoutes: exposure.toolRoutes,
      configuredMcpToolSources: exposure.configuredMcpToolSources,
    });
    this.streams.notifyToolsChanged(session.sessionId);
    return buildDescriptor(session, localBaseUrl);
  }

  describeForRun(runId: string): AgentToolMcpDescriptor {
    return buildDescriptor(this.requireSession(runId), this.getLocalBaseUrl());
  }

  private requireSession(runId: string): AgentToolMcpSession {
    const sessionId = deriveAgentToolMcpRunSessionId(runId);
    const session = this.registry.getSession(sessionId);
    if (!session) {
      throw new Error(`Agent Tools MCP run session for run '${runId}' is not active.`);
    }
    return session;
  }

  private buildExecutionCapabilities(
    input: AgentToolMcpRunSessionActivationInput,
  ): AgentToolMcpSessionExecutionCapabilities {
    const member = input.sender.memberExecutionContext;
    const ownerIdentity = input.owner.collaborationIdentity ?? null;
    if (!member) {
      if (ownerIdentity) {
        throw new Error(
          "Agent Tools MCP collaboration owner identity requires a member sender context.",
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
      || !ownerIdentity
      || ownerIdentity.root.rootSubjectKind !== memberIdentity.root.rootSubjectKind
      || ownerIdentity.root.rootRunId !== memberIdentity.root.rootRunId
      || ownerIdentity.memberAddress !== memberIdentity.memberAddress
      || ownerIdentity.agentRunId !== memberIdentity.agentRunId
    ) {
      throw new Error(
        "Agent Tools MCP owner identity does not match the collaboration-member sender context.",
      );
    }
    return Object.freeze({
      kind: "collaboration_member",
      publishedArtifactPublisher:
        this.executionCapabilities.publishedArtifactPublisher,
      applicationAgentTools: this.executionCapabilities.applicationAgentTools,
      taskDelegation: Object.freeze({
        identity: memberIdentity,
        commands: member.tasks,
      }),
    });
  }

  private buildActivation(
    session: AgentToolMcpSession,
    localBaseUrl: string,
  ): ActiveAgentToolMcpRunSession {
    const descriptor = buildDescriptor(session, localBaseUrl);
    const owner = cloneAgentToolMcpSessionOwnerIdentity(session.owner);
    if (owner.collaborationIdentity) Object.freeze(owner.collaborationIdentity);
    Object.freeze(owner);
    return Object.freeze({
      kind: "active" as const,
      sessionId: session.sessionId,
      owner,
      descriptor,
    });
  }
}

const buildDescriptor = (
  session: AgentToolMcpSession,
  localBaseUrl: string,
): AgentToolMcpDescriptor => Object.freeze<AgentToolMcpDescriptor>({
  name: AGENT_TOOLS_MCP_SERVER_NAME,
  transport: AGENT_TOOLS_MCP_TRANSPORT,
  serverUrl: `${localBaseUrl}/mcp/agent-tools/${session.sessionId}`,
  enabledTools: Object.freeze([...session.enabledTools]) as string[],
});
