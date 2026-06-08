import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { ServerMessageType } from "../../../src/services/agent-streaming/models.js";
import { convertTeamRunEventToServerMessage } from "../../../src/services/agent-streaming/team-run-event-websocket-message-mapper.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import type { TeamRunBackendFactory } from "../../../src/agent-team-execution/backends/team-run-backend-factory.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { MemberTeamContext, type AgentMemberTeamDescriptor } from "../../../src/agent-team-execution/domain/member-team-context.js";
import type {
  StartTaskAgentInstanceRequest,
  TaskAgentInstanceIdentity,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunTaskDelegationEventPayload,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { selectorToRouteKey, type TeamMemberSelector } from "../../../src/agent-team-execution/domain/team-run-member-identity.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { TaskDelegationRunRegistry } from "../../../src/agent-team-execution/task-delegation/task-delegation-run-registry.js";
import { disposeTaskAgentDirectory } from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import type {
  AcceptTaskResult,
  DelegateTasksResult,
  TaskDelegationContext,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildTaskDelegationToolContextFromMemberTeamContext,
  TaskDelegationToolService,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "task-delegation-codex-run";
const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASKS_TOOL_NAME);
const acceptEntry = getTaskDelegationToolManifestEntry(ACCEPT_TASK_TOOL_NAME);

class ManagedCodexTeamBackend implements TeamRunBackend {
  readonly runId = teamRunId;
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly messages: Array<{ content: string; targetRouteKey: string | null; targetMemberRunId: string | null; metadata: Record<string, unknown> | null }> = [];
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  readonly postMessageResults: Array<{ accepted: boolean; message?: string }> = [];
  readonly taskAgentStartResults: Array<{ accepted: boolean; message?: string }> = [];
  readonly settlementAttempts: Array<{ routeKey: string; requestedRunId: string | null; accepted: boolean; code?: string }> = [];
  readonly taskAgentSettlementAttempts: Array<{ routeKey: string; requestedRunId: string; accepted: boolean; code?: string }> = [];
  readonly settledRouteKeys: string[] = [];
  readonly settledTaskAgentRunIds: string[] = [];
  private readonly listeners = new Set<TeamRunEventListener>();
  private readonly memberRunIds = new Map<string, string>();
  private readonly memberNames = new Map<string, string>();
  private active = true;

  constructor(memberConfigs: readonly TeamMemberRunConfig[]) {
    for (const member of memberConfigs) {
      this.memberRunIds.set(member.memberRouteKey, member.memberRunId ?? `${teamRunId}:${member.memberRouteKey}`);
      this.memberNames.set(member.memberRouteKey, member.memberName);
    }
  }

  getRuntimeContext() {
    return {
      memberContexts: Array.from(this.memberRunIds.entries()).map(([memberRouteKey, memberRunId]) => ({
        memberKind: "agent" as const,
        memberName: this.memberNames.get(memberRouteKey) ?? memberRouteKey,
        memberPath: [memberRouteKey],
        memberRouteKey,
        memberRunId,
        getPlatformAgentRunId: () => null,
      })),
    } as never;
  }

  isActive() { return this.active; }
  getStatusSnapshot() { return { status: "running" as const, source_path: [] }; }
  getMemberStatusSnapshots() { return []; }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  async postMessage(message: AgentInputUserMessage, target?: TeamMemberSelector | null, targetMemberRunId: string | null = null) {
    this.messages.push({
      content: message.content,
      targetRouteKey: target ? selectorToRouteKey(target) : null,
      targetMemberRunId,
      metadata: message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
        ? (message.metadata as Record<string, unknown>)
        : null,
    });
    return this.postMessageResults.shift() ?? { accepted: true };
  }

  async deliverInterAgentMessage() { return { accepted: true }; }
  async approveToolInvocation() { return { accepted: true }; }
  async interruptMember() { return { accepted: true }; }
  async terminate() { this.active = false; return { accepted: true }; }

  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest) {
    this.taskAgentStarts.push(request);
    return this.taskAgentStartResults.shift() ?? { accepted: true };
  }

  async settleTaskAgentInstance(logicalMemberRouteKey: string, taskAgentRunId: string) {
    const taskAgent = this.taskAgentStarts.find(
      (start) => start.identity.taskAgentRunId === taskAgentRunId,
    )?.identity ?? null;
    if (!taskAgent) {
      this.taskAgentSettlementAttempts.push({
        routeKey: logicalMemberRouteKey,
        requestedRunId: taskAgentRunId,
        accepted: false,
        code: "TASK_AGENT_RUN_NOT_FOUND",
      });
      return { accepted: false, code: "TASK_AGENT_RUN_NOT_FOUND" };
    }
    if (taskAgent.logicalMember.memberRouteKey !== logicalMemberRouteKey) {
      this.taskAgentSettlementAttempts.push({
        routeKey: logicalMemberRouteKey,
        requestedRunId: taskAgentRunId,
        accepted: false,
        code: "TASK_AGENT_ROUTE_MISMATCH",
      });
      return { accepted: false, code: "TASK_AGENT_ROUTE_MISMATCH" };
    }
    this.settledTaskAgentRunIds.push(taskAgentRunId);
    this.taskAgentSettlementAttempts.push({
      routeKey: logicalMemberRouteKey,
      requestedRunId: taskAgentRunId,
      accepted: true,
    });
    return { accepted: true, memberRunId: taskAgentRunId, memberName: this.memberNames.get(logicalMemberRouteKey) ?? logicalMemberRouteKey };
  }

  async settleMember(targetMemberRouteKey: string, targetMemberRunId: string | null = null) {
    const currentRunId = this.memberRunIds.get(targetMemberRouteKey) ?? null;
    if (!currentRunId) {
      this.settlementAttempts.push({ routeKey: targetMemberRouteKey, requestedRunId: targetMemberRunId, accepted: false, code: "TARGET_MEMBER_NOT_FOUND" });
      return { accepted: false, code: "TARGET_MEMBER_NOT_FOUND", message: `Team member '${targetMemberRouteKey}' was not found.` };
    }
    if (targetMemberRunId && targetMemberRunId !== currentRunId) {
      this.settlementAttempts.push({ routeKey: targetMemberRouteKey, requestedRunId: targetMemberRunId, accepted: false, code: "TARGET_MEMBER_RUN_MISMATCH" });
      return {
        accepted: false,
        code: "TARGET_MEMBER_RUN_MISMATCH",
        message: `Team member route key '${targetMemberRouteKey}' does not match member run '${targetMemberRunId}'.`,
      };
    }
    this.settledRouteKeys.push(targetMemberRouteKey);
    this.settlementAttempts.push({ routeKey: targetMemberRouteKey, requestedRunId: targetMemberRunId, accepted: true });
    return { accepted: true, memberRunId: currentRunId, memberName: this.memberNames.get(targetMemberRouteKey) ?? targetMemberRouteKey };
  }

  publishEvent(event: TeamRunEvent): void {
    this.publishedEvents.push(event);
    for (const listener of this.listeners) listener(event);
  }
}

