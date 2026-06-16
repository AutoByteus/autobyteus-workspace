import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  cloneAgentToolMcpExecutionContext,
  cloneAgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpCreateSessionInput,
  type AgentToolMcpSession,
  type AgentToolMcpSessionOwnerIdentity,
  type AgentToolMcpSessionResolveInput,
  type AgentToolMcpSessionResolveResult,
} from "./agent-tool-mcp-session.js";
import { cloneConfiguredMcpAgentToolSource } from "./configured-mcp/configured-mcp-agent-tool-source.js";

const SESSION_ID_RANDOM_BYTES = 18;
const TOKEN_RANDOM_BYTES = 32;

export type AgentToolMcpSessionRegistryCreateResult = {
  session: AgentToolMcpSession;
  capabilityToken: string;
};

type AgentToolMcpSessionRegistryDeps = {
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
};

export class AgentToolMcpSessionRegistry {
  private static instance: AgentToolMcpSessionRegistry | null = null;
  private readonly sessions = new Map<string, AgentToolMcpSession>();
  private readonly now: () => Date;
  private readonly generateRandomBytes: (size: number) => Buffer;

  static getInstance(): AgentToolMcpSessionRegistry {
    if (!AgentToolMcpSessionRegistry.instance) {
      AgentToolMcpSessionRegistry.instance = new AgentToolMcpSessionRegistry();
    }
    return AgentToolMcpSessionRegistry.instance;
  }

  static resetInstance(): void {
    AgentToolMcpSessionRegistry.instance = null;
  }

  constructor(deps: AgentToolMcpSessionRegistryDeps = {}) {
    this.now = deps.now ?? (() => new Date());
    this.generateRandomBytes = deps.randomBytes ?? randomBytes;
  }

  createSession(input: AgentToolMcpCreateSessionInput): AgentToolMcpSessionRegistryCreateResult {
    const createdAt = this.now();
    const sessionId = this.createUniqueSessionId();
    const capabilityToken = this.createCapabilityToken();
    const session: AgentToolMcpSession = {
      sessionId,
      tokenHash: hashBearerToken(capabilityToken),
      owner: normalizeOwner(input.owner),
      sender: input.sender,
      runtimeKind: input.runtimeKind ?? input.sender.runtimeKind ?? null,
      configuredExposure: cloneConfiguredExposure(input.configuredExposure),
      executionContext: cloneAgentToolMcpExecutionContext(input.executionContext),
      enabledTools: [...input.enabledTools],
      configuredMcpToolSources: (input.configuredMcpToolSources ?? []).map(cloneConfiguredMcpAgentToolSource),
      createdAt,
      revokedAt: null,
      toolExecutionObserver: input.toolExecutionObserver ?? null,
    };
    this.sessions.set(sessionId, session);
    return { session, capabilityToken };
  }

  resolveSession(input: AgentToolMcpSessionResolveInput): AgentToolMcpSessionResolveResult {
    const session = this.sessions.get(input.sessionId) ?? null;
    if (!session) {
      return { ok: false, reason: "missing_session" };
    }
    if (session.revokedAt) {
      return { ok: false, reason: "revoked" };
    }
    if (!doesBearerTokenMatch(input.bearerToken, session.tokenHash)) {
      return { ok: false, reason: "token_mismatch" };
    }
    return { ok: true, session };
  }

  getSession(sessionId: string): AgentToolMcpSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId) ?? null;
    if (!session || session.revokedAt) {
      return false;
    }
    session.revokedAt = this.now();
    return true;
  }

  revokeSessionsForOwner(owner: Partial<AgentToolMcpSessionOwnerIdentity>): number {
    let revokedCount = 0;
    for (const session of this.sessions.values()) {
      if (session.revokedAt || !doesOwnerMatch(session.owner, owner)) {
        continue;
      }
      session.revokedAt = this.now();
      revokedCount += 1;
    }
    return revokedCount;
  }

  clear(): void {
    this.sessions.clear();
  }

  listSessions(): AgentToolMcpSession[] {
    return Array.from(this.sessions.values());
  }

  private createUniqueSessionId(): string {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const sessionId = `agtmcp_${this.generateRandomBytes(SESSION_ID_RANDOM_BYTES).toString("base64url")}`;
      if (!this.sessions.has(sessionId)) {
        return sessionId;
      }
    }
    throw new Error("Failed to allocate a unique Agent Tools MCP session id.");
  }

  private createCapabilityToken(): string {
    return this.generateRandomBytes(TOKEN_RANDOM_BYTES).toString("base64url");
  }
}

export const getAgentToolMcpSessionRegistry = (): AgentToolMcpSessionRegistry =>
  AgentToolMcpSessionRegistry.getInstance();

export const resetAgentToolMcpSessionRegistryForTests = (): void => {
  AgentToolMcpSessionRegistry.resetInstance();
};

export const hashBearerToken = (token: string): Buffer =>
  createHash("sha256").update(token, "utf8").digest();

const doesBearerTokenMatch = (token: string, expectedHash: Buffer): boolean => {
  const actualHash = hashBearerToken(token);
  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash);
};

const normalizeOwner = (
  owner: AgentToolMcpSessionOwnerIdentity,
): AgentToolMcpSessionOwnerIdentity => {
  const runId = owner.runId.trim();
  if (!runId) {
    throw new Error("AgentToolMcpSession owner.runId is required.");
  }
  return cloneAgentToolMcpSessionOwnerIdentity({ ...owner, runId });
};

const cloneConfiguredExposure = (
  exposure: AgentToolMcpCreateSessionInput["configuredExposure"],
): AgentToolMcpCreateSessionInput["configuredExposure"] => ({
  configuredToolNames: [...exposure.configuredToolNames],
  enabledBrowserToolNames: [...exposure.enabledBrowserToolNames],
  enabledMediaToolNames: [...exposure.enabledMediaToolNames],
  enabledTaskDelegationToolNames: [...exposure.enabledTaskDelegationToolNames],
  sendMessageToConfigured: exposure.sendMessageToConfigured,
  publishArtifactsConfigured: exposure.publishArtifactsConfigured,
});

const doesOwnerMatch = (
  sessionOwner: AgentToolMcpSessionOwnerIdentity,
  candidate: Partial<AgentToolMcpSessionOwnerIdentity>,
): boolean => {
  if (candidate.runId !== undefined && sessionOwner.runId !== candidate.runId) {
    return false;
  }
  if (candidate.teamRunId !== undefined && sessionOwner.teamRunId !== candidate.teamRunId) {
    return false;
  }
  if (candidate.memberRunId !== undefined && sessionOwner.memberRunId !== candidate.memberRunId) {
    return false;
  }
  if (candidate.memberRouteKey !== undefined && sessionOwner.memberRouteKey !== candidate.memberRouteKey) {
    return false;
  }
  if (candidate.memberName !== undefined && sessionOwner.memberName !== candidate.memberName) {
    return false;
  }
  return Object.keys(candidate).length > 0;
};
