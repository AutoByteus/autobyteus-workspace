import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import type { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import { ApplicationExecutionScope } from "../../../src/application-platform/execution/application-execution-scope.js";

const tempRoots: string[] = [];

const createScope = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "application-execution-scope-"));
  tempRoots.push(root);
  const memoryDir = path.join(root, "memory");
  const closeRawSessionScope = vi.fn();
  const blockNewSessions = vi.fn();
  const closeSessions = vi.fn();
  const sessionManager = {
    assertReady: vi.fn(),
    createAgentToolMcpSession: vi.fn(),
    revokeAgentToolMcpSession: vi.fn(),
    revokeAgentToolMcpSessionsForRun: vi.fn(),
    revokeAgentToolMcpSessionsForOwner: vi.fn(),
    redactAgentToolMcpDescriptor: vi.fn(),
    blockNewSessions,
    close: closeSessions,
  };
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(async (definitionId: string) => ({
      id: definitionId,
      name: "Researcher",
    })),
  };
  const scope = ApplicationExecutionScope.create({
    scopeIdentity: "application:test",
    memoryDir,
    agentDefinitionService: agentDefinitionService as never,
    agentTeamDefinitionService: {} as never,
    workspaceManager: {} as never,
    bindingReader: { getBinding: vi.fn(async () => null) },
    artifactDeliverySink: { accept: vi.fn(async () => undefined) },
    agentToolsSessionFactory: {
      createApplicationSessionScope: vi.fn(() => ({
        recordIssuedSession: vi.fn(),
        revokeForRun: vi.fn(() => 0),
        revokeForOwner: vi.fn(() => 0),
        blockNewSessions: vi.fn(),
        close: closeRawSessionScope,
      })),
      createApplicationSessionManager: vi.fn(() => sessionManager as never),
    },
  });
  return {
    scope,
    sessionManager,
    agentDefinitionService,
    blockNewSessions,
    closeSessions,
    closeRawSessionScope,
  };
};

type ScopeProbe = {
  agentRunService: {
    agentRunManager: {
      codexBackendFactory: { threadBootstrapper: { agentDefinitionService: unknown } };
    };
    metadataService: unknown;
    provisioningService: {
      metadataService: unknown;
      agentRunIdentityAllocator: AgentRunIdentityAllocator;
    };
  };
  teamRunService: {
    manager: unknown;
    agentIdentityAllocator: AgentRunIdentityAllocator;
  };
  shutdownCoordinator: { teamRuns: unknown; agentRuns: unknown };
};