const createHarness = async () => {
  disposeTaskAgentDirectory(teamRunId);
  let backend: ManagedCodexTeamBackend | null = null;
  const mixedFactory: TeamRunBackendFactory = {
    createBackend: async (config) => (backend = new ManagedCodexTeamBackend(config.memberConfigs)),
    restoreBackend: async () => { throw new Error("Unexpected restore in task delegation integration test."); },
  };
  const manager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: mixedFactory as never,
    teamCommunicationService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
    runFileChangeService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
  });
  const run = await manager.createTeamRun(new TeamRunConfig({
    teamDefinitionId: "task-delegation-integration-team",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "coordinator",
    memberConfigs: ["coordinator", "worker"].map((memberRouteKey) => ({
      memberName: memberRouteKey,
      memberRouteKey,
      memberRunId: `run-${memberRouteKey}`,
      agentDefinitionId: `agent-${memberRouteKey}`,
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    })),
  }));
  if (!backend) throw new Error("Managed backend was not created.");

  const runRegistry = new TaskDelegationRunRegistry();
  const service = new TaskDelegationToolService({
    teamRunService: { resolveTeamRun: async (id: string) => (id === run.runId ? run : null) } as never,
    runRegistry,
  });
  return {
    backend,
    manager,
    runRegistry,
    service,
    coordinatorContext: buildToolContext(run, "coordinator"),
  };
};

