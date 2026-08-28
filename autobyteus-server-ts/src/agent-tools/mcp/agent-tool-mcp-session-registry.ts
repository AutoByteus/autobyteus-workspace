import { normalizeStoredAgentRunId } from "../../agent-execution/identity/agent-run-id.js";
import {
  cloneAgentToolMcpExecutionContext,
  cloneAgentToolMcpSessionExecutionCapabilities,
  cloneAgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpActivateSessionInput,
  type AgentToolMcpSession,
  type AgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpSessionResolveResult,
} from "./agent-tool-mcp-session.js";
import {
  deriveAgentToolMcpRunSessionId,
  type AgentToolMcpRunSessionId,
} from "./agent-tool-mcp-run-session-id.js";
import {
  cloneConfiguredMcpAgentToolSource,
  type ConfiguredMcpAgentToolSource,
} from "./configured-mcp/configured-mcp-agent-tool-source.js";
import { cloneAgentToolMcpToolRouteTable } from "./agent-tool-mcp-tool-route.js";

type AgentToolMcpSessionRegistryDeps = {
  now?: () => Date;
};

export class AgentToolMcpSessionRegistry {
  private readonly sessions = new Map<AgentToolMcpRunSessionId, AgentToolMcpSession>();
  private readonly now: () => Date;

  constructor(deps: AgentToolMcpSessionRegistryDeps = {}) {
    this.now = deps.now ?? (() => new Date());
  }

  activateSession(input: AgentToolMcpActivateSessionInput): AgentToolMcpSession {
    const owner = normalizeOwner(input.owner);
    const sessionId = deriveAgentToolMcpRunSessionId(owner.runId);
    if (this.sessions.has(sessionId)) {
      throw new Error(
        `Agent Tools MCP run session '${sessionId}' is already active.`,
      );
    }
    const session: AgentToolMcpSession = {
      sessionId,
      owner,
      sender: input.sender,
      runtimeKind: input.runtimeKind ?? input.sender.runtimeKind ?? null,
      runtimeExposure: cloneRuntimeExposure(input.runtimeExposure),
      executionContext: cloneAgentToolMcpExecutionContext(input.executionContext),
      executionCapabilities: cloneAgentToolMcpSessionExecutionCapabilities(
        input.executionCapabilities,
      ),
      enabledTools: Object.freeze([...input.enabledTools]) as string[],
      toolRoutes: cloneAgentToolMcpToolRouteTable(input.toolRoutes),
      configuredMcpToolSources: Object.freeze(
        (input.configuredMcpToolSources ?? [])
          .map((source) => Object.freeze(cloneConfiguredMcpAgentToolSource(source))),
      ) as ConfiguredMcpAgentToolSource[],
      createdAt: this.now(),
      toolExecutionObserver: input.toolExecutionObserver ?? null,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  resolveSession(sessionId: string): AgentToolMcpSessionResolveResult {
    const session = this.sessions.get(sessionId as AgentToolMcpRunSessionId) ?? null;
    return session
      ? { ok: true, session }
      : { ok: false, reason: "missing_session" };
  }

  getSession(sessionId: string): AgentToolMcpSession | null {
    return this.sessions.get(sessionId as AgentToolMcpRunSessionId) ?? null;
  }

  deactivateSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId as AgentToolMcpRunSessionId);
  }

  clear(): void {
    this.sessions.clear();
  }

  listSessions(): AgentToolMcpSession[] {
    return Array.from(this.sessions.values());
  }
}

const normalizeOwner = (
  owner: AgentToolMcpSessionOwnerIdentity,
): AgentToolMcpSessionOwnerIdentity => cloneAgentToolMcpSessionOwnerIdentity({
  ...owner,
  runId: normalizeStoredAgentRunId(owner.runId),
});

const cloneRuntimeExposure = (
  exposure: AgentToolMcpActivateSessionInput["runtimeExposure"],
): AgentToolMcpActivateSessionInput["runtimeExposure"] => ({
  requestedToolNames: [...exposure.requestedToolNames],
  enabledBrowserToolNames: [...exposure.enabledBrowserToolNames],
  enabledMediaToolNames: [...exposure.enabledMediaToolNames],
  enabledTaskDelegationToolNames: [...exposure.enabledTaskDelegationToolNames],
  sendMessageToEnabled: exposure.sendMessageToEnabled,
  getHandoffRulesEnabled: exposure.getHandoffRulesEnabled,
  publishArtifactsEnabled: exposure.publishArtifactsEnabled,
});
