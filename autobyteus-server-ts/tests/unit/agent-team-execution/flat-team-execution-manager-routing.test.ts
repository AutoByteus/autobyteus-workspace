import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { FlatTeamExecutionManager } from "../../../src/agent-team-execution/local/flat-team-execution-manager.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  address,
  testAgentNode,
  testMemberExecutionContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const teamRunId = "team-focused-command-1";
const solutionDesignerAddress = address("/solution_designer");
const codeReviewerAddress = address("/code_reviewer");
const solutionDesignerRunId = "team-1::solution_designer";
const codeReviewerRunId = "team-1::code_reviewer";

const createFakeAgentRun = (runId: string) => ({
  runId,
  isActive: () => true,
  getPlatformAgentRunId: () => null,
  getStatusSnapshot: () => ({ status: "idle" }),
  subscribeToEvents: vi.fn(() => () => undefined),
  postUserMessage: vi.fn(async () => ({ accepted: true as const })),
  reserveUserMessage: vi.fn(async () => ({
    reserved: true as const,
    commit: vi.fn(async () => ({ accepted: true as const })),
    cancel: vi.fn(),
  })),
  approveToolInvocation: vi.fn(async () => ({ accepted: true as const })),
  interrupt: vi.fn(async () => ({ accepted: true as const })),
  prepareTermination: vi.fn(async () => ({
    cancel: vi.fn(),
    commit: vi.fn(() => ({ finish: vi.fn(async () => ({ accepted: true as const })) })),
  })),
});

const createMixedManager = () => {
  const solutionNode = testAgentNode(solutionDesignerAddress, {
    agentRunId: solutionDesignerRunId,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  });
  const reviewerNode = testAgentNode(codeReviewerAddress, {
    agentRunId: codeReviewerRunId,
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  });
  const config = testTeamRunConfig({
    rootTeamRunId: teamRunId,
    coordinatorAddress: solutionDesignerAddress,
    children: [solutionNode, reviewerNode],
  });
  const context = new TeamRunContext({
    physicalScope: createRootExecutionPhysicalScope({
      root: createTeamRootExecutionIdentity(teamRunId),
      ancestorTeamRunIds: [],
    }),
    teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext: new FlatTeamExecutionContext({
      memberContexts: [solutionNode, reviewerNode].map((node) => new FlatAgentExecutionContext({
        address: node.address,
        agentRunId: node.agentRunId,
        runtimeKind: node.runtimeKind,
        platformAgentRunId: null,
      })),
      configuredMemberActivationMode: "fresh",
    }),
  });
  const runs = new Map<string, ReturnType<typeof createFakeAgentRun>>();
  const prepareNewAgentRun = vi.fn(async ({ config, runId }) => {
    const run = createFakeAgentRun(runId);
    runs.set(runId, run);
    return {
      runId,
      runtimeKind: config.runtimeKind,
      platformAgentRunId: `platform-${runId}`,
      commitPublication: () => run,
      abort: async () => ({ kind: "aborted" as const }),
    };
  });
  const manager = new FlatTeamExecutionManager(context, {
    subTeamRunFactory: { createOrRestore: vi.fn() } as never,
    agentRunManager: { prepareNewAgentRun } as never,
    memoryLocator: {
      getLocation: (_scope: unknown, agentRunId: string) => ({
        memoryDir: `/tmp/team-manager-member-interrupt/${agentRunId}`,
      }),
    } as never,
    activityInspector: { inspect: vi.fn(() => ({ kind: "none" })) } as never,
    callbacks: {
      buildMemberExecutionContext: vi.fn(async ({ identity }) => testMemberExecutionContext({
        rootTeamRunId: teamRunId,
        memberAddress: identity.memberAddress,
        agentRunId: identity.agentRunId,
      })),
      publishAgentEvent: vi.fn(),
      commitPlatformBindingChange: vi.fn(async () => undefined),
    },
    workspaceManager: { ensureWorkspaceByRootPath: vi.fn() },
  });
  return { manager, runs, reviewerNode };
};

