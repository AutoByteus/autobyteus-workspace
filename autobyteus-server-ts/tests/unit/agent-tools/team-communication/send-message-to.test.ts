import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { createBoundAutoByteusSendMessageToTool } from "../../../../src/agent-tools/team-communication/send-message-to.js";
import { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext, type RuntimeTeamRunContext } from "../../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunConfig } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  TeamRunEventSourceType,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import type { TeamRunBackend } from "../../../../src/agent-team-execution/backends/team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { MixedTeamManager } from "../../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { getMixedTaskAgentHandleRecoveryCache } from "../../../../src/agent-team-execution/backends/mixed/members/mixed-task-agent-handle-recovery-cache.js";
import type { MixedTeamMemberHandle } from "../../../../src/agent-team-execution/backends/mixed/members/mixed-team-member-handle.js";
import type {
  InterAgentMessageDeliveryIntent,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  disposeTaskAgentDirectory,
  getTaskAgentDirectory,
} from "../../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "server-owned-send-message-team-1";

const createAgentMember = (input: {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
}) => new MixedAgentMemberContext({
  memberName: input.memberName,
  memberPath: [input.memberRouteKey],
  memberRouteKey: input.memberRouteKey,
  memberRunId: input.memberRunId,
  runtimeKind: input.runtimeKind,
  platformAgentRunId: null,
});

const professorContext = createAgentMember({
  memberName: "Professor",
  memberRouteKey: "professor",
  memberRunId: "team-1::professor",
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});

const writerContext = createAgentMember({
  memberName: "Writer",
  memberRouteKey: "writer",
  memberRunId: "team-1::writer",
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const createTeamRunConfig = () => new TeamRunConfig({
  teamDefinitionId: "server-owned-send-message-team-def",
  teamBackendKind: TeamBackendKind.MIXED,
  coordinatorMemberRouteKey: professorContext.memberRouteKey,
  memberTree: [
    {
      memberKind: "agent",
      memberName: professorContext.memberName,
      memberPath: professorContext.memberPath,
      memberRouteKey: professorContext.memberRouteKey,
      memberRunId: professorContext.memberRunId,
      agentDefinitionId: "agent-professor",
      llmModelIdentifier: "qwen-test",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: professorContext.runtimeKind,
    },
    {
      memberKind: "agent",
      memberName: writerContext.memberName,
      memberPath: writerContext.memberPath,
      memberRouteKey: writerContext.memberRouteKey,
      memberRunId: writerContext.memberRunId,
      agentDefinitionId: "agent-writer",
      llmModelIdentifier: "codex-test",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: writerContext.runtimeKind,
    },
  ],
});

const createTeamRun = (options: { agentRunManager?: unknown } = {}) => {
  const context = new TeamRunContext({
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: professorContext.memberRouteKey,
    config: createTeamRunConfig(),
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: professorContext.memberRouteKey,
      memberContexts: [professorContext, writerContext],
    }),
  });
  const manager = new MixedTeamManager(
    context,
    options.agentRunManager ? { agentRunManager: options.agentRunManager as never } : {},
  );
  const backend: TeamRunBackend = {
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    getRuntimeContext: () => context.runtimeContext,
    isActive: () => manager.hasActiveMembers(),
    getStatusSnapshot: () => manager.getStatusSnapshot(),
    getMemberStatusSnapshots: () => manager.getMemberStatusSnapshots(),
    subscribeToEvents: (listener) => manager.subscribeToEvents(listener),
    postMessage: (message, target, targetMemberRunId) => manager.postMessage(
      message,
      target ?? { kind: "route_key", memberRouteKey: professorContext.memberRouteKey },
      targetMemberRunId,
    ),
    deliverInterAgentMessage: (request) => manager.deliverInterAgentMessage(request),
    approveToolInvocation: (target, invocationId, approved, reason, targetMemberRunId) =>
      manager.approveToolInvocation(target, invocationId, approved, reason, targetMemberRunId),
    interruptMember: (targetMemberRouteKey, targetMemberRunId) =>
      manager.interruptMember(targetMemberRouteKey, targetMemberRunId),
    settleMember: (targetMemberRouteKey, targetMemberRunId, reason) =>
      manager.settleMember(targetMemberRouteKey, targetMemberRunId, reason),
    startTaskAgentInstance: (request) => manager.startTaskAgentInstance(request),
    settleTaskAgentInstance: (logicalMemberRouteKey, taskAgentRunId, reason) =>
      manager.settleTaskAgentInstance(logicalMemberRouteKey, taskAgentRunId, reason),
    terminate: () => manager.terminate(),
    publishEvent: (event) => manager.publishEvent(event),
  };
  return {
    context,
    manager,
    teamRun: new TeamRun({
      context: context as TeamRunContext<RuntimeTeamRunContext>,
      backend,
    }),
  };
};

