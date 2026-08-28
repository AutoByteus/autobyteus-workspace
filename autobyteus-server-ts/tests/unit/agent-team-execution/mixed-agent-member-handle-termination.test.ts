import { describe, expect, it, vi } from "vitest";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testMemberTaskRootResolver,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const buildMemberConfig = (): TeamRunAgentNode => testAgentNode("/worker", {
  agentRunId: "worker-run-1",
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
});

const buildHandle = (overrides: {
  platformAgentRunId?: string | null;
  agentRunManager?: unknown;
} = {}) => {
  const config = buildMemberConfig();
  const teamConfig = testTeamRunConfig({
    rootTeamRunId: "team-run-1",
    rootTeamDefinitionId: "team-def-1",
    coordinatorAddress: config.address,
    children: [config],
  });
  const memberContext = new MixedAgentMemberContext({
    address: config.address,
    agentRunId: config.agentRunId,
    runtimeKind: config.runtimeKind,
    platformAgentRunId: overrides.platformAgentRunId ?? null,
  });
  const teamContext = new TeamRunContext({
    physicalScope: createRootTeamRunPhysicalScope("team-run-1"),
    teamRunId: "team-run-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: teamConfig.rootTeam,
    handoffs: teamConfig.handoffs,
    runtimeContext: new MixedTeamRunContext({ memberContexts: [memberContext] }),
  });
  const handle = new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config,
    activationMode: "restore",
    agentRunManager: overrides.agentRunManager as never,
    memberTeamContextBuilder: { build: vi.fn(async () => null) } as never,
    taskRootResolver: testMemberTaskRootResolver(),
    publish: vi.fn(),
    acceptPlatformBinding: vi.fn(async () => undefined),
    deliverInterAgentMessage: vi.fn(),
  });
  return { handle };
};

const attachRun = (handle: MixedAgentMemberHandle) => {
  let active = true;
  const run = {
    runId: "worker-run-1",
    isActive: () => active,
    setActive: (value: boolean) => { active = value; },
    getPlatformAgentRunId: () => "platform-worker-run-1",
    getStatusSnapshot: () => ({ status: "running" }),
    subscribeToEvents: vi.fn(() => () => undefined),
    postUserMessage: vi.fn(async () => ({ accepted: true as const })),
    interrupt: vi.fn(async () => ({ accepted: true as const })),
  };
  (handle as unknown as { agentRun: typeof run }).agentRun = run;
  return run;
};

describe("MixedAgentMemberHandle termination", () => {
  it("treats an absent local run as a benign root-shutdown interrupt without restoring it", async () => {
    const agentRunManager = {
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
      prepareNewAgentRun: vi.fn(),
    };
    const { handle } = buildHandle({
      platformAgentRunId: "platform-worker-run-1",
      agentRunManager,
    });

    await expect(handle.interruptForRootTermination()).resolves.toEqual({ accepted: true });

    expect(agentRunManager.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();
  });

  it("translates only NO_ACTIVE_TURN to a benign root-shutdown interrupt", async () => {
    const { handle } = buildHandle({ agentRunManager: {} });
    const run = attachRun(handle);
    run.interrupt
      .mockResolvedValueOnce({ accepted: false, code: "NO_ACTIVE_TURN" })
      .mockResolvedValueOnce({
        accepted: false,
        code: "INTERRUPT_REJECTED",
        message: "provider rejected",
      });

    await expect(handle.interruptForRootTermination()).resolves.toEqual({ accepted: true });
    await expect(handle.interruptForRootTermination()).resolves.toEqual({
      accepted: false,
      code: "INTERRUPT_REJECTED",
      message: "provider rejected",
    });
  });

  it("does not restore platform state solely to terminate an absent local run", async () => {
    const agentRunManager = {
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
      prepareNewAgentRun: vi.fn(),
      prepareAgentRunTermination: vi.fn(),
    };
    const { handle } = buildHandle({
      platformAgentRunId: "platform-worker-run-1",
      agentRunManager,
    });

    await expect(handle.terminate()).resolves.toEqual({ accepted: true });

    expect(agentRunManager.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(agentRunManager.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(agentRunManager.prepareAgentRunTermination).not.toHaveBeenCalled();
    expect(handle.isActive()).toBe(false);
  });

  it("delegates cancellation to the manager-owned exact-run preparation", async () => {
    const cancel = vi.fn();
    const prepareAgentRunTermination = vi.fn(async () => ({
      cancel,
      commit: vi.fn(),
    }));
    const { handle } = buildHandle({
      agentRunManager: { prepareAgentRunTermination },
    });
    const run = attachRun(handle);

    const prepared = await handle.prepareTermination();
    prepared.cancel();

    expect(prepareAgentRunTermination).toHaveBeenCalledWith(run);
    expect(cancel).toHaveBeenCalledOnce();
    expect(handle.isActive()).toBe(true);
  });

  it("keeps the exact run attached after rejection and disposes only after managed acceptance", async () => {
    const rejected = {
      accepted: false as const,
      code: "TERMINATION_REJECTED",
      message: "still busy",
    };
    const finish = vi.fn()
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce({ accepted: true as const });
    const commit = vi.fn(() => ({ finish }));
    const prepareAgentRunTermination = vi.fn(async () => ({
      cancel: vi.fn(),
      commit,
    }));
    const { handle } = buildHandle({
      agentRunManager: { prepareAgentRunTermination },
    });
    const run = attachRun(handle);
    const prepared = await handle.prepareTermination();
    const committed = prepared.commit();

    await expect(committed.finish()).resolves.toEqual(rejected);
    expect(handle.isActive()).toBe(true);
    expect(prepareAgentRunTermination).toHaveBeenCalledWith(run);
    await expect(committed.finish()).resolves.toEqual({ accepted: true });

    expect(commit).toHaveBeenCalledOnce();
    expect(handle.isActive()).toBe(false);
  });

  it("keeps the exact run attached when managed cleanup fails", async () => {
    const cleanup = new Error("published run cleanup failed");
    const prepareAgentRunTermination = vi.fn(async () => ({
      cancel: vi.fn(),
      commit: () => ({ finish: vi.fn(async () => { throw cleanup; }) }),
    }));
    const { handle } = buildHandle({
      agentRunManager: { prepareAgentRunTermination },
    });
    const run = attachRun(handle);

    await expect(handle.terminate()).rejects.toBe(cleanup);

    expect(prepareAgentRunTermination).toHaveBeenCalledWith(run);
    expect(handle.isActive()).toBe(true);
  });
});
