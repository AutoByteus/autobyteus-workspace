import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "team-focused-interrupt-1";

const memberInputs = [
  {
    memberName: "Solution Designer",
    memberPath: ["solution_designer"],
    memberRouteKey: "solution_designer",
    memberRunId: "team-1::solution_designer",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  },
  {
    memberName: "Code Reviewer",
    memberPath: ["code_reviewer"],
    memberRouteKey: "code_reviewer",
    memberRunId: "team-1::code_reviewer",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  },
];

const createTeamRunConfig = () => new TeamRunConfig({
  teamDefinitionId: "team-def-focused-interrupt",
  teamBackendKind: TeamBackendKind.MIXED,
  coordinatorMemberName: "Solution Designer",
  memberConfigs: memberInputs.map((member) => ({
    ...member,
    agentDefinitionId: `agent-${member.memberRouteKey}`,
    llmModelIdentifier:
      member.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "claude-sonnet" : "gpt-5.4-mini",
    autoExecuteTools: false,
    workspaceId: `workspace-${member.memberRouteKey}`,
    skillAccessMode: SkillAccessMode.NONE,
  })),
});

const createFakeAgentRun = () => ({
  isActive: vi.fn(() => true),
  postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
  approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
  interrupt: vi.fn().mockResolvedValue({ accepted: true }),
  terminate: vi.fn().mockResolvedValue({ accepted: true }),
  getStatusSnapshot: vi.fn(() => ({ status: "running" })),
  subscribeToEvents: vi.fn(() => () => undefined),
});

const createMixedManager = () => {
  disposeTaskAgentDirectory(teamRunId);
  const context = new TeamRunContext({
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    config: createTeamRunConfig(),
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "solution_designer",
      collaborationRootTeamRunId: teamRunId,
      teamMountPath: [],
      effectiveHandoffs: [],
      memberContexts: memberInputs.map((member) => new MixedAgentMemberContext({
        memberName: member.memberName,
        memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        runtimeKind: member.runtimeKind,
        platformAgentRunId: null,
      })),
    }),
  });

  return new MixedTeamManager(context);
};

const attachMemberRuns = (manager: MixedTeamManager) => {
  const solutionDesignerRun = createFakeAgentRun();
  const codeReviewerRun = createFakeAgentRun();
  const mixed = manager as unknown as {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    persistentMembers: { handles: Map<string, unknown> };
  };
  const contexts = mixed.teamContext.runtimeContext.memberContexts;
  const makeHandle = (
    context: MixedAgentMemberContext,
    run: ReturnType<typeof createFakeAgentRun>,
  ) => ({
    context,
    isActive: () => true,
    getStatusSnapshot: run.getStatusSnapshot,
    postMessage: vi.fn(async (message: AgentInputUserMessage) => run.postUserMessage(message)),
    deliverInterMemberMessage: vi.fn(),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(async () => run.interrupt()),
    terminate: vi.fn(async () => run.terminate()),
    dispose: vi.fn(),
  });

  const solutionDesignerContext = contexts.find(
    (context) => context.memberRouteKey === "solution_designer",
  ) as MixedAgentMemberContext;
  const codeReviewerContext = contexts.find(
    (context) => context.memberRouteKey === "code_reviewer",
  ) as MixedAgentMemberContext;

  mixed.persistentMembers.handles.set(
    "solution_designer",
    makeHandle(solutionDesignerContext, solutionDesignerRun),
  );
  mixed.persistentMembers.handles.set(
    "code_reviewer",
    makeHandle(codeReviewerContext, codeReviewerRun),
  );

  return { solutionDesignerRun, codeReviewerRun };
};

