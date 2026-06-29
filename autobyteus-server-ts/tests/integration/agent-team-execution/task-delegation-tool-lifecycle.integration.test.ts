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
import {
  MemberTeamContext,
  type AgentMemberTeamDescriptor,
  type MemberTeamDescriptor,
} from "../../../src/agent-team-execution/domain/member-team-context.js";
import type {
  StartTaskAgentInstanceRequest,
  TaskAgentInstanceIdentity,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import type {
  StartTaskTeamInstanceRequest,
  TaskTeamInstanceIdentity,
} from "../../../src/agent-team-execution/domain/task-team-instance.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import {
  stripMemberPathPrefix,
  TeamRunConfig,
  type TeamMemberRunConfig,
  type TeamRunMemberConfig,
  type TeamSubTeamMemberRunConfig,
} from "../../../src/agent-team-execution/domain/team-run-config.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunTaskDelegationEventPayload,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import {
  selectorFromMemberRouteKey,
  selectorToRouteKey,
  type TeamMemberSelector,
} from "../../../src/agent-team-execution/domain/team-run-member-identity.js";
import type { ConversationTargetAddress } from "../../../src/agent-team-execution/domain/conversation-target-address.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { TaskDelegationRunRegistry } from "../../../src/agent-team-execution/task-delegation/task-delegation-run-registry.js";
import { disposeTaskAgentDirectory, getTaskAgentDirectory } from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import {
  clearTaskTeamActiveRunDirectory,
  getTaskTeamActiveRunDirectory,
} from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import type {
  DelegateTaskResult,
  ReviewTaskResultResult,
  SubmitTaskResultResult,
  TaskDelegationContext,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import {
  buildTaskDelegationToolContextFromMemberTeamContext,
  TaskDelegationToolService,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import { TaskDelegationToolRunRouter } from "../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "task-delegation-codex-run";
const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
const submitEntry = getTaskDelegationToolManifestEntry(SUBMIT_TASK_RESULT_TOOL_NAME);
const reviewEntry = getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME);

const stripRoutePrefix = (routeKey: string, prefix: string): string => {
  if (routeKey === prefix) return routeKey;
  const prefixWithSlash = `${prefix}/`;
  return routeKey.startsWith(prefixWithSlash) ? routeKey.slice(prefixWithSlash.length) : routeKey;
};

class ManagedCodexTeamBackend implements TeamRunBackend {
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly messages: Array<{ content: string; targetRouteKey: string | null; targetMemberRunId: string | null; metadata: Record<string, unknown> | null }> = [];
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly taskTeamStarts: StartTaskTeamInstanceRequest[] = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  readonly postMessageResults: Array<{ accepted: boolean; message?: string }> = [];
  readonly taskAgentStartResults: Array<{ accepted: boolean; message?: string }> = [];
  readonly settlementAttempts: Array<{ routeKey: string; requestedRunId: string | null; accepted: boolean; code?: string }> = [];
  readonly taskAgentSettlementAttempts: Array<{ routeKey: string; requestedRunId: string; accepted: boolean; code?: string }> = [];
  readonly taskTeamPosts: Array<{ routeKey: string; requestedRunId: string; accepted: boolean; code?: string }> = [];
  readonly taskTeamSettlements: Array<{ routeKey: string; requestedRunId: string; accepted: boolean; code?: string }> = [];
  readonly settledRouteKeys: string[] = [];
  readonly settledTaskAgentRunIds: string[] = [];
  private readonly listeners = new Set<TeamRunEventListener>();
  private readonly memberRunIds = new Map<string, string>();
  private readonly memberNames = new Map<string, string>();
  private readonly childTaskTeams = new Map<string, { run: TeamRun; backend: ManagedCodexTeamBackend; identity: TaskTeamInstanceIdentity }>();
  private active = true;
  private status = "running";

  constructor(
    memberConfigs: readonly TeamRunMemberConfig[],
    readonly runId = teamRunId,
  ) {
    const visit = (members: readonly TeamRunMemberConfig[]) => {
      for (const member of members) {
        if (member.memberKind === "agent") {
          this.memberRunIds.set(member.memberRouteKey, member.memberRunId ?? `${this.runId}:${member.memberRouteKey}`);
          this.memberNames.set(member.memberRouteKey, member.memberName);
        } else {
          visit(member.memberConfigs);
        }
      }
    };
    visit(memberConfigs);
  }

  getTaskTeamChild(taskTeamRunId: string): { run: TeamRun; backend: ManagedCodexTeamBackend; identity: TaskTeamInstanceIdentity } | null {
    return this.childTaskTeams.get(taskTeamRunId) ?? null;
  }

  setStatus(status: string): void {
    this.status = status;
  }

  publishTeamStatus(status: string): void {
    this.setStatus(status);
    this.publishEvent({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: this.runId,
      sourcePath: [],
      data: { status } as never,
    });
  }

  async startTaskTeamInstance(request: StartTaskTeamInstanceRequest) {
    this.taskTeamStarts.push(request);
    const childTree = stripMemberPathPrefix(
      request.teamConfig.memberConfigs,
      request.teamConfig.memberPath,
    );
    const childConfig = new TeamRunConfig({
      teamDefinitionId: request.teamConfig.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: request.teamConfig.coordinatorMemberRouteKey
        ? stripRoutePrefix(request.teamConfig.coordinatorMemberRouteKey, request.teamConfig.memberRouteKey)
        : null,
      memberTree: childTree.map((member) => ({
        ...member,
        memberRunId: member.memberRunId ?? `${request.identity.taskTeamRunId}:${member.memberRouteKey}`,
      })),
    });
    const childBackend = new ManagedCodexTeamBackend(childConfig.memberTree, request.identity.taskTeamRunId);
    const childRun = new TeamRun({ backend: childBackend, config: childConfig });
    this.childTaskTeams.set(request.identity.taskTeamRunId, {
      run: childRun,
      backend: childBackend,
      identity: request.identity,
    });
    getTaskTeamActiveRunDirectory().bindActiveRun(request.identity, childRun);
    return childRun.postMessage(
      request.message,
      selectorFromMemberRouteKey(request.identity.ingress.memberRouteKey),
    );
  }

  async postMessageToTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string, message: AgentInputUserMessage) {
    const child = this.childTaskTeams.get(taskTeamRunId.trim()) ?? null;
    if (!child) {
      this.taskTeamPosts.push({ routeKey: logicalTeamRouteKey, requestedRunId: taskTeamRunId, accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND" });
      return { accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND" };
    }
    if (child.identity.logicalTeam.memberRouteKey !== logicalTeamRouteKey) {
      this.taskTeamPosts.push({ routeKey: logicalTeamRouteKey, requestedRunId: taskTeamRunId, accepted: false, code: "TASK_TEAM_ROUTE_MISMATCH" });
      return { accepted: false, code: "TASK_TEAM_ROUTE_MISMATCH" };
    }
    this.taskTeamPosts.push({ routeKey: logicalTeamRouteKey, requestedRunId: taskTeamRunId, accepted: true });
    return child.run.postMessage(
      message,
      selectorFromMemberRouteKey(child.identity.ingress.memberRouteKey),
    );
  }

  async settleTaskTeamInstance(logicalTeamRouteKey: string, taskTeamRunId: string) {
    const child = this.childTaskTeams.get(taskTeamRunId.trim()) ?? null;
    if (!child) {
      this.taskTeamSettlements.push({ routeKey: logicalTeamRouteKey, requestedRunId: taskTeamRunId, accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND" });
      return { accepted: false, code: "TASK_TEAM_RUN_NOT_FOUND" };
    }
    if (child.identity.logicalTeam.memberRouteKey !== logicalTeamRouteKey) {
      this.taskTeamSettlements.push({ routeKey: logicalTeamRouteKey, requestedRunId: taskTeamRunId, accepted: false, code: "TASK_TEAM_ROUTE_MISMATCH" });
      return { accepted: false, code: "TASK_TEAM_ROUTE_MISMATCH" };
    }
    const result = await child.run.terminate();
    this.taskTeamSettlements.push({ routeKey: logicalTeamRouteKey, requestedRunId: taskTeamRunId, accepted: result.accepted, code: result.code });
    if (result.accepted) {
      this.childTaskTeams.delete(taskTeamRunId.trim());
    }
    return { ...result, memberRunId: taskTeamRunId, memberName: child.identity.logicalTeam.memberName };
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
  getStatusSnapshot() { return { status: this.status, source_path: [] }; }
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

  async postMessageToConversationTarget(_message: AgentInputUserMessage, _address: ConversationTargetAddress) {
    return { accepted: true };
  }

  async deliverInterAgentMessage() { return { accepted: true }; }
  async approveToolInvocation() { return { accepted: true }; }
  async interruptMember() { return { accepted: true }; }
  async terminate() {
    for (const child of this.childTaskTeams.values()) {
      const result = await child.run.terminate();
      if (!result.accepted) return result;
    }
    this.childTaskTeams.clear();
    this.active = false;
    this.status = "offline";
    return { accepted: true };
  }

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
  clearTaskTeamActiveRunDirectory();
  let backend: ManagedCodexTeamBackend | null = null;
  const mixedFactory: TeamRunBackendFactory = {
    createBackend: async (config) => (backend = new ManagedCodexTeamBackend(config.memberTree)),
    restoreBackend: async () => { throw new Error("Unexpected restore in task delegation integration test."); },
  };
  const manager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: mixedFactory as never,
    teamCommunicationService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
    runFileChangeService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
  });
  const run = await manager.createTeamRun(
    new TeamRunConfig({
      teamDefinitionId: "task-delegation-integration-team",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "coordinator",
      memberTree: [
        ...["coordinator", "worker", "reviewer"].map((memberRouteKey) => ({
          memberName: memberRouteKey,
          memberRouteKey,
          memberRunId: `run-${memberRouteKey}`,
          agentDefinitionId: `agent-${memberRouteKey}`,
          llmModelIdentifier: "gpt-test",
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.NONE,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        })),
        {
          memberKind: "agent_team" as const,
          memberName: "design_team",
          memberRouteKey: "design_team",
          memberRunId: "run-design-team",
          childTeamRunId: "run-design-team",
          teamDefinitionId: "team-def-design",
          coordinatorMemberRouteKey: "design_team/team_lead",
          memberConfigs: [
            {
              memberName: "team_lead",
              memberRouteKey: "design_team/team_lead",
              memberRunId: "run-team-lead-template",
              agentDefinitionId: "agent-team_lead",
              llmModelIdentifier: "gpt-test",
              autoExecuteTools: true,
              skillAccessMode: SkillAccessMode.NONE,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            },
            {
              memberName: "implementer",
              memberRouteKey: "design_team/implementer",
              memberRunId: "run-implementer-template",
              agentDefinitionId: "agent-implementer",
              llmModelIdentifier: "gpt-test",
              autoExecuteTools: true,
              skillAccessMode: SkillAccessMode.NONE,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            },
          ],
        },
      ],
    }),
    teamRunId,
  );
  if (!backend) throw new Error("Managed backend was not created.");

  let taskAgentAllocationCounter = 0;
  const runRegistry = new TaskDelegationRunRegistry({
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: async (agentDefinitionId: string) => {
        taskAgentAllocationCounter += 1;
        const logicalName = agentDefinitionId.replace(/^agent-/, "");
        return `${teamRunId}__${logicalName}__task_${String(taskAgentAllocationCounter).padStart(4, "0")}`;
      },
    },
  });
  const service = new TaskDelegationToolService({
    runRouter: new TaskDelegationToolRunRouter({
      teamRunService: { resolveTeamRun: async (id: string) => (id === run.runId ? run : null) } as never,
      runRegistry,
    }),
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

const agentDescriptorFor = (
  runId: string,
  member: TeamMemberRunConfig,
): AgentMemberTeamDescriptor => ({
  memberKind: "agent",
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId ?? `${runId}:${member.memberRouteKey}`,
  runtimeKind: member.runtimeKind,
  role: member.role ?? null,
  description: member.description ?? null,
  address: { teamRunId: runId, memberPath: [...member.memberPath], memberRouteKey: member.memberRouteKey },
});

const findTeamRepresentative = (
  member: TeamSubTeamMemberRunConfig,
): TeamMemberRunConfig | null => {
  const agents: TeamMemberRunConfig[] = [];
  const visit = (members: readonly TeamRunMemberConfig[]): void => {
    for (const child of members) {
      if (child.memberKind === "agent") agents.push(child);
      else visit(child.memberConfigs);
    }
  };
  visit(member.memberConfigs);
  return agents.find((candidate) => candidate.memberRouteKey === member.coordinatorMemberRouteKey) ?? agents[0] ?? null;
};

const memberDescriptorFor = (
  runId: string,
  member: TeamRunMemberConfig,
): MemberTeamDescriptor => {
  if (member.memberKind === "agent") return agentDescriptorFor(runId, member);
  const representative = findTeamRepresentative(member);
  return {
    memberKind: "agent_team",
    memberName: member.memberName,
    memberPath: [...member.memberPath],
    memberRouteKey: member.memberRouteKey,
    memberRunId: member.memberRunId ?? `${runId}:${member.memberRouteKey}`,
    teamDefinitionId: member.teamDefinitionId,
    childTeamRunId: member.childTeamRunId ?? member.memberRunId ?? null,
    coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
    representative: representative
      ? {
          memberKind: "agent",
          memberName: representative.memberName,
          memberPath: [...representative.memberPath],
          memberRouteKey: representative.memberRouteKey,
          memberRunId: representative.memberRunId ?? `${runId}:${representative.memberRouteKey}`,
          runtimeKind: representative.runtimeKind,
          role: representative.role ?? null,
          description: representative.description ?? null,
        }
      : null,
    role: member.role ?? null,
    description: member.description ?? null,
    address: { teamRunId: runId, memberPath: [...member.memberPath], memberRouteKey: member.memberRouteKey },
  };
};

const buildToolContext = (
  run: { runId: string; teamBackendKind: TeamBackendKind; config: TeamRunConfig | null },
  memberRouteKey: string,
  taskAgentInstance: TaskAgentInstanceIdentity | null = null,
  taskTeamInstance: TaskTeamInstanceIdentity | null = null,
): TaskDelegationContext => {
  if (!run.config) throw new Error("Expected team run config.");
  const members = run.config.memberTree.map((member) => memberDescriptorFor(run.runId, member));
  const caller = members.find(
    (member): member is AgentMemberTeamDescriptor =>
      member.memberKind === "agent" && member.memberRouteKey === memberRouteKey,
  );
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
    taskTeamInstance,
  }));
};

const currentRun = (harness: Harness) => {
  const run = harness.manager.getTeamRun(harness.backend.runId);
  if (!run) throw new Error("Expected active team run.");
  return run;
};

const executeDelegateTask = async (harness: Harness, rawInput: Record<string, unknown>) =>
  (await delegateEntry.execute(harness.service, harness.coordinatorContext, delegateEntry.parseInput(rawInput))) as DelegateTaskResult;

const executeDelegateTaskWithContext = async (
  harness: Harness,
  context: TaskDelegationContext,
  rawInput: Record<string, unknown>,
) => (await delegateEntry.execute(
  harness.service,
  context,
  delegateEntry.parseInput(rawInput),
)) as DelegateTaskResult;

const executeDelegateTaskAsTaskAgent = async (harness: Harness, contextTaskId: string, rawInput: Record<string, unknown>) =>
  (await delegateEntry.execute(
    harness.service,
    buildTaskAgentToolContext(harness, contextTaskId),
    delegateEntry.parseInput(rawInput),
  )) as DelegateTaskResult;

const executeSubmitTaskResultAsTaskAgent = async (
  harness: Harness,
  contextTaskId: string,
  rawInput: Record<string, unknown>,
) => (await submitEntry.execute(
  harness.service,
  buildTaskAgentToolContext(harness, contextTaskId),
  submitEntry.parseInput(rawInput),
)) as SubmitTaskResultResult;

const executeSubmitTaskResultWithContext = async (
  harness: Harness,
  context: TaskDelegationContext,
  rawInput: Record<string, unknown>,
) => (await submitEntry.execute(
  harness.service,
  context,
  submitEntry.parseInput(rawInput),
)) as SubmitTaskResultResult;

const executeCoordinatorReview = async (
  harness: Harness,
  rawInput: Record<string, unknown>,
) => (await reviewEntry.execute(
  harness.service,
  harness.coordinatorContext,
  reviewEntry.parseInput(rawInput),
)) as ReviewTaskResultResult;

const executeTaskAgentReview = async (
  harness: Harness,
  contextTaskId: string,
  rawInput: Record<string, unknown>,
) => (await reviewEntry.execute(
  harness.service,
  buildTaskAgentToolContext(harness, contextTaskId),
  reviewEntry.parseInput(rawInput),
)) as ReviewTaskResultResult;

const executeReviewTaskResultWithContext = async (
  harness: Harness,
  context: TaskDelegationContext,
  rawInput: Record<string, unknown>,
) => (await reviewEntry.execute(
  harness.service,
  context,
  reviewEntry.parseInput(rawInput),
)) as ReviewTaskResultResult;

const buildTaskAgentToolContext = (
  harness: Harness,
  contextTaskId: string,
): TaskDelegationContext => {
  const identity = findTaskAgentIdentity(harness.backend, contextTaskId);
  return buildToolContext(currentRun(harness), identity.logicalMember.memberRouteKey, identity);
};

const buildTaskAgentToolContextForRun = (
  run: TeamRun,
  backend: ManagedCodexTeamBackend,
  contextTaskId: string,
): TaskDelegationContext => {
  const identity = findTaskAgentIdentity(backend, contextTaskId);
  return buildToolContext(run, identity.logicalMember.memberRouteKey, identity);
};

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

const memberDelegationInput = (name: string, description: string) => ({
  target: { kind: "member", name },
  description,
});

const draftDelegationInput = memberDelegationInput(
  "worker",
  "Draft a validation note. Done when draft.md content is summarized.",
);

const reviewDelegationInput = memberDelegationInput(
  "worker",
  "Review the validation note independently. Done when review.md content is summarized.",
);

describe("task delegation tool lifecycle integration", () => {
  it("runs the server-managed delegate_task -> submit_task_result -> review_task_result -> idle settlement path", async () => {
    const harness = await createHarness();
    const createdDraft = await executeDelegateTask(harness, draftDelegationInput);
    const createdReview = await executeDelegateTask(harness, reviewDelegationInput);

    expect(createdDraft).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0001",
      execution_kind: "task_agent",
      task_agent_run_id: "task-delegation-codex-run__worker__task_0001",
      task_team_run_id: null,
      status: "active",
      activation_accepted: true,
      message: null,
    }));
    expect(createdReview).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0002",
      execution_kind: "task_agent",
      task_agent_run_id: "task-delegation-codex-run__worker__task_0002",
      task_team_run_id: null,
      status: "active",
      activation_accepted: true,
      message: null,
    }));
    expect(harness.backend.taskAgentStarts[0]).toMatchObject({
      identity: expect.objectContaining({ taskId: "task_0001" }),
      message: expect.objectContaining({
        metadata: expect.objectContaining({ message_type: "task_delegation_work_packet" }),
      }),
    });
    expect(harness.backend.taskAgentStarts[0]?.message.content).toContain("submit_task_result");
    expect(harness.backend.taskAgentStarts[0]?.message.content).toContain("review_task_result");
    expect(harness.backend.taskAgentStarts[0]?.message.content).toContain("Task ID: task_0001");
    expect(harness.backend.taskAgentStarts[0]?.message.content).not.toContain("target_agent_run_id");
    expect(harness.backend.taskAgentStarts[0]?.message.content).not.toContain("task-delegation-codex-run__worker__task_0001");
    expect(harness.backend.taskAgentStarts[0]?.message.content).not.toContain(["mark", "task", "completed"].join("_"));
    expect(harness.backend.taskAgentStarts[0]?.message.content).not.toContain(["accept", "task"].join("_"));

    const activationSocketMessage = websocketMessageFor(taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")[0]);
    expect(activationSocketMessage.type).toBe(ServerMessageType.TASK_DELEGATION_EVENT);
    expect(activationSocketMessage.payload).toMatchObject({
      event_type: "TASK_DELEGATION_ACTIVATED",
      taskIds: ["task_0001"],
      execution_kind: "task_agent",
      task_agent_run_id: "task-delegation-codex-run__worker__task_0001",
      tasks: [expect.objectContaining({ taskId: "task_0001", status: "active", executionRunId: "task-delegation-codex-run__worker__task_0001" })],
    });

    publishIdleEvent(harness.backend, "task_0001");
    expect(harness.backend.taskAgentSettlementAttempts).toEqual([]);
    await expect(executeSubmitTaskResultAsTaskAgent(harness, "task_0001", { message: "first result" }))
      .resolves.toMatchObject({ status: "awaiting_review", submission_id: "task_0001_submission_0001", notification_delivered: true });
    expect(harness.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "coordinator",
      targetMemberRunId: null,
    });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(1);

    await expect(executeCoordinatorReview(harness, { task_id: "task_0001", decision: "accept" }))
      .resolves.toMatchObject({ status: "accepted", decision: "accept", reviewed_submission_id: "task_0001_submission_0001", settlement_requested: true });
    await vi.waitFor(() => {
      expect(harness.backend.taskAgentSettlementAttempts).toEqual([
        expect.objectContaining({
          routeKey: "worker",
          requestedRunId: findTaskAgentIdentity(harness.backend, "task_0001").taskAgentRunId,
          accepted: true,
        }),
      ]);
    });

    await executeSubmitTaskResultAsTaskAgent(harness, "task_0002", { message: "second result" });
    await expect(executeCoordinatorReview(harness, { task_id: "task_0002", decision: "accept" }))
      .resolves.toMatchObject({ status: "accepted", decision: "accept", reviewed_submission_id: "task_0002_submission_0001", settlement_requested: true });
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

  it("lets a task-agent delegate child work and review the child through tight task-agent identity", async () => {
    const harness = await createHarness();
    await executeDelegateTask(harness, memberDelegationInput("worker", "Parent worker task."));
    const parentTaskAgent = findTaskAgentIdentity(harness.backend, "task_0001");

    const childCreated = await executeDelegateTaskAsTaskAgent(
      harness,
      "task_0001",
      memberDelegationInput("reviewer", "Child reviewer task from parent task-agent."),
    );
    expect(childCreated).toEqual(expect.objectContaining({
      target: { kind: "member", name: "reviewer" },
      task_id: "task_0002",
      execution_kind: "task_agent",
      task_agent_run_id: "task-delegation-codex-run__reviewer__task_0002",
      status: "active",
      activation_accepted: true,
    }));
    expect(harness.backend.taskAgentStarts[1]?.message.content).toContain("Task ID: task_0002");
    expect(harness.backend.taskAgentStarts[1]?.message.content).toContain("Child reviewer task from parent task-agent.");
    expect(harness.backend.taskAgentStarts[1]?.message.content).not.toContain("Original delegator");
    expect(harness.backend.taskAgentStarts[1]?.message.content).not.toContain(parentTaskAgent.taskAgentRunId);

    await executeSubmitTaskResultAsTaskAgent(harness, "task_0002", { message: "child result" });
    expect(harness.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "worker",
      targetMemberRunId: parentTaskAgent.taskAgentRunId,
    });

    await expect(executeTaskAgentReview(harness, "task_0001", { task_id: "task_0002", decision: "accept" }))
      .resolves.toMatchObject({ status: "accepted", decision: "accept", settlement_requested: true });
    const reviewPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_REVIEWED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(reviewPayload).toMatchObject({
      taskId: "task_0002",
      status: "accepted",
      reviewedSubmissionId: "task_0002_submission_0001",
      execution: expect.objectContaining({
        kind: "task_agent",
        taskAgentInstance: expect.objectContaining({
          taskAgentRunId: "task-delegation-codex-run__reviewer__task_0002",
        }),
      }),
      delegator: expect.objectContaining({
        memberRouteKey: "worker",
        taskAgentRunId: parentTaskAgent.taskAgentRunId,
        taskId: "task_0001",
      }),
    });
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("runs task-team target ingress, child tool routing, revision, settlement gates, cleanup, and sequential delegation", async () => {
    const harness = await createHarness();
    const activeDirectory = getTaskTeamActiveRunDirectory();

    const created = await executeDelegateTask(harness, {
      target: { kind: "team", name: "design_team" },
      description: "Coordinate a feature design as the accountable team.",
    });
    expect(created).toMatchObject({
      target: { kind: "team", name: "design_team" },
      task_id: "task_0001",
      execution_kind: "task_team",
      task_agent_run_id: null,
      status: "active",
      activation_accepted: true,
    });
    const firstTaskTeamRunId = created.task_team_run_id;
    expect(firstTaskTeamRunId).toMatch(/^design_team_[a-f0-9]{32}$/);
    const firstTaskTeam = harness.backend.getTaskTeamChild(firstTaskTeamRunId!);
    expect(firstTaskTeam).not.toBeNull();
    expect(activeDirectory.resolveActiveRun(firstTaskTeamRunId!)?.runId).toBe(firstTaskTeamRunId);
    expect(firstTaskTeam!.backend.messages[0]).toMatchObject({
      targetRouteKey: "team_lead",
      metadata: expect.objectContaining({ message_type: "task_team_delegation_work_packet" }),
    });

    const firstIngressContext = buildToolContext(
      firstTaskTeam!.run,
      firstTaskTeam!.identity.ingress.memberRouteKey,
      null,
      firstTaskTeam!.identity,
    );
    const childCreated = await executeDelegateTaskWithContext(
      harness,
      firstIngressContext,
      memberDelegationInput("implementer", "Implement the child team design check."),
    );
    expect(childCreated).toMatchObject({
      target: { kind: "member", name: "implementer" },
      task_id: "task_0001",
      execution_kind: "task_agent",
      status: "active",
      activation_accepted: true,
    });
    expect(firstTaskTeam!.backend.taskAgentStarts).toHaveLength(1);

    await expect(executeSubmitTaskResultWithContext(harness, firstIngressContext, {
      message: "Team draft result.",
    })).resolves.toMatchObject({
      task_id: "task_0001",
      status: "awaiting_review",
      submission_id: "task_0001_submission_0001",
      notification_delivered: true,
    });
    expect(harness.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "coordinator",
      targetMemberRunId: null,
    });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(1);

    await expect(executeCoordinatorReview(harness, {
      task_id: "task_0001",
      decision: "request_revision",
      comment: "Please revise the team result.",
    })).resolves.toMatchObject({
      task_id: "task_0001",
      status: "active",
      decision: "request_revision",
      notification_delivered: true,
      settlement_requested: false,
    });
    expect(harness.backend.taskTeamPosts).toEqual([
      expect.objectContaining({
        routeKey: "design_team",
        requestedRunId: firstTaskTeamRunId,
        accepted: true,
      }),
    ]);
    expect(firstTaskTeam!.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "team_lead",
      metadata: expect.objectContaining({
        message_type: "task_revision_requested",
        target_task_team_run_id: firstTaskTeamRunId,
      }),
    });

    await executeSubmitTaskResultWithContext(harness, firstIngressContext, {
      message: "Team revised result.",
    });
    await expect(executeCoordinatorReview(harness, {
      task_id: "task_0001",
      decision: "accept",
    })).resolves.toMatchObject({
      task_id: "task_0001",
      status: "accepted",
      decision: "accept",
      settlement_requested: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.backend.taskTeamSettlements).toHaveLength(0);
    expect(activeDirectory.resolveActiveRun(firstTaskTeamRunId!)?.runId).toBe(firstTaskTeamRunId);

    const childTaskAgentContext = buildTaskAgentToolContextForRun(firstTaskTeam!.run, firstTaskTeam!.backend, "task_0001");
    await executeSubmitTaskResultWithContext(harness, childTaskAgentContext, {
      message: "Child implementation complete.",
    });
    await executeReviewTaskResultWithContext(harness, firstIngressContext, {
      task_id: "task_0001",
      decision: "accept",
    });
    publishIdleEvent(firstTaskTeam!.backend, "task_0001");
    await vi.waitFor(() => {
      expect(firstTaskTeam!.backend.taskAgentSettlementAttempts).toEqual([
        expect.objectContaining({
          routeKey: "implementer",
          requestedRunId: findTaskAgentIdentity(firstTaskTeam!.backend, "task_0001").taskAgentRunId,
          accepted: true,
        }),
      ]);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.runRegistry.getExisting(firstTaskTeamRunId!)?.hasOpenWork()).toBe(false);
    expect(getTaskAgentDirectory(firstTaskTeamRunId!).listActiveEntries()).toEqual([]);
    firstTaskTeam!.backend.publishTeamStatus("idle");
    await vi.waitFor(() => {
      expect(harness.backend.taskTeamSettlements).toEqual([
        expect.objectContaining({
          routeKey: "design_team",
          requestedRunId: firstTaskTeamRunId,
          accepted: true,
        }),
      ]);
    });
    expect(activeDirectory.resolveActiveRun(firstTaskTeamRunId!)).toBeNull();
    await expect(executeDelegateTaskWithContext(
      harness,
      firstIngressContext,
      memberDelegationInput("implementer", "Stale task-team child work."),
    )).rejects.toMatchObject({ code: "TEAM_RUN_NOT_FOUND" });

    const secondCreated = await executeDelegateTask(harness, {
      target: { kind: "team", name: "design_team" },
      description: "Coordinate a follow-up feature design.",
    });
    expect(secondCreated).toMatchObject({
      target: { kind: "team", name: "design_team" },
      task_id: "task_0002",
      execution_kind: "task_team",
      status: "active",
      activation_accepted: true,
    });
    const secondTaskTeamRunId = secondCreated.task_team_run_id;
    expect(secondTaskTeamRunId).toMatch(/^design_team_[a-f0-9]{32}$/);
    expect(secondTaskTeamRunId).not.toBe(firstTaskTeamRunId);
    const secondTaskTeam = harness.backend.getTaskTeamChild(secondTaskTeamRunId!);
    expect(secondTaskTeam).not.toBeNull();
    expect(activeDirectory.resolveActiveRun(secondTaskTeamRunId!)?.runId).toBe(secondTaskTeamRunId);
    const secondIngressContext = buildToolContext(
      secondTaskTeam!.run,
      secondTaskTeam!.identity.ingress.memberRouteKey,
      null,
      secondTaskTeam!.identity,
    );

    await executeSubmitTaskResultWithContext(harness, secondIngressContext, {
      message: "Second team result.",
    });
    await executeCoordinatorReview(harness, {
      task_id: "task_0002",
      decision: "accept",
    });
    secondTaskTeam!.backend.publishTeamStatus("idle");
    await vi.waitFor(() => {
      expect(harness.backend.taskTeamSettlements).toEqual([
        expect.objectContaining({ requestedRunId: firstTaskTeamRunId, accepted: true }),
        expect.objectContaining({ requestedRunId: secondTaskTeamRunId, accepted: true }),
      ]);
    });
    expect(activeDirectory.resolveActiveRun(secondTaskTeamRunId!)).toBeNull();

    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("scopes each singular activation to the created task and leaves stale rejected tasks inactive", async () => {
    const harness = await createHarness();
    harness.backend.taskAgentStartResults.push(
      { accepted: false, message: "worker route rejected task activation" },
      { accepted: true },
    );
    const rejected = await executeDelegateTask(harness, draftDelegationInput);
    const accepted = await executeDelegateTask(harness, reviewDelegationInput);

    expect(rejected).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0001",
      status: "not_started",
      execution_kind: null,
      task_agent_run_id: null,
      task_team_run_id: null,
      activation_accepted: false,
      message: "worker route rejected task activation",
    }));
    expect(accepted).toEqual(expect.objectContaining({
      target: { kind: "member", name: "worker" },
      task_id: "task_0002",
      status: "active",
      execution_kind: "task_agent",
      task_agent_run_id: "task-delegation-codex-run__worker__task_0002",
      task_team_run_id: null,
      activation_accepted: true,
    }));
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    const activationPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(activationPayload).toMatchObject({ taskIds: ["task_0002"] });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_STATUS_UPDATED")).toHaveLength(0);
    await expect(executeCoordinatorReview(harness, { task_id: "task_0001", decision: "accept" }))
      .rejects.toMatchObject({ code: "TASK_NOT_AWAITING_REVIEW" });
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("keeps the model-facing task surface limited to pure task delegation tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      DELEGATE_TASK_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    for (const oldName of ["create_task", "create_tasks", "get_my_tasks", "get_task_plan_status", "assign_task_to", ["accept", "task"].join("_")]) {
      expect(TASK_DELEGATION_TOOL_NAME_LIST).not.toContain(oldName);
    }
  });
});
