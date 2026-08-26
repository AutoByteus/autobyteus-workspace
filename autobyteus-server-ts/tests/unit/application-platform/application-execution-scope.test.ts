import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import type { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import type { AgentProviderFactoryBuilder } from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
import type {
  AgentToolMcpSessionAuthorityFactory,
  ScopedAgentToolMcpSessionAuthority,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { ApplicationExecutionScope } from "../../../src/application-platform/execution/application-execution-scope.js";
import type { ApplicationExecutionScopeKernel } from "../../../src/application-platform/execution/application-execution-scope-kernel-builder.js";

const tempRoots: string[] = [];

const createScope = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "application-execution-scope-"));
  tempRoots.push(root);
  const closeAuthority = vi.fn();
  const blockNewSessions = vi.fn();
  const assertReady = vi.fn();
  const runSessions = Object.freeze({
    revokeForRun: vi.fn(() => 0),
    revokeForOwner: vi.fn(() => 0),
  });
  const authority: ScopedAgentToolMcpSessionAuthority = {
    scopeIdentity: "application:test",
    issuer: Object.freeze({ issueForRun: vi.fn() }),
    runSessions,
    assertReady,
    blockNewSessions,
    close: closeAuthority,
  };
  const complete = vi.fn(() => authority);
  const abort = vi.fn();
  const authorityFactory: AgentToolMcpSessionAuthorityFactory = {
    begin: vi.fn(() => ({
      scopeIdentity: "application:test",
      runSessions,
      complete,
      abort,
    })),
  };
  const factories = {
    autoByteus: { createBackend: vi.fn(), restoreBackend: vi.fn() },
    codex: { createBackend: vi.fn(), restoreBackend: vi.fn() },
    claude: { createBackend: vi.fn(), restoreBackend: vi.fn() },
  };
  const createForExecution = vi.fn(() => Object.freeze(factories));
  const providerBuilder: AgentProviderFactoryBuilder = { createForExecution };
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(async (definitionId: string) => ({
      id: definitionId,
      name: "Researcher",
    })),
  };
  const scope = ApplicationExecutionScope.create({
    scopeIdentity: "application:test",
    memoryDir: path.join(root, "memory"),
    agentDefinitionService: agentDefinitionService as never,
    agentTeamDefinitionService: {} as never,
    agentToolMcpSessionAuthorities: authorityFactory,
    agentProviderFactoryBuilder: providerBuilder,
    workspaceManager: {} as never,
    bindingReader: { getBinding: vi.fn(async () => null) },
    artifactDeliverySink: { accept: vi.fn(async () => undefined) },
  });
  const kernel = (scope as unknown as { kernel: ApplicationExecutionScopeKernel }).kernel;
  return {
    scope,
    kernel,
    authority,
    agentDefinitionService,
    createForExecution,
    assertReady,
    blockNewSessions,
    closeAuthority,
    abort,
  };
};