describe("ApplicationExecutionScope", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("owns one graph-local allocator and freezes every outward capability", async () => {
    const globalDefinitionLookup = vi.spyOn(AgentDefinitionService, "getInstance");
    const { scope, agentDefinitionService } = await createScope();
    const probe = scope as unknown as ScopeProbe;
    const allocator = probe.teamRunService.agentIdentityAllocator;
    globalDefinitionLookup.mockClear();

    expect(probe.agentRunService.provisioningService.agentRunIdentityAllocator).toBe(allocator);
    expect((allocator as never as { agentDefinitionService: unknown }).agentDefinitionService)
      .toBe(agentDefinitionService);
    expect(probe.agentRunService.agentRunManager.codexBackendFactory.threadBootstrapper.agentDefinitionService)
      .toBe(agentDefinitionService);
    expect(probe.shutdownCoordinator.teamRuns).toBe(probe.teamRunService.manager);
    expect(probe.shutdownCoordinator.agentRuns).toBe(probe.agentRunService.agentRunManager);
    for (const capability of [
      scope.agentExecution,
      scope.teamExecution,
      scope.streaming,
      scope.artifacts,
      scope.memory,
      scope.toolReadiness,
      scope.lifecycle,
    ]) expect(Object.isFrozen(capability)).toBe(true);

    await expect(allocator.allocateForAgentDefinition("package-agent")).resolves
      .toMatch(/^researcher_[a-f0-9]{32}$/);
    expect(globalDefinitionLookup).not.toHaveBeenCalled();
    scope.abortConstruction();
  });

  it("projects configured Team members depth-first, excludes task nodes, and deep-freezes the result", async () => {
    const { scope } = await createScope();
    const root = {
      teamRunId: "team-root",
      getExecutionTreeSnapshot: () => ({
        rootTeam: {
          members: [
            { address: "/alpha", agentRunId: "agent-alpha" },
            {
              address: "/nested",
              teamRunId: "team-nested",
              members: [{ address: "/nested/beta", agentRunId: "agent-beta" }],
              taskExecutions: [{ address: "/nested/task", agentRunId: "agent-task" }],
            },
          ],
          taskExecutions: [{ address: "/task", agentRunId: "agent-root-task" }],
        },
      }),
    };
    const probe = scope as never as {
      teamRunService: {
        createTeamRun: ReturnType<typeof vi.fn>;
        createTeamRunFromRootConfig: ReturnType<typeof vi.fn>;
      };
    };
    probe.teamRunService.createTeamRun = vi.fn(async () => root);
    probe.teamRunService.createTeamRunFromRootConfig = vi.fn(async () => root);

    const result = await scope.teamExecution.createTeamRun({} as never);
    expect(result).toEqual({
      teamRunId: "team-root",
      members: [
        { memberAddress: "/alpha", agentRunId: "agent-alpha" },
        { memberAddress: "/nested/beta", agentRunId: "agent-beta" },
      ],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.members)).toBe(true);
    expect(result.members.every(Object.isFrozen)).toBe(true);
    const presetResult = await scope.teamExecution.createTeamRunFromRootConfig({} as never);
    expect(presetResult).toEqual(result);
    expect(presetResult).not.toBe(result);
    expect(presetResult.members).not.toBe(result.members);
    expect(Object.isFrozen(presetResult)).toBe(true);
    scope.abortConstruction();
  });

  it("projects Agent launch identity without leaking the service result", async () => {
    const { scope } = await createScope();
    const liveServiceResult = { runId: "agent-1", internal: { mutable: true } };
    const probe = scope as never as {
      agentRunService: { createAgentRun: ReturnType<typeof vi.fn> };
    };
    probe.agentRunService.createAgentRun = vi.fn(async () => liveServiceResult);

    const result = await scope.agentExecution.createAgentRun({} as never);
    expect(result).toEqual({ runId: "agent-1" });
    expect(result).not.toBe(liveServiceResult);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.keys(result)).toEqual(["runId"]);
    scope.abortConstruction();
  });

  it("maps restore-aware Agent and Team input without changing target or thrown errors", async () => {
    const { scope, blockNewSessions } = await createScope();
    const agentFailure = new Error("agent post failed");
    const teamFailure = new Error("team post failed");
    const agentRun = {
      postUserMessage: vi.fn()
        .mockResolvedValueOnce({ accepted: true })
        .mockResolvedValueOnce({ accepted: false, message: "busy" })
        .mockRejectedValueOnce(agentFailure),
    };
    const teamRun = {
      postMessage: vi.fn()
        .mockResolvedValueOnce({ accepted: true })
        .mockResolvedValueOnce({ accepted: false })
        .mockRejectedValueOnce(teamFailure),
    };
    const probe = scope as never as {
      agentRunService: { resolveAgentRun: ReturnType<typeof vi.fn> };
      teamRunService: { resolveActiveTeamRun: ReturnType<typeof vi.fn> };
    };
    probe.agentRunService.resolveAgentRun = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue(agentRun);
    probe.teamRunService.resolveActiveTeamRun = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue(teamRun);

    await expect(scope.agentExecution.postAgentInput("missing", {} as never))
      .resolves.toEqual({ kind: "NOT_AVAILABLE" });
    await expect(scope.agentExecution.postAgentInput("restored", {} as never))
      .resolves.toEqual({ kind: "ACCEPTED" });
    const rejected = await scope.agentExecution.postAgentInput("restored", {} as never);
    expect(rejected).toEqual({ kind: "REJECTED", message: "busy" });
    expect(Object.isFrozen(rejected)).toBe(true);
    await expect(scope.agentExecution.postAgentInput("restored", {} as never))
      .rejects.toBe(agentFailure);

    await expect(scope.teamExecution.postTeamInput("missing", {} as never, null))
      .resolves.toEqual({ kind: "NOT_AVAILABLE" });
    await expect(scope.teamExecution.postTeamInput("restored-team", {} as never, null))
      .resolves.toEqual({ kind: "ACCEPTED" });
    const teamRejected = await scope.teamExecution.postTeamInput(
      "restored-team",
      {} as never,
      "agent-member",
    );
    expect(teamRejected).toEqual({ kind: "REJECTED", message: null });
    expect(Object.isFrozen(teamRejected)).toBe(true);
    expect(teamRun.postMessage).toHaveBeenNthCalledWith(1, {}, null);
    expect(teamRun.postMessage).toHaveBeenNthCalledWith(2, {}, "agent-member");
    await expect(scope.teamExecution.postTeamInput("restored-team", {} as never, "agent-member"))
      .rejects.toBe(teamFailure);

    scope.abortConstruction();
  });

  it("blocks all create commands on quiesce and closes the run graph before sessions once", async () => {
    const { scope, blockNewSessions, closeSessions, closeRawSessionScope } = await createScope();
    const order: string[] = [];
    const shutdownCoordinator = {
      stopAllRuns: vi.fn(async () => {
        order.push("runs");
      }),
    };
    (scope as never as { shutdownCoordinator: typeof shutdownCoordinator }).shutdownCoordinator =
      shutdownCoordinator;
    closeSessions.mockImplementation(() => {
      order.push("sessions");
    });

    scope.lifecycle.quiesce();
    scope.lifecycle.quiesce();
    expect(blockNewSessions).toHaveBeenCalledTimes(1);
    await expect(scope.agentExecution.createAgentRun({} as never))
      .rejects.toThrow("Application execution is not accepting new runs.");
    await expect(scope.teamExecution.createTeamRun({} as never))
      .rejects.toThrow("Application execution is not accepting new runs.");
    await expect(scope.teamExecution.createTeamRunFromRootConfig({} as never))
      .rejects.toThrow("Application execution is not accepting new runs.");
    const firstClose = scope.lifecycle.close();
    const concurrentClose = scope.lifecycle.close();
    expect(concurrentClose).toBe(firstClose);
    await firstClose;
    await scope.lifecycle.close();
    expect(order).toEqual(["runs", "sessions"]);
    expect(shutdownCoordinator.stopAllRuns).toHaveBeenCalledTimes(1);
    expect(closeSessions).toHaveBeenCalledTimes(1);
    expect(closeRawSessionScope).not.toHaveBeenCalled();
  });

  it("continues session close after run shutdown failure and aggregates both failures", async () => {
    const { scope, closeSessions } = await createScope();
    const shutdownFailure = new Error("run shutdown failed");
    const sessionFailure = new Error("session close failed");
    (scope as never as { shutdownCoordinator: { stopAllRuns: () => Promise<void> } })
      .shutdownCoordinator = { stopAllRuns: vi.fn(async () => { throw shutdownFailure; }) };
    closeSessions.mockImplementation(() => { throw sessionFailure; });

    await expect(scope.lifecycle.close()).rejects.toMatchObject({
      name: "AggregateError",
      message: "Application execution scope close failed.",
      errors: [shutdownFailure, sessionFailure],
    });
    expect(closeSessions).toHaveBeenCalledTimes(1);
  });

  it("unwinds the raw session scope when construction fails before manager ownership", () => {
    const closeRawSessionScope = vi.fn();
    const processOwnerClose = vi.fn();
    const input = {
      scopeIdentity: "application:test" as const,
      memoryDir: "/tmp/memory",
      agentDefinitionService: {},
      agentTeamDefinitionService: {},
      workspaceManager: {},
      bindingReader: {},
      artifactDeliverySink: {},
      agentToolsSessionFactory: {
        processOwnerClose,
        createApplicationSessionScope: vi.fn(() => ({ close: closeRawSessionScope })),
        createApplicationSessionManager: vi.fn(() => {
          throw new Error("session manager construction failed");
        }),
      },
    };

    expect(() => ApplicationExecutionScope.create(input as never))
      .toThrow("session manager construction failed");
    expect(closeRawSessionScope).toHaveBeenCalledTimes(1);
    expect(processOwnerClose).not.toHaveBeenCalled();
  });

  it("validates every required construction field before creating a session scope", async () => {
    const createApplicationSessionScope = vi.fn();
    const valid = {
      scopeIdentity: "application:test",
      memoryDir: "/tmp/memory",
      agentDefinitionService: {},
      agentTeamDefinitionService: {},
      agentToolsSessionFactory: { createApplicationSessionScope },
      workspaceManager: {},
      bindingReader: {},
      artifactDeliverySink: {},
    };
    for (const field of Object.keys(valid)) {
      const candidate = { ...valid, [field]: undefined };
      expect(() => ApplicationExecutionScope.create(candidate as never)).toThrow();
    }
    expect(createApplicationSessionScope).not.toHaveBeenCalled();
  });
});
