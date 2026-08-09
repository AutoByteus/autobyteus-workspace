import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  address,
  testAgentNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const teamRunId = "team-focused-interrupt-1";
const solutionDesignerAddress = address("/solution_designer");
const codeReviewerAddress = address("/code_reviewer");

const memberInputs = [
  {
    address: solutionDesignerAddress,
    agentRunId: "team-1::solution_designer",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  },
  {
    address: codeReviewerAddress,
    agentRunId: "team-1::code_reviewer",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  },
] as const;

const createFakeAgentRun = () => ({
  postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
  approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
  interrupt: vi.fn().mockResolvedValue({ accepted: true }),
  terminate: vi.fn().mockResolvedValue({ accepted: true }),
});

const createMixedManager = () => {
  const config = testTeamRunConfig({
    rootTeamRunId: teamRunId,
    coordinatorAddress: solutionDesignerAddress,
    children: memberInputs.map((member) => testAgentNode(member.address, {
      agentRunId: member.agentRunId,
      runtimeKind: member.runtimeKind,
    })),
  });
  const context = new TeamRunContext({
    teamRunId,
    teamAddress: address("/"),
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: memberInputs.map((member) => new MixedAgentMemberContext({
        address: member.address,
        agentRunId: member.agentRunId,
        runtimeKind: member.runtimeKind,
        platformAgentRunId: null,
      })),
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: teamRunId,
        memberAddress: solutionDesignerAddress,
      }),
    }),
  });
  return { manager: new MixedTeamManager(context), context };
};

const makeHandle = (
  context: MixedAgentMemberContext,
  run: ReturnType<typeof createFakeAgentRun>,
) => ({
  context,
  isActive: () => true,
  getLeafAgentStatusSnapshots: () => [],
  hasOpenExecutionWork: () => true,
  postMessage: vi.fn(async (message: AgentInputUserMessage) => ({
    ...(await run.postUserMessage(message)),
    agentRunId: context.agentRunId,
    displayName: context.address.slice(1),
  })),
  postMessageToAddress: vi.fn(async (message: AgentInputUserMessage) => ({
    ...(await run.postUserMessage(message)),
    agentRunId: context.agentRunId,
    displayName: context.address.slice(1),
  })),
  deliverInterMemberMessage: vi.fn(),
  approveToolInvocation: vi.fn(async (
    _target: unknown,
    invocationId: string,
    approved: boolean,
    reason: string | null,
  ) => run.approveToolInvocation(invocationId, approved, reason)),
  interrupt: vi.fn(async (_target: unknown, targetAgentRunId?: string | null) => {
    if (targetAgentRunId && targetAgentRunId !== context.agentRunId) {
      return {
        accepted: false,
        code: "TARGET_AGENT_RUN_MISMATCH",
        message: `Agent '${context.address}' does not own AgentRun '${targetAgentRunId}'.`,
      };
    }
    return run.interrupt();
  }),
  terminate: vi.fn(async () => ({
    ...(await run.terminate()),
    agentRunId: context.agentRunId,
    displayName: context.address.slice(1),
  })),
  dispose: vi.fn(),
});

const attachMemberRuns = (
  manager: MixedTeamManager,
  context: TeamRunContext<MixedTeamRunContext>,
) => {
  const solutionDesignerRun = createFakeAgentRun();
  const codeReviewerRun = createFakeAgentRun();
  const persistentMembers = (manager as unknown as {
    persistentMembers: { handles: Map<string, unknown> };
  }).persistentMembers;
  const solutionDesignerContext = context.runtimeContext.memberContexts.find(
    (member) => member.address === solutionDesignerAddress,
  ) as MixedAgentMemberContext;
  const codeReviewerContext = context.runtimeContext.memberContexts.find(
    (member) => member.address === codeReviewerAddress,
  ) as MixedAgentMemberContext;
  persistentMembers.handles.set(
    solutionDesignerAddress,
    makeHandle(solutionDesignerContext, solutionDesignerRun),
  );
  persistentMembers.handles.set(
    codeReviewerAddress,
    makeHandle(codeReviewerContext, codeReviewerRun),
  );
  return { solutionDesignerRun, codeReviewerRun, codeReviewerContext };
};