type Harness = Awaited<ReturnType<typeof createHarness>>;

const buildToolContext = (
  run: { runId: string; teamBackendKind: TeamBackendKind; config: TeamRunConfig | null },
  memberRouteKey: string,
  taskAgentInstance: TaskAgentInstanceIdentity | null = null,
): TaskDelegationContext => {
  if (!run.config) throw new Error("Expected team run config.");
  const members = run.config.memberConfigs.map((member): AgentMemberTeamDescriptor => ({
    memberKind: "agent",
    memberName: member.memberName,
    memberPath: [...member.memberPath],
    memberRouteKey: member.memberRouteKey,
    memberRunId: member.memberRunId ?? `${run.runId}:${member.memberRouteKey}`,
    runtimeKind: member.runtimeKind,
    role: null,
    description: null,
    address: { teamRunId: run.runId, memberPath: [...member.memberPath], memberRouteKey: member.memberRouteKey },
  }));
  const caller = members.find((member) => member.memberRouteKey === memberRouteKey);
  if (!caller) throw new Error(`Missing caller '${memberRouteKey}'.`);
  return buildTaskDelegationToolContextFromMemberTeamContext(new MemberTeamContext({
    teamRunId: run.runId,
    teamDefinitionId: run.config.teamDefinitionId,
    teamName: "Task Delegation Integration Team",
    teamBackendKind: run.teamBackendKind,
    memberName: caller.memberName,
    memberPath: caller.memberPath,
    memberRouteKey: caller.memberRouteKey,
    memberRunId: taskAgentInstance?.taskAgentRunId ?? caller.memberRunId,
    coordinatorMemberRouteKey: run.config.coordinatorMemberRouteKey,
    members,
    taskAgentInstance,
  }));
};

const currentRun = (harness: Harness) => {
  const run = harness.manager.getTeamRun(harness.backend.runId);
  if (!run) throw new Error("Expected active team run.");
  return run;
};

const executeDelegateTasks = async (harness: Harness, rawInput: Record<string, unknown>) =>
  (await delegateEntry.execute(harness.service, harness.coordinatorContext, delegateEntry.parseInput(rawInput))) as DelegateTasksResult;

const executeDelegateTasksAsTaskAgent = async (harness: Harness, contextTaskId: string, rawInput: Record<string, unknown>) =>
  (await delegateEntry.execute(
    harness.service,
    buildToolContext(currentRun(harness), "worker", findTaskAgentIdentity(harness.backend, contextTaskId)),
    delegateEntry.parseInput(rawInput),
  )) as DelegateTasksResult;

const executeCoordinatorAcceptance = async (
  harness: Harness,
  taskId: string,
) => (await acceptEntry.execute(
  harness.service,
  harness.coordinatorContext,
  acceptEntry.parseInput({ task_id: taskId }),
)) as AcceptTaskResult;

const executeTaskAgentAcceptance = async (
  harness: Harness,
  contextTaskId: string,
  acceptedTaskId: string,
) => (await acceptEntry.execute(
  harness.service,
  buildToolContext(currentRun(harness), "worker", findTaskAgentIdentity(harness.backend, contextTaskId)),
  acceptEntry.parseInput({ task_id: acceptedTaskId }),
)) as AcceptTaskResult;

const findTaskAgentIdentity = (
  backend: ManagedCodexTeamBackend,
  taskId: string,
): TaskAgentInstanceIdentity => {
  const identity = backend.taskAgentStarts.find(
    (start) => start.identity.taskId === taskId,
  )?.identity;
  if (!identity) {
    throw new Error(`Missing task-agent identity for ${taskId}.`);
  }
  return identity;
};

const taskDelegationEvents = (backend: ManagedCodexTeamBackend, eventType: TeamRunTaskDelegationEventPayload["eventType"]): TeamRunEvent[] =>
  backend.publishedEvents.filter((event) =>
    event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION &&
    (event.data as TeamRunTaskDelegationEventPayload).eventType === eventType,
  );