const attachRecipientHandle = (manager: MixedTeamManager, accepted = true) => {
  const deliverInterMemberMessage = vi.fn(async (_request: ResolvedInterAgentMessageDeliveryRequest, beforeCommit?: (() => void) | null) => {
    if (accepted) {
      beforeCommit?.();
      return { accepted: true };
    }
    return { accepted: false, code: "RECIPIENT_REJECTED", message: "Recipient rejected input." };
  });
  const handle: MixedTeamMemberHandle = {
    context: writerContext,
    isActive: () => true,
    getStatusSnapshot: () => ({ status: "running", can_interrupt: true }),
    postMessage: vi.fn(async (_message: AgentInputUserMessage) => ({ accepted: true })),
    deliverInterMemberMessage,
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interrupt: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => ({ accepted: true })),
    dispose: vi.fn(),
  };
  const mixed = manager as unknown as {
    memberRegistry: { handles: Map<string, MixedTeamMemberHandle> };
  };
  mixed.memberRegistry.handles.set(writerContext.memberRouteKey, handle);
  return { handle, deliverInterMemberMessage };
};

const buildTaskAgentIdentity = (taskAgentRunId: string) => {
  const taskId = taskAgentRunId.split("__").at(-1) ?? "task_0001";
  return {
    taskAgentInstanceId: `task_agent_${taskId}`,
    taskAgentRunId,
    teamRunId,
    taskId,
    logicalMember: {
      memberName: writerContext.memberName,
      memberPath: [...writerContext.memberPath],
      memberRouteKey: writerContext.memberRouteKey,
      templateMemberRunId: writerContext.memberRunId,
      runtimeKind: writerContext.runtimeKind,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
};

const registerActiveTaskAgentRun = (taskAgentRunId: string): string => {
  const identity = buildTaskAgentIdentity(taskAgentRunId);
  const directory = getTaskAgentDirectory(teamRunId);
  const entry = directory.registerStartingTask({
    taskId: identity.taskId,
    logicalMember: {
      memberName: writerContext.memberName,
      memberPath: [...writerContext.memberPath],
      memberRouteKey: writerContext.memberRouteKey,
      memberRunId: writerContext.memberRunId,
      runtimeKind: writerContext.runtimeKind,
    },
    delegator: {
      memberName: professorContext.memberName,
      memberPath: [...professorContext.memberPath],
      memberRouteKey: professorContext.memberRouteKey,
      memberRunId: professorContext.memberRunId,
      runtimeKind: professorContext.runtimeKind,
    },
    taskAgentInstance: identity,
    delegatorReplyRecipientName: professorContext.memberName,
  });
  directory.markActive(identity.taskId);
  return entry.taskAgentInstance.taskAgentRunId;
};

const attachTaskAgentHandle = (manager: MixedTeamManager, taskAgentRunId: string) => {
  const deliverInterMemberMessage = vi.fn(async (_request: ResolvedInterAgentMessageDeliveryRequest, beforeCommit?: (() => void) | null) => {
    beforeCommit?.();
    return { accepted: true, memberRunId: taskAgentRunId, memberName: writerContext.memberName };
  });
  const handle: MixedTeamMemberHandle = {
    context: createAgentMember({
      memberName: writerContext.memberName,
      memberRouteKey: writerContext.memberRouteKey,
      memberRunId: taskAgentRunId,
      runtimeKind: writerContext.runtimeKind,
    }),
    isActive: () => true,
    getStatusSnapshot: () => ({ status: "idle", can_interrupt: false, [["task", "agent", "run", "id"].join("_")]: taskAgentRunId }),
    postMessage: vi.fn(async () => ({ accepted: true })),
    deliverInterMemberMessage,
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interrupt: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => ({ accepted: true })),
    dispose: vi.fn(),
  };
  const mixed = manager as unknown as {
    memberRegistry: { taskAgentHandles: Map<string, MixedTeamMemberHandle> };
  };
  mixed.memberRegistry.taskAgentHandles.set(taskAgentRunId, handle);
  return { handle, deliverInterMemberMessage };
};

const createRecoverableTaskAgentRun = (
  taskAgentRunId: string,
  input: { active?: boolean; postError?: Error } = {},
) => {
  const identity = buildTaskAgentIdentity(taskAgentRunId);
  const postUserMessage = vi.fn(async (_message: AgentInputUserMessage) => {
    if (input.postError) {
      throw input.postError;
    }
    return {
      accepted: true,
      memberRunId: taskAgentRunId,
      memberName: writerContext.memberName,
    };
  });
  const approveToolInvocation = vi.fn(async () => ({ accepted: true }));
  const terminate = vi.fn(async () => ({ accepted: true }));
  return {
    runId: taskAgentRunId,
    config: {
      memberTeamContext: {
        teamRunId,
        memberRouteKey: identity.logicalMember.memberRouteKey,
        memberRunId: taskAgentRunId,
        taskAgentInstance: identity,
      },
    },
    isActive: vi.fn(() => input.active ?? true),
    getPlatformAgentRunId: () => `platform-${taskAgentRunId}`,
    getStatusSnapshot: () => ({ status: "idle", can_interrupt: false }),
    subscribeToEvents: vi.fn(() => () => undefined),
    postUserMessage,
    approveToolInvocation,
    terminate,
  };
};

const createAgentRunManager = (taskAgentRunId: string, run: unknown) => ({
  getActiveRun: vi.fn((candidateRunId: string) => (candidateRunId === taskAgentRunId ? run : null)),
});

const createTaskAgentStartingRunManager = (taskAgentRunId: string, run: unknown) => ({
  createAgentRun: vi.fn(async (_config: unknown, candidateRunId: string) => {
    expect(candidateRunId).toBe(taskAgentRunId);
    return run;
  }),
  getActiveRun: vi.fn(() => null),
});

const createMemberTeamContext = (
  deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<{ accepted: boolean; message?: string }>,
) => new MemberTeamContext({
  teamRunId,
  teamDefinitionId: "server-owned-send-message-team-def",
  teamName: "Server Owned Send Message Team",
  teamBackendKind: TeamBackendKind.MIXED,
  memberName: professorContext.memberName,
  memberPath: professorContext.memberPath,
  memberRouteKey: professorContext.memberRouteKey,
  memberRunId: professorContext.memberRunId,
  coordinatorMemberRouteKey: professorContext.memberRouteKey,
  members: [
    {
      memberKind: "agent",
      memberName: professorContext.memberName,
      memberPath: professorContext.memberPath,
      memberRouteKey: professorContext.memberRouteKey,
      memberRunId: professorContext.memberRunId,
      runtimeKind: professorContext.runtimeKind,
      role: "lead",
      description: "Coordinates the team.",
      address: { teamRunId, memberPath: professorContext.memberPath, memberRouteKey: professorContext.memberRouteKey },
    },
    {
      memberKind: "agent",
      memberName: writerContext.memberName,
      memberPath: writerContext.memberPath,
      memberRouteKey: writerContext.memberRouteKey,
      memberRunId: writerContext.memberRunId,
      runtimeKind: writerContext.runtimeKind,
      role: "writer",
      description: "Drafts the handoff.",
      address: { teamRunId, memberPath: writerContext.memberPath, memberRouteKey: writerContext.memberRouteKey },
    },
  ],
  communicationRecipients: [
    {
      recipientName: writerContext.memberName,
      scope: "local_agent",
      participant: {
        memberKind: "agent",
        memberName: writerContext.memberName,
        memberPath: writerContext.memberPath,
        memberRouteKey: writerContext.memberRouteKey,
        memberRunId: writerContext.memberRunId,
        address: { teamRunId, memberPath: writerContext.memberPath, memberRouteKey: writerContext.memberRouteKey },
        platformRunId: null,
        teamDefinitionId: null,
        representedSubTeam: null,
      },
      delivery: { teamRunId, selector: { kind: "route_key", memberRouteKey: writerContext.memberRouteKey } },
      role: "writer",
      description: "Drafts the handoff.",
    },
  ],
  allowedRecipientNames: [writerContext.memberName],
  sendMessageToEnabled: true,
  deliverInterAgentMessage,
});

const communicationEvents = (events: TeamRunEvent[]): TeamRunCommunicationEventPayload[] =>
  events
    .filter((event) => event.eventSourceType === TeamRunEventSourceType.COMMUNICATION)
    .map((event) => event.data as TeamRunCommunicationEventPayload);

describe("AutoByteus server-owned send_message_to", () => {
  beforeEach(() => {
    getMixedTaskAgentHandleRecoveryCache().forgetTeam(teamRunId);
    disposeTaskAgentDirectory(teamRunId);
  });

  it("commits Team Communication projection only after static recipient accepts input", async () => {
    const { manager, teamRun } = createTeamRun();
    const { deliverInterMemberMessage } = attachRecipientHandle(manager);
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      recipient_name: "Writer",
      content: "Please review the implementation handoff.",
      message_type: "handoff",
      reference_files: ["/tmp/server-owned-reference.md"],
    });
    unsubscribe();

    expect(result).toBe("Delivered message to Writer.");
    const payloads = communicationEvents(events);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(expect.objectContaining({
      teamRunId,
      content: "Please review the implementation handoff.",
      messageType: "handoff",
      receiver: expect.objectContaining({ memberName: "Writer", memberRunId: writerContext.memberRunId }),
      referenceFiles: [expect.objectContaining({ path: "/tmp/server-owned-reference.md" })],
    }));
    expect(deliverInterMemberMessage).toHaveBeenCalledTimes(1);
    const deliveredRequest = deliverInterMemberMessage.mock.calls[0]?.[0] as ResolvedInterAgentMessageDeliveryRequest;
    expect(deliveredRequest.parentCommunicationMessageId).toBe(payloads[0]!.messageId);
    expect(deliveredRequest.recipientInputMessageId).toEqual(expect.any(String));
  });

  it("does not publish Team Communication when recipient rejects before input acceptance", async () => {
    const { manager, teamRun } = createTeamRun();
    attachRecipientHandle(manager, false);
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      recipient_name: "Writer",
      content: "This should not commit.",
    });
    unsubscribe();

    expect(result).toBe("Error: Recipient rejected input.");
    expect(communicationEvents(events)).toEqual([]);
  });

  it("rejects route-key recipient_name aliases when visible roster name differs", async () => {
    const { manager, teamRun } = createTeamRun();
    const { deliverInterMemberMessage } = attachRecipientHandle(manager);
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      recipient_name: writerContext.memberRouteKey,
      content: "Route keys must not be accepted as recipient_name.",
    });
    unsubscribe();

    expect(result).toContain("Message target 'writer' was not found");
    expect(deliverInterMemberMessage).not.toHaveBeenCalled();
    expect(communicationEvents(events)).toEqual([]);
  });

  it("delivers to a reachable normal member exact run target", async () => {
    const { manager, teamRun } = createTeamRun();
    const { deliverInterMemberMessage } = attachRecipientHandle(manager);
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      target_agent_run_id: writerContext.memberRunId,
      content: "Please confirm receipt on your concrete run.",
      message_type: "direct_run_message",
    });
    unsubscribe();

    expect(result).toBe(`Delivered message to ${writerContext.memberRunId}.`);
    const payloads = communicationEvents(events);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(expect.objectContaining({
      content: "Please confirm receipt on your concrete run.",
      receiver: expect.objectContaining({
        memberName: "Writer",
        memberRunId: writerContext.memberRunId,
      }),
    }));
    const deliveredRequest = deliverInterMemberMessage.mock.calls[0]?.[0] as ResolvedInterAgentMessageDeliveryRequest;
    expect(deliveredRequest.target).toEqual({
      kind: "target_agent_run_id",
      targetAgentRunId: writerContext.memberRunId,
    });
    expect(deliveredRequest.resolvedTargetKind).toBe("agent_run");
  });

  it("delivers to active task-agent exact run targets without task-specific selector fields", async () => {
    const taskAgentRunId = `${teamRunId}__writer__task_0001`;
    registerActiveTaskAgentRun(taskAgentRunId);
    const { manager, teamRun } = createTeamRun();
    const { deliverInterMemberMessage } = attachTaskAgentHandle(manager, taskAgentRunId);
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      target_agent_run_id: taskAgentRunId,
      content: "Please revise the delegated task output.",
      message_type: "task_feedback",
    });
    unsubscribe();

    expect(result).toBe(`Delivered message to ${taskAgentRunId}.`);
    const payloads = communicationEvents(events);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(expect.objectContaining({
      content: "Please revise the delegated task output.",
      messageType: "task_feedback",
      receiver: expect.objectContaining({
        memberName: "Writer",
        memberRunId: taskAgentRunId,
        memberRouteKey: writerContext.memberRouteKey,
      }),
    }));
    const deliveredRequest = deliverInterMemberMessage.mock.calls[0]?.[0] as ResolvedInterAgentMessageDeliveryRequest;
    expect(deliveredRequest.target).toEqual({ kind: "target_agent_run_id", targetAgentRunId: taskAgentRunId });
    expect(JSON.stringify(deliveredRequest)).not.toContain(["task", "agent", "run", "id"].join("_"));
  });

  it("delivers to recoverable task-agent exact run targets when the directory active entry is missing", async () => {
    const taskAgentRunId = `${teamRunId}__writer__task_0007`;
    const fakeRun = createRecoverableTaskAgentRun(taskAgentRunId);
    const agentRunManager = createTaskAgentStartingRunManager(taskAgentRunId, fakeRun);
    const { manager, teamRun } = createTeamRun({ agentRunManager });

    await expect(manager.startTaskAgentInstance({
      identity: buildTaskAgentIdentity(taskAgentRunId),
      message: new AgentInputUserMessage("Initial delegated task packet."),
    })).resolves.toEqual(expect.objectContaining({ accepted: true }));
    const mixed = manager as unknown as { memberRegistry: { taskAgentHandles: Map<string, unknown> } };
    mixed.memberRegistry.taskAgentHandles.clear();

    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      target_agent_run_id: taskAgentRunId,
      content: "Please revise the delegated task through the recoverable exact run.",
      message_type: "task_revision_feedback",
    });
    unsubscribe();

    expect(result).toBe(`Delivered message to ${taskAgentRunId}.`);
    const payloads = communicationEvents(events);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(expect.objectContaining({
      content: "Please revise the delegated task through the recoverable exact run.",
      messageType: "task_revision_feedback",
      receiver: expect.objectContaining({
        memberName: "Writer",
        memberRunId: taskAgentRunId,
        memberRouteKey: writerContext.memberRouteKey,
      }),
    }));
    expect(fakeRun.postUserMessage).toHaveBeenCalledTimes(2);
    const feedbackMessage = fakeRun.postUserMessage.mock.calls[1]?.[0] as AgentInputUserMessage;
    expect(feedbackMessage.content).toContain("Please revise the delegated task through the recoverable exact run.");
  });

  it("rejects settled task-agent exact run targets even when a recoverable handle remains", async () => {
    const taskAgentRunId = `${teamRunId}__writer__task_0008`;
    const fakeRun = createRecoverableTaskAgentRun(taskAgentRunId);
    const agentRunManager = createTaskAgentStartingRunManager(taskAgentRunId, fakeRun);
    const { manager, teamRun } = createTeamRun({ agentRunManager });

    await expect(manager.startTaskAgentInstance({
      identity: buildTaskAgentIdentity(taskAgentRunId),
      message: new AgentInputUserMessage("Initial delegated task packet."),
    })).resolves.toEqual(expect.objectContaining({ accepted: true }));
    registerActiveTaskAgentRun(taskAgentRunId);
    getTaskAgentDirectory(teamRunId).markSettledByTaskAgentRunId(taskAgentRunId);

    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      target_agent_run_id: taskAgentRunId,
      content: "This settled task-agent target must not receive feedback.",
      message_type: "task_revision_feedback",
    });
    unsubscribe();

    expect(result).toContain(`Message target '${taskAgentRunId}' was not found or is no longer reachable in this team run.`);
    expect(communicationEvents(events)).toEqual([]);
    expect(fakeRun.postUserMessage).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown or settled exact run targets without publishing communication", async () => {
    const { teamRun } = createTeamRun();
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    const result = await tool.execute({}, {
      target_agent_run_id: "external-run-not-in-team",
      content: "This target is gone.",
    });
    unsubscribe();

    expect(result).toContain("Error: Message target 'external-run-not-in-team' was not found or is no longer reachable in this team run.");
    expect(communicationEvents(events)).toEqual([]);
  });

  it("rejects missing or ambiguous target selectors before delivery projection", async () => {
    const { teamRun } = createTeamRun();
    const events: TeamRunEvent[] = [];
    const unsubscribe = teamRun.subscribeToEvents((event) => events.push(event));
    const tool = createBoundAutoByteusSendMessageToTool(
      createMemberTeamContext((request) => teamRun.deliverInterAgentMessage(request)),
    );

    await expect(tool.execute({}, { content: "missing target" })).resolves.toContain(
      "requires exactly one target selector",
    );
    await expect(tool.execute({}, {
      recipient_name: "Writer",
      target_agent_run_id: writerContext.memberRunId,
      content: "ambiguous target",
    })).resolves.toContain("not both");
    unsubscribe();

    expect(communicationEvents(events)).toEqual([]);
  });

  it("recovers active task-agent handles for lifecycle settlement and approval", async () => {
    const taskAgentRunId = `${teamRunId}__writer__task_0003`;
    const fakeRun = createRecoverableTaskAgentRun(taskAgentRunId);
    const agentRunManager = createAgentRunManager(taskAgentRunId, fakeRun);
    const { manager } = createTeamRun({ agentRunManager });

    await expect(manager.settleTaskAgentInstance(writerContext.memberRouteKey, taskAgentRunId))
      .resolves.toEqual(expect.objectContaining({ accepted: true }));
    expect(agentRunManager.getActiveRun).toHaveBeenCalledWith(taskAgentRunId);
    expect(fakeRun.terminate).toHaveBeenCalledTimes(1);

    const approvalRunId = `${teamRunId}__writer__task_0004`;
    const approvalRun = createRecoverableTaskAgentRun(approvalRunId);
    const approvalManager = createAgentRunManager(approvalRunId, approvalRun);
    const { manager: managerForApproval } = createTeamRun({ agentRunManager: approvalManager });
    await expect(managerForApproval.approveToolInvocation(
      { kind: "route_key", memberRouteKey: writerContext.memberRouteKey },
      "tool-invocation-1",
      true,
      "approved by delegator",
      approvalRunId,
    )).resolves.toEqual(expect.objectContaining({ accepted: true }));
    expect(approvalRun.approveToolInvocation).toHaveBeenCalledWith("tool-invocation-1", true, "approved by delegator");
  });

  it("terminates and forgets remembered task-agent handles when the local map is missing", async () => {
    const taskAgentRunId = `${teamRunId}__writer__task_0005`;
    const fakeRun = createRecoverableTaskAgentRun(taskAgentRunId);
    const agentRunManager = createTaskAgentStartingRunManager(taskAgentRunId, fakeRun);
    const { manager } = createTeamRun({ agentRunManager });

    const startResult = await manager.startTaskAgentInstance({
      identity: buildTaskAgentIdentity(taskAgentRunId),
      message: new AgentInputUserMessage("Initial delegated task packet."),
    });
    expect(startResult).toEqual(expect.objectContaining({ accepted: true }));
    expect(getMixedTaskAgentHandleRecoveryCache().has(teamRunId, taskAgentRunId)).toBe(true);

    const mixed = manager as unknown as { memberRegistry: { taskAgentHandles: Map<string, unknown> } };
    mixed.memberRegistry.taskAgentHandles.clear();

    await expect(manager.terminate()).resolves.toEqual(expect.objectContaining({ accepted: true }));
    expect(fakeRun.terminate).toHaveBeenCalledTimes(1);
    expect(getMixedTaskAgentHandleRecoveryCache().has(teamRunId, taskAgentRunId)).toBe(false);
  });

  it("cleans up task-agent handles and recoverable records when initial task-agent post throws", async () => {
    const taskAgentRunId = `${teamRunId}__writer__task_0006`;
    const fakeRun = createRecoverableTaskAgentRun(taskAgentRunId, {
      postError: new Error("task-agent initial post failed"),
    });
    const agentRunManager = createTaskAgentStartingRunManager(taskAgentRunId, fakeRun);
    const { manager } = createTeamRun({ agentRunManager });
    const mixed = manager as unknown as {
      memberRegistry: { taskAgentHandles: Map<string, unknown> };
    };

    await expect(manager.startTaskAgentInstance({
      identity: buildTaskAgentIdentity(taskAgentRunId),
      message: new AgentInputUserMessage("Initial delegated task packet."),
    })).rejects.toThrow("task-agent initial post failed");

    expect(fakeRun.terminate).toHaveBeenCalledTimes(1);
    expect(mixed.memberRegistry.taskAgentHandles.has(taskAgentRunId)).toBe(false);
    expect(getMixedTaskAgentHandleRecoveryCache().has(teamRunId, taskAgentRunId)).toBe(false);
  });
});
