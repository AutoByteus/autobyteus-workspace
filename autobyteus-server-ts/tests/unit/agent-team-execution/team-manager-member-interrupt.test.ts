import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { address, testAgentNode, testMemberTaskRootResolver, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

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
    physicalScope: createRootTeamRunPhysicalScope(teamRunId),
    teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [solutionNode, reviewerNode].map((node) => new MixedAgentMemberContext({
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
  const manager = new MixedTeamManager(context, {
    subTeamRunFactory: { createOrRestore: vi.fn() } as never,
    agentRunManager: { prepareNewAgentRun } as never,
    taskRootResolver: testMemberTaskRootResolver(),
    publish: vi.fn(),
    deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
    acceptPlatformBinding: vi.fn(async () => undefined),
  });
  return { manager, runs, reviewerNode };
};

describe("MixedTeamManager exact direct AgentRun routing", () => {
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
});