describe("ApplicationExecutionScope", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempRoots.splice(0).map((root) =>
      fs.rm(root, { recursive: true, force: true })));
  });

  it("owns one complete graph-local kernel and freezes every outward capability", async () => {
    const globalDefinitionLookup = vi.spyOn(AgentDefinitionService, "getInstance");
    const { scope, kernel, agentDefinitionService, createForExecution } = await createScope();
    const agentRunService = kernel.agentRunService as unknown as {
      agentRunManager: unknown;
      provisioningService: { agentRunIdentityAllocator: AgentRunIdentityAllocator };
    };
    const teamRunService = kernel.teamRunService as unknown as {
      manager: unknown;
      agentIdentityAllocator: AgentRunIdentityAllocator;
    };
    const allocator = teamRunService.agentIdentityAllocator;
    globalDefinitionLookup.mockClear();

    expect(agentRunService.provisioningService.agentRunIdentityAllocator).toBe(allocator);
    expect((allocator as unknown as { agentDefinitionService: unknown }).agentDefinitionService)
      .toBe(agentDefinitionService);
    expect(createForExecution).toHaveBeenCalledWith(expect.objectContaining({
      agentDefinitionService,
      agentToolMcpSessionIssuer: expect.any(Object),
    }));
    for (const capability of [
      scope.agentExecution,
      scope.teamExecution,
      scope.streaming,
      scope.artifacts,
      scope.memory,
      scope.toolReadiness,
      scope.lifecycle,
    ]) expect(Object.isFrozen(capability)).toBe(true);
    expect(Object.isFrozen(kernel)).toBe(true);

    await expect(allocator.allocateForAgentDefinition("package-agent")).resolves
      .toMatch(/^researcher_[a-f0-9]{32}$/);
    expect(globalDefinitionLookup).not.toHaveBeenCalled();
    scope.abortConstruction();
  });

  it("projects configured Team members depth-first, excludes task nodes, and deep-freezes", async () => {
    const { scope, kernel } = await createScope();
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
    vi.spyOn(kernel.teamRunService, "createTeamRun").mockResolvedValue(root as never);
    vi.spyOn(kernel.teamRunService, "createTeamRunFromRootConfig")
      .mockResolvedValue(root as never);

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
    const preset = await scope.teamExecution.createTeamRunFromRootConfig({} as never);
    expect(preset).toEqual(result);
    expect(preset).not.toBe(result);
    scope.abortConstruction();
  });

  it("projects Agent launch identity without leaking the service result", async () => {
    const { scope, kernel } = await createScope();
    const live = { runId: "agent-1", internal: { mutable: true } };
    vi.spyOn(kernel.agentRunService, "createAgentRun").mockResolvedValue(live as never);
    const result = await scope.agentExecution.createAgentRun({} as never);
    expect(result).toEqual({ runId: "agent-1" });
    expect(result).not.toBe(live);
    expect(Object.isFrozen(result)).toBe(true);
    scope.abortConstruction();
  });

  it("maps restore-aware Agent and Team input without changing target or errors", async () => {
    const { scope, kernel } = await createScope();
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
    vi.spyOn(kernel.agentRunService, "resolveAgentRun")
      .mockResolvedValueOnce(null).mockResolvedValue(agentRun as never);
    vi.spyOn(kernel.teamRunService, "resolveActiveTeamRun")
      .mockResolvedValueOnce(null).mockResolvedValue(teamRun as never);

    await expect(scope.agentExecution.postAgentInput("missing", {} as never))
      .resolves.toEqual({ kind: "NOT_AVAILABLE" });
    await expect(scope.agentExecution.postAgentInput("restored", {} as never))
      .resolves.toEqual({ kind: "ACCEPTED" });
    await expect(scope.agentExecution.postAgentInput("restored", {} as never))
      .resolves.toEqual({ kind: "REJECTED", message: "busy" });
    await expect(scope.agentExecution.postAgentInput("restored", {} as never))
      .rejects.toBe(agentFailure);

    await expect(scope.teamExecution.postTeamInput("missing", {} as never, null))
      .resolves.toEqual({ kind: "NOT_AVAILABLE" });
    await expect(scope.teamExecution.postTeamInput("restored-team", {} as never, null))
      .resolves.toEqual({ kind: "ACCEPTED" });
    await expect(scope.teamExecution.postTeamInput("restored-team", {} as never, "member"))
      .resolves.toEqual({ kind: "REJECTED", message: null });
    expect(teamRun.postMessage).toHaveBeenNthCalledWith(1, {}, null);
    expect(teamRun.postMessage).toHaveBeenNthCalledWith(2, {}, "member");
    await expect(scope.teamExecution.postTeamInput("restored-team", {} as never, "member"))
      .rejects.toBe(teamFailure);
    scope.abortConstruction();
  });

  it("quiesces issue admission and closes run graph before authority exactly once", async () => {
    const { scope, kernel, blockNewSessions, closeAuthority } = await createScope();
    const order: string[] = [];
    vi.spyOn(kernel.shutdownCoordinator, "stopAllRuns").mockImplementation(async () => {
      order.push("runs");
    });
    closeAuthority.mockImplementation(() => order.push("authority"));

    scope.lifecycle.quiesce();
    scope.lifecycle.quiesce();
    expect(blockNewSessions).toHaveBeenCalledTimes(1);
    await expect(scope.agentExecution.createAgentRun({} as never))
      .rejects.toThrow("Application execution is not accepting new runs.");
    const first = scope.lifecycle.close();
    expect(scope.lifecycle.close()).toBe(first);
    await first;
    await scope.lifecycle.close();
    expect(order).toEqual(["runs", "authority"]);
    expect(closeAuthority).toHaveBeenCalledTimes(1);
  });

  it("continues authority close after shutdown failure and aggregates both failures", async () => {
    const { scope, kernel, closeAuthority } = await createScope();
    const shutdownFailure = new Error("run shutdown failed");
    const authorityFailure = new Error("authority close failed");
    vi.spyOn(kernel.shutdownCoordinator, "stopAllRuns").mockRejectedValue(shutdownFailure);
    closeAuthority.mockImplementation(() => { throw authorityFailure; });
    await expect(scope.lifecycle.close()).rejects.toMatchObject({
      name: "AggregateError",
      message: "Application execution scope close failed.",
      errors: [shutdownFailure, authorityFailure],
    });
    expect(closeAuthority).toHaveBeenCalledTimes(1);
  });

  it("delegates construction abort exactly once after kernel transfer", async () => {
    const { scope, closeAuthority, abort } = await createScope();
    scope.abortConstruction();
    scope.abortConstruction();
    expect(closeAuthority).toHaveBeenCalledTimes(1);
    expect(abort).not.toHaveBeenCalled();
  });
});