const attachTaskAgentRun = (
  manager: MixedTeamManager,
  logicalContext: MixedAgentMemberContext,
) => {
  const taskAgentRun = createFakeAgentRun();
  const taskAgentRunId = "team-1::code_reviewer::task-agent-1";
  const taskContext = new MixedAgentMemberContext({
    address: logicalContext.address,
    agentRunId: taskAgentRunId,
    runtimeKind: logicalContext.runtimeKind,
    platformAgentRunId: null,
  });
  const taskAgentInstances = (manager as unknown as {
    taskAgentInstances: { handles: Map<string, unknown> };
  }).taskAgentInstances;
  taskAgentInstances.handles.set(
    taskAgentRunId,
    makeHandle(taskContext, taskAgentRun),
  );
  return { taskAgentRun, taskAgentRunId };
};

describe("MixedTeamManager focused member routing", () => {
  it("interrupts only the requested canonical member address", async () => {
    const { manager, context } = createMixedManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager, context);

    await expect(
      manager.interruptMember(codeReviewerAddress, "team-1::code_reviewer"),
    ).resolves.toEqual({ accepted: true });

    expect(codeReviewerRun.interrupt).toHaveBeenCalledTimes(1);
    expect(solutionDesignerRun.interrupt).not.toHaveBeenCalled();
  });

  it("rejects an AgentRun guard mismatch without retargeting by run ID", async () => {
    const { manager, context } = createMixedManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager, context);

    await expect(
      manager.interruptMember(codeReviewerAddress, "team-1::solution_designer"),
    ).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_AGENT_RUN_MISMATCH",
    });

    expect(codeReviewerRun.interrupt).not.toHaveBeenCalled();
    expect(solutionDesignerRun.interrupt).not.toHaveBeenCalled();
  });

  it("settles only the requested canonical member address", async () => {
    const { manager, context } = createMixedManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager, context);

    await expect(
      manager.settleMember(codeReviewerAddress, "team-1::code_reviewer"),
    ).resolves.toMatchObject({
      accepted: true,
      agentRunId: "team-1::code_reviewer",
      displayName: "code_reviewer",
    });

    expect(codeReviewerRun.terminate).toHaveBeenCalledTimes(1);
    expect(solutionDesignerRun.terminate).not.toHaveBeenCalled();
  });

  it("routes approval to the exact task AgentRun at the logical address", async () => {
    const { manager, context } = createMixedManager();
    const { codeReviewerRun, codeReviewerContext } = attachMemberRuns(manager, context);
    const { taskAgentRun, taskAgentRunId } = attachTaskAgentRun(manager, codeReviewerContext);

    await expect(
      manager.approveToolInvocation(
        codeReviewerAddress,
        "inv-task-agent",
        true,
        "approved",
        taskAgentRunId,
      ),
    ).resolves.toEqual({ accepted: true });

    expect(taskAgentRun.approveToolInvocation).toHaveBeenCalledWith(
      "inv-task-agent",
      true,
      "approved",
    );
    expect(codeReviewerRun.approveToolInvocation).not.toHaveBeenCalled();
  });

  it("routes messages to the exact task AgentRun at the logical address", async () => {
    const { manager, context } = createMixedManager();
    const { codeReviewerRun, codeReviewerContext } = attachMemberRuns(manager, context);
    const { taskAgentRun, taskAgentRunId } = attachTaskAgentRun(manager, codeReviewerContext);
    const message = new AgentInputUserMessage("Delegated child task completed.");

    await expect(
      manager.postMessage(message, codeReviewerAddress, taskAgentRunId),
    ).resolves.toMatchObject({
      accepted: true,
      agentRunId: taskAgentRunId,
      displayName: "code_reviewer",
    });

    expect(taskAgentRun.postUserMessage).toHaveBeenCalledWith(message);
    expect(codeReviewerRun.postUserMessage).not.toHaveBeenCalled();
  });
});