const publishIdleEvent = (
  backend: ManagedCodexTeamBackend,
  taskId: string,
): void => {
  const identity = findTaskAgentIdentity(backend, taskId);
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: backend.runId,
    sourcePath: identity.logicalMember.memberPath,
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: identity.logicalMember.memberName,
      memberRunId: identity.taskAgentRunId,
      memberPath: identity.logicalMember.memberPath,
      memberRouteKey: identity.logicalMember.memberRouteKey,
      taskAgentInstance: identity,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: identity.taskAgentRunId,
        payload: { status: "idle" },
        statusHint: "IDLE",
      },
    },
  });
};

const websocketMessageFor = (event: TeamRunEvent) =>
  convertTeamRunEventToServerMessage(event, { map: vi.fn() } as unknown as AgentRunEventMessageMapper);

const twoStepDelegationInput = {
  tasks: [
    {
      member_name: "worker",
      description: "Draft a validation note. Done when draft.md content is summarized.",
    },
    {
      member_name: "worker",
      description: "Review the validation note independently. Done when review.md content is summarized.",
    },
  ],
};

describe("task delegation tool lifecycle integration", () => {
  it("runs the server-managed delegate_tasks -> active exact run target -> accept_task -> idle settlement path", async () => {
    const harness = await createHarness();
    const created = await executeDelegateTasks(harness, twoStepDelegationInput);

    expect(created.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", task_id: "task_0001", target_agent_run_id: "task-delegation-codex-run__worker__task_0001", status: "active" }),
      expect.objectContaining({ member_name: "worker", task_id: "task_0002", target_agent_run_id: "task-delegation-codex-run__worker__task_0002", status: "active" }),
    ]);
    expect(created.activationResults).toEqual([
      expect.objectContaining({ accepted: true, memberName: "worker", taskCount: 1, task_id: "task_0001", target_agent_run_id: "task-delegation-codex-run__worker__task_0001" }),
      expect.objectContaining({ accepted: true, memberName: "worker", taskCount: 1, task_id: "task_0002", target_agent_run_id: "task-delegation-codex-run__worker__task_0002" }),
    ]);
    expect(harness.backend.taskAgentStarts[0]).toMatchObject({
      identity: expect.objectContaining({ taskId: "task_0001" }),
      message: expect.objectContaining({
        metadata: expect.objectContaining({ message_type: "task_delegation_work_packet" }),
      }),
    });
    expect(harness.backend.taskAgentStarts[0]?.message.content).toContain("send_message_to");
    expect(harness.backend.taskAgentStarts[0]?.message.content).toContain("task-delegation-codex-run__worker__task_0001");
    expect(harness.backend.taskAgentStarts[0]?.message.content).not.toContain(["mark", "task", "completed"].join("_"));

    const activationSocketMessage = websocketMessageFor(taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")[0]);
    expect(activationSocketMessage.type).toBe(ServerMessageType.TASK_DELEGATION_EVENT);
    expect(activationSocketMessage.payload).toMatchObject({
      event_type: "TASK_DELEGATION_ACTIVATED",
      taskIds: ["task_0001"],
      tasks: [expect.objectContaining({ taskId: "task_0001", status: "active", targetAgentRunId: "task-delegation-codex-run__worker__task_0001" })],
    });

    publishIdleEvent(harness.backend, "task_0001");
    expect(harness.backend.taskAgentSettlementAttempts).toEqual([]);
    await expect(executeCoordinatorAcceptance(harness, "task_0001"))
      .resolves.toMatchObject({ status: "accepted", terminal: true, settlement_requested: true });
    await vi.waitFor(() => {
      expect(harness.backend.taskAgentSettlementAttempts).toEqual([
        expect.objectContaining({
          routeKey: "worker",
          requestedRunId: findTaskAgentIdentity(harness.backend, "task_0001").taskAgentRunId,
          accepted: true,
        }),
      ]);
    });

    await expect(executeCoordinatorAcceptance(harness, "task_0002"))
      .resolves.toMatchObject({ status: "accepted", terminal: true, settlement_requested: true });
    expect(harness.backend.taskAgentSettlementAttempts).toHaveLength(1);
    publishIdleEvent(harness.backend, "task_0002");
    await vi.waitFor(() => {
      expect(harness.backend.taskAgentSettlementAttempts).toEqual([
        expect.objectContaining({ requestedRunId: findTaskAgentIdentity(harness.backend, "task_0001").taskAgentRunId, accepted: true }),
        expect.objectContaining({ requestedRunId: findTaskAgentIdentity(harness.backend, "task_0002").taskAgentRunId, accepted: true }),
      ]);
    });
    expect(harness.backend.settledTaskAgentRunIds).toEqual([
      findTaskAgentIdentity(harness.backend, "task_0001").taskAgentRunId,
      findTaskAgentIdentity(harness.backend, "task_0002").taskAgentRunId,
    ]);
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("lets a task-agent delegate child work and accept the child through tight task-agent identity", async () => {
    const harness = await createHarness();
    await executeDelegateTasks(harness, {
      tasks: [{ member_name: "worker", description: "Parent worker task." }],
    });
    const parentTaskAgent = findTaskAgentIdentity(harness.backend, "task_0001");

    const childCreated = await executeDelegateTasksAsTaskAgent(harness, "task_0001", {
      tasks: [{ member_name: "worker", description: "Child worker task from parent task-agent." }],
    });
    expect(childCreated.createdTasks).toEqual([
      expect.objectContaining({ member_name: "worker", task_id: "task_0002", target_agent_run_id: "task-delegation-codex-run__worker__task_0002", status: "active" }),
    ]);
    expect(harness.backend.taskAgentStarts[1]?.message.content).toContain("Delegator reply target_agent_run_id: task-delegation-codex-run__worker__task_0001");
    expect(harness.backend.taskAgentStarts[1]?.message.content).toContain(parentTaskAgent.taskAgentRunId);

    await expect(executeTaskAgentAcceptance(harness, "task_0001", "task_0002"))
      .resolves.toMatchObject({ status: "accepted", terminal: true, settlement_requested: true });
    const statusPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_STATUS_UPDATED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(statusPayload).toMatchObject({
      taskId: "task_0002",
      status: "accepted",
      targetAgentRunId: "task-delegation-codex-run__worker__task_0002",
      delegator: expect.objectContaining({
        memberRouteKey: "worker",
        taskAgentRunId: parentTaskAgent.taskAgentRunId,
        taskId: "task_0001",
      }),
    });
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("keeps rejected task-agent activations out of active exact-run targets and websocket activation events", async () => {
    const harness = await createHarness();
    harness.backend.taskAgentStartResults.push(
      { accepted: true },
      { accepted: false, message: "worker route rejected task activation" },
    );
    const created = await executeDelegateTasks(harness, twoStepDelegationInput);
    expect(created.createdTasks).toEqual([
      expect.objectContaining({ task_id: "task_0001", status: "active", target_agent_run_id: "task-delegation-codex-run__worker__task_0001" }),
      expect.objectContaining({ task_id: "task_0002", status: "not_started", target_agent_run_id: null }),
    ]);
    expect(created.activationResults).toEqual([
      expect.objectContaining({ accepted: true, memberName: "worker", taskCount: 1, task_id: "task_0001" }),
      expect.objectContaining({ accepted: false, memberName: "worker", taskCount: 1, task_id: "task_0002" }),
    ]);
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_STATUS_UPDATED")).toHaveLength(0);
    await expect(executeCoordinatorAcceptance(harness, "task_0002"))
      .rejects.toMatchObject({ code: "TASK_NOT_ACTIVE" });
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("keeps the model-facing task surface limited to delegation and acceptance tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      DELEGATE_TASKS_TOOL_NAME,
      ACCEPT_TASK_TOOL_NAME,
    ]);
    for (const oldName of ["create_task", "create_tasks", "get_my_tasks", "get_task_plan_status", "assign_task_to"]) {
      expect(TASK_DELEGATION_TOOL_NAME_LIST).not.toContain(oldName);
    }
  });
});