const attachTaskAgentRun = (manager: MixedTeamManager) => {
  const taskAgentRun = createFakeAgentRun();
  const logicalRouteKey = "code_reviewer";
  const taskAgentRunId = "team-1::code_reviewer::task-agent-1";
  const mixed = manager as unknown as {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    taskAgentInstances: { handles: Map<string, unknown> };
  };
  const logicalContext = mixed.teamContext.runtimeContext.memberContexts.find(
    (context) => context.memberRouteKey === logicalRouteKey,
  ) as MixedAgentMemberContext;
  const identity = {
    taskAgentInstanceId: "task-agent-instance-1",
    taskAgentRunId,
    teamRunId,
    taskId: "task_0001",
    logicalMember: {
      memberName: logicalContext.memberName,
      memberPath: logicalContext.memberPath,
      memberRouteKey: logicalContext.memberRouteKey,
      templateMemberRunId: logicalContext.memberRunId,
      runtimeKind: logicalContext.runtimeKind,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const directory = getTaskAgentDirectory(teamRunId);
  directory.registerStartingTask({
    taskId: identity.taskId,
    logicalMember: {
      memberName: logicalContext.memberName,
      memberPath: logicalContext.memberPath,
      memberRouteKey: logicalContext.memberRouteKey,
      memberRunId: logicalContext.memberRunId,
      runtimeKind: logicalContext.runtimeKind,
    },
    delegator: {
      memberName: "Solution Designer",
      memberPath: ["solution_designer"],
      memberRouteKey: "solution_designer",
      memberRunId: "team-1::solution_designer",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    },
    taskAgentInstance: identity,
    delegatorReplyRecipientName: "solution_designer",
  });
  directory.markActive(identity.taskId);
  mixed.taskAgentInstances.handles.set(taskAgentRunId, {
    context: {
      ...logicalContext,
      memberRunId: taskAgentRunId,
      getPlatformAgentRunId: () => null,
    },
    isActive: () => true,
    getStatusSnapshot: taskAgentRun.getStatusSnapshot,
    postMessage: vi.fn(async (message: AgentInputUserMessage) => ({
      ...(await taskAgentRun.postUserMessage(message)),
      memberRunId: taskAgentRunId,
      memberName: logicalContext.memberName,
    })),
    deliverInterMemberMessage: vi.fn(async (request: ResolvedInterAgentMessageDeliveryRequest, beforeCommit?: (() => void) | null) => {
      const result = await taskAgentRun.postUserMessage(expect.objectContaining({
        content: expect.stringContaining(request.content),
      }) as never);
      if (result.accepted) beforeCommit?.();
      return { ...result, memberRunId: taskAgentRunId, memberName: logicalContext.memberName };
    }),
    approveToolInvocation: vi.fn(async (
      _target: unknown,
      invocationId: string,
      approved: boolean,
      reason: string | null,
    ) => taskAgentRun.approveToolInvocation(invocationId, approved, reason)),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    dispose: vi.fn(),
  });
  return { taskAgentRun, taskAgentRunId, logicalRouteKey };
};

describe("MixedTeamManager focused member routing", () => {
  it("interrupts only the requested member route key", async () => {
    const manager = createMixedManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager);

    await expect(
      manager.interruptMember("code_reviewer", "team-1::code_reviewer"),
    ).resolves.toEqual({ accepted: true });

    expect(codeReviewerRun.interrupt).toHaveBeenCalledTimes(1);
    expect(solutionDesignerRun.interrupt).not.toHaveBeenCalled();
  });

  it("rejects interrupt run-id guard mismatches without retargeting by run id", async () => {
    const manager = createMixedManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager);

    await expect(
      manager.interruptMember("code_reviewer", "team-1::solution_designer"),
    ).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_MEMBER_RUN_MISMATCH",
    });

    expect(codeReviewerRun.interrupt).not.toHaveBeenCalled();
    expect(solutionDesignerRun.interrupt).not.toHaveBeenCalled();
  });

  it("settles only the requested member route key", async () => {
    const manager = createMixedManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager);

    await expect(
      manager.settleMember("code_reviewer", "team-1::code_reviewer"),
    ).resolves.toMatchObject({
      accepted: true,
      memberRunId: "team-1::code_reviewer",
      memberName: "Code Reviewer",
    });

    expect(codeReviewerRun.terminate).toHaveBeenCalledTimes(1);
    expect(solutionDesignerRun.terminate).not.toHaveBeenCalled();
  });

  it("routes approval to the concrete task-agent run instead of the logical member run", async () => {
    const manager = createMixedManager();
    const { codeReviewerRun } = attachMemberRuns(manager);
    const { taskAgentRun, taskAgentRunId, logicalRouteKey } = attachTaskAgentRun(manager);

    await expect(
      manager.approveToolInvocation(
        { kind: "route_key", memberRouteKey: logicalRouteKey },
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

  it("routes messages to the concrete task-agent run instead of the logical member run", async () => {
    const manager = createMixedManager();
    const { codeReviewerRun } = attachMemberRuns(manager);
    const { taskAgentRun, taskAgentRunId, logicalRouteKey } = attachTaskAgentRun(manager);
    const message = new AgentInputUserMessage("Delegated child task completed.");

    await expect(
      manager.postMessage(
        message,
        { kind: "route_key", memberRouteKey: logicalRouteKey },
        taskAgentRunId,
      ),
    ).resolves.toEqual({ accepted: true, memberRunId: taskAgentRunId, memberName: "Code Reviewer" });

    expect(taskAgentRun.postUserMessage).toHaveBeenCalledWith(message);
    expect(codeReviewerRun.postUserMessage).not.toHaveBeenCalled();
  });

});
