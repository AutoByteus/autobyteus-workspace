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
import type {
  DelegateTasksResult,
  TaskDelegationContext,
  UpdateTaskStatusResult,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";
import {
  DELEGATE_TASKS_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
  UPDATE_TASK_STATUS_TOOL_NAME,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildTaskDelegationToolContextFromMemberTeamContext,
  TaskDelegationToolService,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "task-delegation-codex-run";
const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASKS_TOOL_NAME);
const updateEntry = getTaskDelegationToolManifestEntry(UPDATE_TASK_STATUS_TOOL_NAME);

class ManagedCodexTeamBackend implements TeamRunBackend {
  readonly runId = teamRunId;
  readonly teamBackendKind = TeamBackendKind.CODEX_APP_SERVER;
  readonly messages: Array<{ content: string; targetRouteKey: string | null; metadata: Record<string, unknown> | null }> = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  readonly postMessageResults: Array<{ accepted: boolean; message?: string }> = [];
  readonly settlementAttempts: Array<{ routeKey: string; requestedRunId: string | null; accepted: boolean; code?: string }> = [];
  readonly settledRouteKeys: string[] = [];
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

  async postMessage(message: AgentInputUserMessage, target?: TeamMemberSelector | null) {
    this.messages.push({
      content: message.content,
      targetRouteKey: target ? selectorToRouteKey(target) : null,
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

  changeMemberRunId(memberRouteKey: string, nextMemberRunId: string): void {
    this.memberRunIds.set(memberRouteKey, nextMemberRunId);
  }
}

const createHarness = async () => {
  let backend: ManagedCodexTeamBackend | null = null;
  const codexFactory: TeamRunBackendFactory = {
    createBackend: async (config) => (backend = new ManagedCodexTeamBackend(config.memberConfigs)),
    restoreBackend: async () => { throw new Error("Unexpected restore in task delegation integration test."); },
  };
  const unsupportedFactory: TeamRunBackendFactory = {
    createBackend: async () => { throw new Error("Unexpected backend in task delegation integration test."); },
    restoreBackend: async () => { throw new Error("Unexpected restore in task delegation integration test."); },
  };
  const manager = new AgentTeamRunManager({
    autoByteusTeamRunBackendFactory: unsupportedFactory as never,
    codexTeamRunBackendFactory: codexFactory as never,
    claudeTeamRunBackendFactory: unsupportedFactory as never,
    mixedTeamRunBackendFactory: unsupportedFactory as never,
    teamCommunicationService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
    runFileChangeService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
  });
  const run = await manager.createTeamRun(new TeamRunConfig({
    teamDefinitionId: "task-delegation-integration-team",
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
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
    workerContext: buildToolContext(run, "worker"),
  };
};

type Harness = Awaited<ReturnType<typeof createHarness>>;

const buildToolContext = (run: { runId: string; teamBackendKind: TeamBackendKind; config: TeamRunConfig | null }, memberRouteKey: string): TaskDelegationContext => {
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
    memberRunId: caller.memberRunId,
    coordinatorMemberRouteKey: run.config.coordinatorMemberRouteKey,
    members,
  }));
};

const executeDelegateTasks = async (harness: Harness, rawInput: Record<string, unknown>) =>
  (await delegateEntry.execute(harness.service, harness.coordinatorContext, delegateEntry.parseInput(rawInput))) as DelegateTasksResult;

const executeWorkerStatusUpdate = async (harness: Harness, rawInput: Record<string, unknown>) =>
  (await updateEntry.execute(harness.service, harness.workerContext, updateEntry.parseInput(rawInput))) as UpdateTaskStatusResult;

const taskDelegationEvents = (backend: ManagedCodexTeamBackend, eventType: TeamRunTaskDelegationEventPayload["eventType"]): TeamRunEvent[] =>
  backend.publishedEvents.filter((event) =>
    event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION &&
    (event.data as TeamRunTaskDelegationEventPayload).eventType === eventType,
  );

const publishIdleEvent = (backend: ManagedCodexTeamBackend, memberRunId = "run-worker"): void => {
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: backend.runId,
    sourcePath: ["worker"],
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: "worker",
      memberRunId,
      memberPath: ["worker"],
      memberRouteKey: "worker",
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: memberRunId,
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
      task_name: "draft",
      assignee_name: "worker",
      description: "Draft a validation note.",
      dependencies: [],
      completion_criteria: "Draft exists.",
      expected_deliverables: ["draft.md"],
    },
    {
      task_name: "review",
      assignee_name: "worker",
      description: "Review the validation note.",
      dependencies: ["draft"],
      completion_criteria: "Review is complete.",
      expected_deliverables: ["review.md"],
    },
  ],
};

describe("task delegation tool lifecycle integration", () => {
  it("runs the server-managed delegate_tasks -> work packet -> update_task_status -> notification -> idle settlement path", async () => {
    const harness = await createHarness();
    const created = await executeDelegateTasks(harness, twoStepDelegationInput);

    expect(created.createdTasks.map((task) => task.status)).toEqual(["queued", "not_started"]);
    expect(created.activationResults).toEqual([expect.objectContaining({ accepted: true, taskIds: ["task_0001"] })]);
    expect(harness.backend.messages[0]).toMatchObject({
      targetRouteKey: "worker",
      metadata: expect.objectContaining({ message_type: "task_delegation_work_packet" }),
    });
    expect(harness.backend.messages[0]?.content).toContain('Use task_id="task_0001"');
    expect(harness.backend.messages[0]?.content).toContain("Do not call get_my_tasks");

    await expect(executeWorkerStatusUpdate(harness, {
      task_id: "task_0002",
      status: "in_progress",
      summary: "Should still be dependency gated.",
      deliverables: [],
    })).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });

    await expect(executeWorkerStatusUpdate(harness, {
      task_id: "task_0001",
      status: "in_progress",
      summary: "Draft started.",
      deliverables: [],
    })).resolves.toMatchObject({ status: "in_progress", terminal: false, settlement_requested: false });

    await expect(executeWorkerStatusUpdate(harness, {
      task_id: "task_0001",
      status: "completed",
      summary: "Draft complete.",
      deliverables: [{ file_path: "/tmp/draft.md", summary: "Draft note" }],
    })).resolves.toMatchObject({ terminal: true, activated_task_ids: ["task_0002"], settlement_requested: false });
    expect(harness.backend.messages.some((message) => message.targetRouteKey === "worker" && message.content.includes('Use task_id="task_0002"'))).toBe(true);
    expect(harness.backend.messages.some((message) => message.targetRouteKey === "coordinator" && message.content.includes("Delegated task completed.") && message.content.includes("task_0001"))).toBe(true);

    const terminalSocketMessage = websocketMessageFor(taskDelegationEvents(harness.backend, "TASK_DELEGATION_TERMINAL_STATUS")[0]);
    expect(terminalSocketMessage.type).toBe(ServerMessageType.TASK_PLAN_EVENT);
    expect(terminalSocketMessage.payload).toMatchObject({
      event_type: "TASK_DELEGATION_TERMINAL_STATUS",
      taskId: "task_0001",
      status: "completed",
      activatedTaskIds: ["task_0002"],
      source_route_key: "worker",
    });

    await expect(executeWorkerStatusUpdate(harness, {
      task_id: "task_0002",
      status: "completed",
      summary: "Review complete.",
      deliverables: [{ file_path: "/tmp/review.md", summary: "Review note" }],
    })).resolves.toMatchObject({ terminal: true, activated_task_ids: [], settlement_requested: true });
    expect(harness.backend.settlementAttempts).toEqual([]);

    publishIdleEvent(harness.backend);
    await vi.waitFor(() => {
      expect(harness.backend.settlementAttempts).toEqual([
        expect.objectContaining({ routeKey: "worker", requestedRunId: "run-worker", accepted: true }),
      ]);
    });
    expect(harness.backend.settledRouteKeys).toEqual(["worker"]);
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("keeps rejected dependency activations out of terminal activated_task_ids and websocket activation events", async () => {
    const harness = await createHarness();
    await executeDelegateTasks(harness, twoStepDelegationInput);
    harness.backend.postMessageResults.push({ accepted: false, message: "worker route rejected task activation" });

    await expect(executeWorkerStatusUpdate(harness, {
      task_id: "task_0001",
      status: "completed",
      summary: "Draft complete.",
      deliverables: [],
    })).resolves.toMatchObject({ terminal: true, activated_task_ids: [], settlement_requested: false });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    const terminalPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_TERMINAL_STATUS")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(terminalPayload).toMatchObject({ taskId: "task_0001", activatedTaskIds: [] });
    await expect(executeWorkerStatusUpdate(harness, {
      task_id: "task_0002",
      status: "in_progress",
      summary: "Activation was rejected so this task should not be mutable yet.",
      deliverables: [],
    })).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("passes the original member run id into idle settlement so stale route reuse is rejected", async () => {
    const harness = await createHarness();
    await executeDelegateTasks(harness, {
      tasks: [{ task_name: "single", assignee_name: "worker", description: "Complete one bounded task.", dependencies: [], expected_deliverables: [] }],
    });
    await executeWorkerStatusUpdate(harness, { task_id: "task_0001", status: "completed", summary: "Done.", deliverables: [] });

    harness.backend.changeMemberRunId("worker", "run-worker-restarted");
    publishIdleEvent(harness.backend, "run-worker-restarted");
    await vi.waitFor(() => {
      expect(harness.backend.settlementAttempts).toEqual([
        expect.objectContaining({ routeKey: "worker", requestedRunId: "run-worker", accepted: false, code: "TARGET_MEMBER_RUN_MISMATCH" }),
      ]);
    });
    expect(harness.backend.settledRouteKeys).toEqual([]);
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("keeps the model-facing task surface limited to delegate_tasks and update_task_status", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual(["delegate_tasks", "update_task_status"]);
    for (const oldName of ["create_task", "create_tasks", "get_my_tasks", "get_task_plan_status", "assign_task_to"]) {
      expect(TASK_DELEGATION_TOOL_NAME_LIST).not.toContain(oldName);
    }
  });
});
