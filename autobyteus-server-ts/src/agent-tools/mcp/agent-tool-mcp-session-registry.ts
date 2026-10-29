import { normalizeStoredAgentRunId } from "../../agent-execution/identity/agent-run-id.js";
import {
  cloneAgentToolMcpExecutionContext,
  cloneAgentToolMcpSessionExecutionCapabilities,
  cloneAgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpActivateSessionInput,
  type AgentToolMcpSession,
  type AgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpSessionResolveResult,
  type AgentToolMcpSessionToolExposureRecord,
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
    const session: AgentToolMcpSession = Object.freeze({
      sessionId,
      owner,
      sender: input.sender,
      runtimeKind: input.runtimeKind ?? input.sender.runtimeKind ?? null,
      executionContext: cloneAgentToolMcpExecutionContext(input.executionContext),
      executionCapabilities: cloneAgentToolMcpSessionExecutionCapabilities(
        input.executionCapabilities,
      ),
      createdAt: this.now(),
      toolExecutionObserver: input.toolExecutionObserver ?? null,
      ...freezeToolExposure(input),
    });
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Replaces a session's tool exposure as one new frozen record, so a request
   * reads either the old exposure or the new one, never a mix.
   */
  replaceToolExposure(
    sessionId: string,
    exposure: AgentToolMcpSessionToolExposureRecord,
  ): AgentToolMcpSession {
    const current = this.sessions.get(sessionId as AgentToolMcpRunSessionId);
    if (!current) {
      throw new Error(`Agent Tools MCP run session '${sessionId}' is not active.`);
    }
    const session: AgentToolMcpSession = Object.freeze({
      ...current,
      ...freezeToolExposure(exposure),
    });
    this.sessions.set(current.sessionId, session);
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

const freezeToolExposure = (
  exposure: AgentToolMcpSessionToolExposureRecord,
): Pick<
  AgentToolMcpSession,
  "runtimeExposure" | "enabledTools" | "toolRoutes" | "configuredMcpToolSources"
> => ({
  runtimeExposure: Object.freeze(cloneRuntimeExposure(exposure.runtimeExposure)),
  enabledTools: Object.freeze([...exposure.enabledTools]) as string[],
  toolRoutes: cloneAgentToolMcpToolRouteTable(exposure.toolRoutes),
  configuredMcpToolSources: Object.freeze(
    (exposure.configuredMcpToolSources ?? [])
      .map((source) => Object.freeze(cloneConfiguredMcpAgentToolSource(source))),
  ) as ConfiguredMcpAgentToolSource[],
});

const cloneRuntimeExposure = (
  exposure: AgentToolMcpActivateSessionInput["runtimeExposure"],
): AgentToolMcpActivateSessionInput["runtimeExposure"] => ({
  requestedToolNames: [...exposure.requestedToolNames],
  enabledBrowserToolNames: [...exposure.enabledBrowserToolNames],
  enabledMediaToolNames: [...exposure.enabledMediaToolNames],
  enabledTaskDelegationToolNames: [...exposure.enabledTaskDelegationToolNames],
  enabledProjectTaskToolNames: [...exposure.enabledProjectTaskToolNames],
  sendMessageToEnabled: exposure.sendMessageToEnabled,
  getHandoffRulesEnabled: exposure.getHandoffRulesEnabled,
  publishArtifactsEnabled: exposure.publishArtifactsEnabled,
  listAvailableAgentsEnabled: exposure.listAvailableAgentsEnabled,
  listPeerNodesEnabled: exposure.listPeerNodesEnabled,
});