describe("FlatTeamExecutionManager exact direct AgentRun routing", () => {
  it("routes configured post/approval/interrupt only to the exact AgentRun ID", async () => {
    const { manager, runs } = createMixedManager();
    const message = new AgentInputUserMessage("review this");

    await expect(manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "post_message", message }))
      .resolves.toMatchObject({ accepted: true, agentRunId: codeReviewerRunId });
    await expect(manager.executeDirectAgentCommand(codeReviewerRunId, {
      kind: "approve_tool", invocationId: "inv-1", approved: true, reason: "approved",
    })).resolves.toEqual({ accepted: true });
    await expect(manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "interrupt" }))
      .resolves.toEqual({ accepted: true });

    expect(runs.get(codeReviewerRunId)?.postUserMessage).toHaveBeenCalledWith(message);
    expect(runs.get(codeReviewerRunId)?.approveToolInvocation).toHaveBeenCalledWith("inv-1", true, "approved");
    expect(runs.get(codeReviewerRunId)?.interrupt).toHaveBeenCalledOnce();
    expect(runs.has(solutionDesignerRunId)).toBe(false);
  });

  it("rejects an unknown AgentRun ID without falling back to a configured peer", async () => {
    const { manager, runs } = createMixedManager();

    await expect(manager.executeDirectAgentCommand("unknown-task-run", { kind: "interrupt" }))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    expect(runs.size).toBe(0);
  });

  it("routes a committed task Agent independently from the configured Agent at the same address", async () => {
    const { manager, runs, reviewerNode } = createMixedManager();
    const taskAgentRunId = "task-code-reviewer-run-1";
    const initial = new AgentInputUserMessage("start delegated review");
    const prepared = await manager.prepareTaskAgent({
      taskId: "task-1",
      address: reviewerNode.address,
      agentRunId: taskAgentRunId,
      sourceNode: reviewerNode,
      message: initial,
    });
    prepared.sealForCommit();
    prepared.commitAfterDurability().releaseWork();
    await vi.waitFor(() => expect(runs.get(taskAgentRunId)?.postUserMessage).toHaveBeenCalledWith(initial));

    await expect(manager.executeDirectAgentCommand(taskAgentRunId, { kind: "interrupt" }))
      .resolves.toEqual({ accepted: true });

    expect(runs.get(taskAgentRunId)?.interrupt).toHaveBeenCalledOnce();
    expect(runs.has(codeReviewerRunId)).toBe(false);
  });

  it("cancels recursive task-Team descendants all-or-none when one remains busy", async () => {
    const { manager } = createMixedManager();
    const cancelOrder: string[] = [];
    const prepared = (name: string) => Object.freeze({
      cancel: vi.fn(() => cancelOrder.push(name)),
      commit: vi.fn(() => Object.freeze({
        finish: vi.fn(async () => ({ accepted: true as const })),
      })),
    });
    const firstAttempt = prepared("first-attempt");
    const first = {
      tryPrepareTerminationIfQuiescent: vi.fn()
        .mockResolvedValueOnce(firstAttempt)
        .mockResolvedValueOnce(prepared("first-retry")),
    };
    const second = {
      tryPrepareTerminationIfQuiescent: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(prepared("second-retry")),
    };
    const taskAgents = (manager as never as {
      taskAgents: { listHandles(): readonly unknown[]; listPreparedHandles(): readonly unknown[] };
    }).taskAgents;
    vi.spyOn(taskAgents, "listHandles").mockReturnValue([first, second]);
    vi.spyOn(taskAgents, "listPreparedHandles").mockReturnValue([]);

    await expect(manager.tryPrepareTerminationIfQuiescent()).resolves.toBeNull();
    expect(firstAttempt.cancel).toHaveBeenCalledOnce();
    expect(cancelOrder).toEqual(["first-attempt"]);

    const retry = await manager.tryPrepareTerminationIfQuiescent();
    expect(retry).not.toBeNull();
    retry?.cancel();
    expect(cancelOrder).toEqual(["first-attempt", "second-retry", "first-retry"]);
  });

  it("freezes the complete active, prepared, and recursive task scope once", async () => {
    const { manager } = createMixedManager();
    const fenced: string[] = [];
    const finished: string[] = [];
    const handle = (name: string) => ({
      fenceForRootShutdown: vi.fn(async () => {
        fenced.push(name);
        return { accepted: true as const };
      }),
      terminate: vi.fn(async () => {
        finished.push(name);
        return { accepted: true as const };
      }),
    });
    const childScope = (name: string) => ({
      fenceAgentRunsForRootShutdown: vi.fn(async () => {
        fenced.push(name);
        return { accepted: true as const };
      }),
      finish: vi.fn(async () => {
        finished.push(name);
        return { accepted: true as const };
      }),
    });
    const activeAgent = handle("active-agent");
    const preparedAgent = handle("prepared-agent");
    const activeChild = childScope("active-child");
    const preparedChild = childScope("prepared-child");
    const internals = manager as never as {
      configured: { listHandles(): readonly unknown[] };
      taskAgents: { listHandles(): readonly unknown[]; listPreparedHandles(): readonly unknown[] };
      taskTeams: { listTeamRuns(): readonly unknown[]; listPreparedTeamRuns(): readonly unknown[] };
    };
    vi.spyOn(internals.configured, "listHandles").mockReturnValue([]);
    vi.spyOn(internals.taskAgents, "listHandles").mockReturnValue([activeAgent]);
    vi.spyOn(internals.taskAgents, "listPreparedHandles").mockReturnValue([preparedAgent]);
    vi.spyOn(internals.taskTeams, "listTeamRuns").mockReturnValue([{
      freezeForRootTermination: () => activeChild,
    }]);
    vi.spyOn(internals.taskTeams, "listPreparedTeamRuns").mockReturnValue([{
      freezeForRootTermination: () => preparedChild,
    }]);

    const scope = manager.freezeForRootTermination();
    expect(manager.freezeForRootTermination()).toBe(scope);
    await expect(scope.fenceAgentRunsForRootShutdown()).resolves.toEqual({ accepted: true });
    await expect(scope.finish()).resolves.toEqual({ accepted: true });

    expect(fenced).toEqual([
      "active-agent",
      "prepared-agent",
      "active-child",
      "prepared-child",
    ]);
    expect(finished).toEqual([
      "active-child",
      "prepared-child",
      "prepared-agent",
      "active-agent",
    ]);
  });
});
