import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { TeamRunMembership } from "../../../src/agent-team-execution/domain/team-run-membership.js";
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
import { OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { planTeamMembershipChange } from "../../../src/agent-team-execution/membership/team-membership-change.js";

const teamRunId = "team-focused-command-1";
const solutionDesignerAddress = address("/solution_designer");
const codeReviewerAddress = address("/code_reviewer");
const solutionDesignerRunId = "team-1::solution_designer";
const codeReviewerRunId = "team-1::code_reviewer";

const createFakeAgentRun = (runId: string, statusOf: (runId: string) => string = () => "idle") => {
  const listeners = new Set<(event: unknown) => void>();
  return {
    runId,
    bindExecutionAdmissionFence: vi.fn(),
    isActive: () => true,
    getPlatformAgentRunId: () => null,
    getStatusSnapshot: () => ({ status: statusOf(runId) }),
    subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    /** Publishes the run's current status the way a real AgentRun does after each transition. */
    emitStatus: () => listeners.forEach((listener) => listener({
      eventType: "AGENT_STATUS", runId, payload: { status: statusOf(runId) },
    })),
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
    /** Quiet unless its status is running. */
    tryPrepareTerminationIfQuiescent: vi.fn(async () => statusOf(runId) === "running" ? null : {
      cancel: vi.fn(),
      commit: vi.fn(() => ({ finish: vi.fn(async () => ({ accepted: true as const })) })),
    }),
  };
};

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
    membership: new TeamRunMembership({ teamNode: config.rootTeam, handoffs: config.handoffs }),
    runtimeContext: new FlatTeamExecutionContext({ configuredMemberActivationMode: "fresh" }),
  });
  const runs = new Map<string, ReturnType<typeof createFakeAgentRun>>();
  const statuses = new Map<string, string>();
  const prepareNewAgentRun = vi.fn(async ({ config, runId }) => {
    const run = createFakeAgentRun(runId, (id) => statuses.get(id) ?? "idle");
    runs.set(runId, run);
    return {
      runId,
      runtimeKind: config.runtimeKind,
      platformAgentRunId: `platform-${runId}`,
      commitPublication: () => run,
      abort: async () => ({ kind: "aborted" as const }),
    };
  });
  const manager = new FlatTeamExecutionManager(context, { executionFactory: OFFERED_MODEL_EXECUTION_FACTORY,
    agentRunManager: testActivationManager({ newPreparation: prepareNewAgentRun,
      tryPrepareAgentRunTerminationIfQuiescent: (run: ReturnType<typeof createFakeAgentRun>) => run.tryPrepareTerminationIfQuiescent() }) as never,
    memoryLocator: {
      getMemoryDir: (_placement: unknown, agentRunId: string) => `/tmp/team-manager-member-interrupt/${agentRunId}`,
    } as never,
    activityInspector: { inspect: vi.fn(() => ({ kind: "none" })) } as never,
    callbacks: {
      assertExecutionInputAllowed: vi.fn(),
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
  return { manager, runs, statuses, reviewerNode, context, config };
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

    expect(runs.get(codeReviewerRunId)?.postUserMessage).toHaveBeenCalledWith(message,
      // A failed dispatch reaches the member's Team stream as a run ERROR (autobyteus-324 SR-009).
      { lifecycleObserver: expect.any(Function) });
    // autobyteus-285: a post_message's postOptions (restart resume's notice) reach the member's run.
    const notice = new AgentInputUserMessage("restart notice");
    await manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "post_message", message: notice, postOptions: { onlyAsFirstInput: true } });
    expect(runs.get(codeReviewerRunId)?.postUserMessage).toHaveBeenLastCalledWith(notice,
      { onlyAsFirstInput: true, lifecycleObserver: expect.any(Function) });
    expect(runs.get(codeReviewerRunId)?.approveToolInvocation).toHaveBeenCalledWith("inv-1", true, "approved");
    expect(runs.get(codeReviewerRunId)?.interrupt).toHaveBeenCalledOnce();
    expect(runs.has(solutionDesignerRunId)).toBe(false);
  });

  it("DS-004: a removed member mid-turn keeps its own approvals and interrupt, takes no new input, and is stopped and released once quiet", async () => {
    const { manager, runs, statuses, context, config } = createMixedManager();
    await manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "post_message", message: new AgentInputUserMessage("review") });
    statuses.set(codeReviewerRunId, "running");
    const tree = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Team", createdAt: "2026-11-21T00:00:00.000Z" });
    const removed = planTeamMembershipChange(tree, { teamDefinitionId: tree.rootTeam.teamDefinitionId, coordinatorAddress: solutionDesignerAddress,
      members: [{ address: solutionDesignerAddress, agentDefinitionId: tree.rootTeam.members[0]!.agentDefinitionId }], handoffs: [], newMembers: new Map() })!;
    context.membership.replace(removed.tree);
    const released = vi.fn();
    manager.applyMembership([codeReviewerRunId], released);
    await vi.waitFor(() => expect(context.membership.stateOf(codeReviewerRunId)).toBe("leaving"));
    expect(released).not.toHaveBeenCalled();
    await expect(manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "approve_tool", invocationId: "inv-2", approved: false, reason: "no" }))
      .resolves.toEqual({ accepted: true });
    await expect(manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "interrupt" })).resolves.toEqual({ accepted: true });
    expect(runs.get(codeReviewerRunId)?.approveToolInvocation).toHaveBeenCalledWith("inv-2", false, "no");
    expect(manager.getLeafAgentStatusSnapshots().map((snapshot) => snapshot.execution.agentRunId)).toContain(codeReviewerRunId);

    // Its turn ends: its next event retires it.
    statuses.set(codeReviewerRunId, "idle");
    runs.get(codeReviewerRunId)!.emitStatus();
    await vi.waitFor(() => expect(released).toHaveBeenCalledOnce());
    expect(context.membership.stateOf(codeReviewerRunId)).toBeNull();
    expect(runs.get(codeReviewerRunId)!.tryPrepareTerminationIfQuiescent).toHaveBeenCalled();
    await expect(manager.executeDirectAgentCommand(codeReviewerRunId, { kind: "interrupt" })).resolves.toMatchObject({ accepted: false });
    expect(manager.getLeafAgentStatusSnapshots().map((snapshot) => snapshot.execution.agentRunId)).not.toContain(codeReviewerRunId);
  });

  it("DS-004: a removed member that never started is released at once", async () => {
    const { manager, context, config } = createMixedManager();
    const tree = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Team", createdAt: "2026-11-21T00:00:00.000Z" });
    const removed = planTeamMembershipChange(tree, { teamDefinitionId: tree.rootTeam.teamDefinitionId, coordinatorAddress: solutionDesignerAddress,
      members: [{ address: solutionDesignerAddress, agentDefinitionId: tree.rootTeam.members[0]!.agentDefinitionId }], handoffs: [], newMembers: new Map() })!;
    context.membership.replace(removed.tree);
    const released = vi.fn();
    manager.applyMembership([codeReviewerRunId], released);
    await vi.waitFor(() => expect(released).toHaveBeenCalledOnce());
    expect(context.membership.stateOf(codeReviewerRunId)).toBeNull();
  });

  it("rejects an unknown AgentRun ID without falling back to a configured peer", async () => {
    const { manager, runs } = createMixedManager();

    await expect(manager.executeDirectAgentCommand("unknown-task-run", { kind: "interrupt" }))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
    expect(runs.size).toBe(0);
  });
});
