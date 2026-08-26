import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { createAgentToolMcpSessionAuthorityFactory } from "../../../../src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.js";
import { AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR } from "../../../../src/config/server-runtime-endpoints.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { assertAgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";

const publisher = { publishManyForRun: vi.fn().mockResolvedValue([]) };
const input = (runId: string) => ({
  owner: { runId },
  sender: buildAgentRunMessageSenderContext({
    senderRunId: runId,
    senderName: runId,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  }),
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  runtimeExposure: buildRuntimeAgentToolExposure([]),
});

const createFixture = () => {
  const registry = new AgentToolMcpSessionRegistry();
  const catalog = new AgentToolMcpCatalog({ providers: [] });
  const assertHostOpen = vi.fn();
  return {
    registry,
    assertHostOpen,
    factory: createAgentToolMcpSessionAuthorityFactory({
      registry,
      catalog,
      assertHostOpen,
    }),
  };
};

describe("ScopedAgentToolMcpSessionAuthority", () => {
  beforeEach(() => {
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] = "http://127.0.0.1:43124";
  });
  afterEach(() => delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR]);

  it("enforces ASSEMBLING to COMPLETED or ABORTED and exposes no issuer before completion", () => {
    const { factory } = createFixture();
    const assembly = factory.begin({ scopeIdentity: "application:test" });
    expect(Object.keys(assembly).includes("issuer")).toBe(false);
    const authority = assembly.complete({
      executionCapabilities: { publishedArtifactPublisher: publisher },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    expect(authority.scopeIdentity).toBe("application:test");
    expect(() => assembly.complete({
      executionCapabilities: { publishedArtifactPublisher: publisher },
      assertExecutionCapabilitiesReady: () => undefined,
    })).toThrow("completed");
    assembly.abort();
    authority.close();

    const aborted = factory.begin({ scopeIdentity: "application:aborted" });
    aborted.abort();
    aborted.abort();
    expect(() => aborted.complete({
      executionCapabilities: { publishedArtifactPublisher: publisher },
      assertExecutionCapabilitiesReady: () => undefined,
    })).toThrow("aborted");
  });

  it("checks readiness, scopes exact-run revocation, blocks issue, and closes idempotently", () => {
    const { factory, registry } = createFixture();
    let ready = true;
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: { publishedArtifactPublisher: publisher },
      assertExecutionCapabilitiesReady: () => {
        if (!ready) throw new Error("publication unavailable");
      },
    });
    const first = authority.issuer.issueForRun(input("run-a"));
    const second = authority.issuer.issueForRun(input("run-b"));
    expect(authority.runSessions.revokeForRun("run-a")).toBe(1);
    expect(registry.getSession(first.sessionId)?.revokedAt).toBeInstanceOf(Date);
    expect(registry.getSession(second.sessionId)?.revokedAt).toBeNull();

    ready = false;
    expect(() => authority.assertReady()).toThrow("publication unavailable");
    ready = true;
    authority.blockNewSessions();
    expect(() => authority.issuer.issueForRun(input("late"))).toThrow("is closing");
    authority.close();
    authority.close();
    expect(registry.getSession(second.sessionId)?.revokedAt).toBeInstanceOf(Date);
  });

  it("revokes a just-issued session when ledger insertion fails", () => {
    const { factory, registry } = createFixture();
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: { publishedArtifactPublisher: publisher },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const originalCreate = registry.createSession.bind(registry);
    let createdSessionId = "";
    vi.spyOn(registry, "createSession").mockImplementationOnce((createInput) => {
      const created = originalCreate(createInput);
      createdSessionId = created.session.sessionId;
      authority.blockNewSessions();
      return created;
    });
    expect(() => authority.issuer.issueForRun(input("new"))).toThrow("is closing");
    expect(registry.getSession(createdSessionId)?.revokedAt).toBeInstanceOf(Date);
  });

  it("matches cloned Team owner identity and aggregates close failures after all attempts", () => {
    const { factory, registry } = createFixture();
    const authority = factory.begin({ scopeIdentity: "application:test" }).complete({
      executionCapabilities: { publishedArtifactPublisher: publisher },
      assertExecutionCapabilitiesReady: () => undefined,
    });
    const teamIdentity = {
      rootTeamRunId: "root-team",
      memberAddress: assertAgentTeamAddress("/researcher"),
      agentRunId: "run-team",
    };
    const teamIssued = authority.issuer.issueForRun({
      ...input("run-team"),
      owner: { runId: "run-team", teamIdentity },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "run-team",
        senderName: "researcher",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberTeamContext: testMemberTeamContext({
          rootTeamRunId: teamIdentity.rootTeamRunId,
          memberAddress: teamIdentity.memberAddress,
          agentRunId: teamIdentity.agentRunId,
        }),
      }),
    });
    expect(Object.isFrozen(teamIssued.owner)).toBe(true);
    expect(Object.isFrozen(teamIssued.owner.teamIdentity)).toBe(true);
    expect(authority.runSessions.revokeForOwner({
      teamIdentity: { ...teamIdentity },
    })).toBe(1);

    const first = authority.issuer.issueForRun(input("run-failure"));
    const second = authority.issuer.issueForRun(input("run-success"));
    const revoke = vi.spyOn(registry, "revokeSession");
    revoke.mockImplementation((sessionId) => {
      if (sessionId === first.sessionId) throw new Error("revoke failed");
      return true;
    });
    expect(() => authority.close()).toThrow(expect.objectContaining({
      name: "AggregateError",
      message: expect.stringContaining("cleanup failed"),
    }));
    expect(revoke).toHaveBeenCalledWith(first.sessionId);
    expect(revoke).toHaveBeenCalledWith(second.sessionId);
    expect(() => authority.close()).not.toThrow();
  });
});
