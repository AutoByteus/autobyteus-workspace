import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
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
} from "../../../src/agent-team-execution/domain/member-team-context.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
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
  localizeSubTeamRunTopology,
  TeamRunConfig,
  type TeamMemberRunConfig,
  type TeamRunMemberConfig,
} from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamLogicalPlacementResolver } from "../../../src/agent-team-execution/services/team-logical-placement-resolver.js";
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
import { TaskDelegationReferenceContentService } from "../../../src/agent-team-execution/task-delegation/task-delegation-reference-content-service.js";
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
  TaskDelegationRecord,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";
import { TaskDelegationRecordsService } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-service.js";
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
import { registerTaskDelegationRoutes } from "../../../src/api/rest/task-delegation.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "task-delegation-codex-run";
const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
const submitEntry = getTaskDelegationToolManifestEntry(SUBMIT_TASK_RESULT_TOOL_NAME);
const reviewEntry = getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME);

type ManagedBackendRuntimeOptions = {
  parentBoundary?: {
    memoryScope: {
      rootTeamRunId: string;
      teamRunPath: string[];
    };
  } | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  teamMountPath?: string[];
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

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
    private readonly config: TeamRunConfig,
    readonly runId = teamRunId,
    private readonly runtimeOptions: ManagedBackendRuntimeOptions = {},
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
    visit(config.memberTree);
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
    const localized = localizeSubTeamRunTopology(request.teamConfig);
    const childConfig = new TeamRunConfig({
      teamDefinitionId: request.teamConfig.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: localized.coordinatorMemberRouteKey,
      memberTree: localized.memberTree.map((member) => ({
        ...member,
        memberRunId: member.memberRunId ?? `${request.identity.taskTeamRunId}:${member.memberRouteKey}`,
      })),
    });
    const parentMemoryScope = this.runtimeOptions.parentBoundary?.memoryScope ?? {
      rootTeamRunId: this.runId,
      teamRunPath: [],
    };
    const childBackend = new ManagedCodexTeamBackend(
      childConfig,
      request.identity.taskTeamRunId,
      {
        parentBoundary: {
          memoryScope: {
            rootTeamRunId: parentMemoryScope.rootTeamRunId,
            teamRunPath: [...parentMemoryScope.teamRunPath, request.identity.taskTeamRunId],
          },
        },
        taskTeamInstance: request.identity,
        teamMountPath: [
          ...(this.runtimeOptions.teamMountPath ?? []),
          ...request.teamConfig.memberPath,
        ],
      },
    );
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
      parentBoundary: this.runtimeOptions.parentBoundary ?? null,
      taskTeamInstance: this.runtimeOptions.taskTeamInstance ?? null,
      teamMountPath: this.runtimeOptions.teamMountPath ?? [],
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
  resolveLogicalPlacement(recipientName: string, callerAddressing: ReturnType<typeof createMemberLogicalAddressContext>) {
    return new TeamLogicalPlacementResolver().resolve(this.config, recipientName, callerAddressing);
  }
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
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-delegation-lifecycle-integration-"));
  tempDirs.push(memoryDir);
  const recordsService = new TaskDelegationRecordsService({ memoryDir });
  const mixedFactory: TeamRunBackendFactory = {
    createBackend: async (config) => (backend = new ManagedCodexTeamBackend(config)),
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
    recordsService,
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
    memoryDir,
    recordsService,
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
  taskTeamInstance: TaskTeamInstanceIdentity | null = null,
): TaskDelegationContext => {
  if (!run.config) throw new Error("Expected team run config.");
  const caller = run.config.memberTree.find(
    (member): member is TeamMemberRunConfig =>
      member.memberKind === "agent" && member.memberRouteKey === memberRouteKey,
  );
  if (!caller) throw new Error(`Missing caller '${memberRouteKey}'.`);
  const addressingMemberPath = taskTeamInstance
    ? [...taskTeamInstance.logicalTeam.memberPath, ...caller.memberPath]
    : caller.memberPath;
  return buildTaskDelegationToolContextFromMemberTeamContext(new MemberTeamContext({
    teamRunId: run.runId,
    teamDefinitionId: run.config.teamDefinitionId,
    teamName: "Task Delegation Integration Team",
    teamBackendKind: run.teamBackendKind,
    memberName: caller.memberName,
    memberPath: caller.memberPath,
    memberRouteKey: caller.memberRouteKey,
    memberRunId: taskAgentInstance?.taskAgentRunId
      ?? taskTeamInstance?.ingress.memberRunId
      ?? caller.memberRunId,
    coordinatorMemberRouteKey: run.config.coordinatorMemberRouteKey,
    collaboration: {
      addressing: createMemberLogicalAddressContext({
        rootTeamRunId: taskTeamInstance?.parentTeamRunId ?? run.runId,
        memberAddress: `/${addressingMemberPath.join("/")}`,
      }),
    },
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

const findTaskTeamIdentity = (
  backend: ManagedCodexTeamBackend,
  taskId: string,
): TaskTeamInstanceIdentity => {
  const identity = backend.taskTeamStarts.find(
    (start) => start.identity.taskId === taskId,
  )?.identity;
  if (!identity) {
    throw new Error(`Missing task-team identity for ${taskId}.`);
  }
  return identity;
};

const taskDelegationEvents = (backend: ManagedCodexTeamBackend, eventType: TeamRunTaskDelegationEventPayload["eventType"]): TeamRunEvent[] =>
  backend.publishedEvents.filter((event) =>
    event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION &&
    (event.data as TeamRunTaskDelegationEventPayload).eventType === eventType,
  );

const recordsById = (records: readonly TaskDelegationRecord[]): Map<string, TaskDelegationRecord> =>
  new Map(records.map((record) => [record.taskId, record]));

const taskReferenceContentUrl = (input: {
  teamRunId: string;
  taskId: string;
  referenceId: string;
}): string =>
  `/team-runs/${encodeURIComponent(input.teamRunId)}`
  + `/task-delegations/${encodeURIComponent(input.taskId)}`
  + `/references/${encodeURIComponent(input.referenceId)}/content`;

const createTaskReferenceRouteApp = async (harness: Harness): Promise<FastifyInstance> => {
  const app = fastify();
  await registerTaskDelegationRoutes(app, {
    contentService: new TaskDelegationReferenceContentService(
      harness.runRegistry,
      harness.recordsService,
    ),
  });
  return app;
};

const memberAddress = (memberRouteKey: string) => ({
  segments: [{ kind: "member" as const, memberRouteKey }],
});

const legacyRelativeReferenceRecord = (input: {
  taskId: string;
  referenceId: string;
  referencePath: string;
}): TaskDelegationRecord => ({
  taskId: input.taskId,
  status: "active",
  senderAddress: memberAddress("coordinator"),
  receiverAddress: memberAddress("worker"),
  receiverTargetKind: "member",
  content: "Legacy relative reference record.",
  referenceFiles: [
    {
      referenceId: input.referenceId,
      path: input.referencePath,
      type: "file",
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
    },
  ],
  taskRun: null,
  updates: [],
  createdAt: "2026-07-05T00:00:00.000Z",
});

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
  recipient_name: `./${name}`,
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
    expect(harness.coordinatorContext.addressing).toEqual({
      rootTeamRunId: teamRunId,
      memberAddress: "/coordinator",
    });
    const createdDraft = await executeDelegateTask(harness, draftDelegationInput);
    const createdReview = await executeDelegateTask(harness, reviewDelegationInput);

    expect(createdDraft).toEqual({
      task_id: "task_0001",
      status: "active",
    });
    expect(createdReview).toEqual({
      task_id: "task_0002",
      status: "active",
    });
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
      .resolves.toEqual({ task_id: "task_0001", status: "awaiting_review" });
    expect(harness.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "coordinator",
      targetMemberRunId: null,
    });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(1);
    const firstSubmissionPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(firstSubmissionPayload).toMatchObject({
      taskId: "task_0001",
      status: "awaiting_review",
      submissionId: "task_0001_submission_0001",
    });

    await expect(executeCoordinatorReview(harness, { task_id: "task_0001", decision: "accept" }))
      .resolves.toEqual({ task_id: "task_0001", status: "accepted" });
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
      .resolves.toEqual({ task_id: "task_0002", status: "accepted" });
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

    const persistedBeforeRegistryClear = await harness.recordsService.getTaskDelegationRecords(teamRunId);
    const persistedById = recordsById(persistedBeforeRegistryClear);
    expect([...persistedById.keys()]).toEqual(["task_0001", "task_0002"]);
    expect(persistedById.get("task_0001")).toMatchObject({
      taskId: "task_0001",
      status: "accepted",
      content: "Draft a validation note. Done when draft.md content is summarized.",
      senderAddress: { segments: [{ kind: "member", memberRouteKey: "coordinator" }] },
      receiverAddress: { segments: [{ kind: "member", memberRouteKey: "worker" }] },
      receiverTargetKind: "member",
      taskRun: {
        address: {
          segments: [
            { kind: "member", memberRouteKey: "worker" },
            { kind: "task_agent", taskAgentRunId: findTaskAgentIdentity(harness.backend, "task_0001").taskAgentRunId },
          ],
        },
      },
      updates: [
        expect.objectContaining({
          kind: "submission",
          submissionId: "task_0001_submission_0001",
          content: "first result",
        }),
        expect.objectContaining({
          kind: "review",
          reviewId: "task_0001_review_0001",
          reviewedSubmissionId: "task_0001_submission_0001",
          decision: "accept",
        }),
      ],
    });
    expect(persistedById.get("task_0001")).not.toHaveProperty("pendingSubmissionId");
    expect(persistedById.get("task_0001")).not.toHaveProperty("target");

    harness.runRegistry.clear();
    expect(harness.runRegistry.getExisting(teamRunId)).toBeNull();
    await expect(executeCoordinatorReview(harness, { task_id: "task_0001", decision: "accept" }))
      .rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    const recreatedRecordsService = new TaskDelegationRecordsService({ memoryDir: harness.memoryDir });
    await expect(recreatedRecordsService.getTaskDelegationRecords(teamRunId))
      .resolves.toEqual(persistedBeforeRegistryClear);
    harness.runRegistry.clear();
    await harness.manager.terminateTeamRun(harness.backend.runId);
  });

  it("enforces absolute-only task reference files through managed tools and the preview route", async () => {
    const harness = await createHarness();
    const app = await createTaskReferenceRouteApp(harness);
    try {
      await expect(executeDelegateTask(harness, {
        recipient_name: "./worker",
        description: "Use the attached classroom problem.",
        reference_files: ["math_problem_train_bird.txt"],
      })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.",
      });
      await expect(harness.recordsService.getTaskDelegationRecords(teamRunId))
        .resolves.toEqual([]);
      expect(harness.backend.taskAgentStarts).toEqual([]);

      const referenceDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-reference-absolute-"));
      tempDirs.push(referenceDir);
      const absoluteReferencePath = path.join(referenceDir, "math_problem_train_bird.txt");
      await fs.writeFile(absoluteReferencePath, "Train-bird math problem content", "utf-8");
      const createdAbsoluteReferenceTask = await executeDelegateTask(harness, {
        recipient_name: "./worker",
        description: "Use the attached absolute classroom problem.",
        reference_files: [absoluteReferencePath],
      });
      expect(createdAbsoluteReferenceTask).toEqual({
        task_id: expect.stringMatching(/^task_\d{4}$/),
        status: "active",
      });
      const absoluteReferenceTaskId = createdAbsoluteReferenceTask.task_id;

      const recordsAfterDelegate = await harness.recordsService.getTaskDelegationRecords(teamRunId);
      expect(recordsAfterDelegate).toHaveLength(1);
      expect(recordsAfterDelegate[0]!.taskId).toBe(absoluteReferenceTaskId);
      const taskReference = recordsAfterDelegate[0]!.referenceFiles[0]!;
      expect(taskReference).toMatchObject({
        referenceId: expect.stringMatching(/^task-reference:0:[a-f0-9]{32}$/),
        path: absoluteReferencePath,
        type: "file",
      });
      expect(taskReference.referenceId).not.toContain(absoluteReferencePath);

      const contentResponse = await app.inject({
        method: "GET",
        url: taskReferenceContentUrl({
          teamRunId,
          taskId: absoluteReferenceTaskId,
          referenceId: taskReference.referenceId,
        }),
      });
      if (contentResponse.statusCode !== 200) {
        throw new Error(
          `Expected task reference content route to return 200 for persisted absolute reference `
          + `${JSON.stringify(taskReference)}, received ${contentResponse.statusCode}: ${contentResponse.payload}`,
        );
      }
      expect(contentResponse.statusCode).toBe(200);
      expect(contentResponse.payload).toBe("Train-bird math problem content");
      expect(String(contentResponse.headers["content-type"])).toContain("text/plain");
      expect(contentResponse.headers["cache-control"]).toBe("no-store");

      await expect(executeSubmitTaskResultAsTaskAgent(harness, absoluteReferenceTaskId, {
        message: "Result with a relative reference.",
        reference_files: ["relative-result.md"],
      })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.",
      });
      const recordsAfterRejectedSubmission = recordsById(
        await harness.recordsService.getTaskDelegationRecords(teamRunId),
      );
      expect(recordsAfterRejectedSubmission.get(absoluteReferenceTaskId)).toMatchObject({
        status: "active",
        updates: [],
      });

      await expect(executeSubmitTaskResultAsTaskAgent(harness, absoluteReferenceTaskId, {
        message: "Result with an absolute reference.",
        reference_files: [absoluteReferencePath],
      })).resolves.toEqual({
        task_id: absoluteReferenceTaskId,
        status: "awaiting_review",
      });
      await expect(executeCoordinatorReview(harness, {
        task_id: absoluteReferenceTaskId,
        decision: "request_revision",
        comment: "Please revise with an absolute artifact reference.",
        reference_files: ["relative-revision.md"],
      })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        message: "reference_files must be an array of absolute local file path strings. Invalid index=0 reason=path must be absolute.",
      });
      const recordsAfterRejectedReview = recordsById(
        await harness.recordsService.getTaskDelegationRecords(teamRunId),
      );
      expect(recordsAfterRejectedReview.get(absoluteReferenceTaskId)).toMatchObject({
        status: "awaiting_review",
        updates: [
          expect.objectContaining({
            kind: "submission",
            referenceFiles: [expect.objectContaining({ path: absoluteReferencePath })],
          }),
        ],
      });
      expect(recordsAfterRejectedReview.get(absoluteReferenceTaskId)!.updates).toHaveLength(1);

      harness.runRegistry.clear();
      await harness.recordsService.persistRecord(
        { rootTeamRunId: teamRunId, currentTeamRunId: teamRunId, teamRunPath: [] },
        legacyRelativeReferenceRecord({
          taskId: "task_legacy_relative",
          referenceId: "task-reference:0:math_problem_train_bird.txt",
          referencePath: "math_problem_train_bird.txt",
        }),
      );
      const legacyResponse = await app.inject({
        method: "GET",
        url: taskReferenceContentUrl({
          teamRunId,
          taskId: "task_legacy_relative",
          referenceId: "task-reference:0:math_problem_train_bird.txt",
        }),
      });
      expect(legacyResponse.statusCode).toBe(400);
      expect(legacyResponse.json()).toEqual(expect.objectContaining({
        code: "INVALID_REFERENCE_PATH",
      }));
    } finally {
      await app.close();
      harness.runRegistry.clear();
      await harness.manager.terminateTeamRun(harness.backend.runId).catch(() => undefined);
    }
  });

  it("lets a task-agent delegate child work and review the child through tight task-agent identity", async () => {
    const harness = await createHarness();
    await executeDelegateTask(harness, memberDelegationInput("worker", "Parent worker task."));
    const parentTaskAgent = findTaskAgentIdentity(harness.backend, "task_0001");
    expect(buildTaskAgentToolContext(harness, "task_0001").addressing).toEqual({
      rootTeamRunId: teamRunId,
      memberAddress: "/worker",
    });

    const childCreated = await executeDelegateTaskAsTaskAgent(
      harness,
      "task_0001",
      memberDelegationInput("reviewer", "Child reviewer task from parent task-agent."),
    );
    expect(childCreated).toEqual({
      task_id: "task_0002",
      status: "active",
    });
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
      .resolves.toEqual({ task_id: "task_0002", status: "accepted" });
    const reviewPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_REVIEWED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(reviewPayload).toMatchObject({
      taskId: "task_0002",
      status: "accepted",
      decision: "accept",
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
      recipient_name: "./design_team",
      description: "Coordinate a feature design as the accountable team.",
    });
    expect(created).toEqual({
      task_id: "task_0001",
      status: "active",
    });
    const firstTaskTeamRunId = findTaskTeamIdentity(harness.backend, "task_0001").taskTeamRunId;
    expect(firstTaskTeamRunId).toMatch(/^design_team_[a-f0-9]{32}$/);
    const firstTaskTeam = harness.backend.getTaskTeamChild(firstTaskTeamRunId!);
    expect(firstTaskTeam).not.toBeNull();
    expect(activeDirectory.resolveActiveRun(firstTaskTeamRunId!)?.runId).toBe(firstTaskTeamRunId);
    expect(firstTaskTeam!.backend.messages[0]).toMatchObject({
      targetRouteKey: "design_team/team_lead",
      metadata: expect.objectContaining({ message_type: "task_team_delegation_work_packet" }),
    });

    const firstIngressContext = buildToolContext(
      firstTaskTeam!.run,
      firstTaskTeam!.run.config!.coordinatorMemberRouteKey!,
      null,
      firstTaskTeam!.identity,
    );
    expect(firstIngressContext.addressing).toEqual({
      rootTeamRunId: teamRunId,
      memberAddress: "/design_team/team_lead",
    });
    const childCreated = await executeDelegateTaskWithContext(
      harness,
      firstIngressContext,
      memberDelegationInput("implementer", "Implement the child team design check."),
    );
    expect(childCreated).toEqual({
      task_id: "task_0002",
      status: "active",
    });
    const childTaskId = childCreated.task_id;
    expect(firstTaskTeam!.backend.taskAgentStarts).toHaveLength(1);
    const recordsAfterChildDelegation = recordsById(await harness.recordsService.getTaskDelegationRecords(teamRunId));
    expect([...recordsAfterChildDelegation.keys()]).toEqual(["task_0001", "task_0002"]);
    expect(recordsAfterChildDelegation.get("task_0001")).toMatchObject({
      receiverTargetKind: "team",
      receiverAddress: {
        segments: [
          { kind: "member", memberRouteKey: "design_team" },
          { kind: "task_team", taskTeamRunId: firstTaskTeamRunId },
          { kind: "member", memberRouteKey: "team_lead" },
        ],
      },
    });
    expect(recordsAfterChildDelegation.get(childTaskId)).toMatchObject({
      taskId: childTaskId,
      status: "active",
      senderAddress: {
        segments: [
          { kind: "member", memberRouteKey: "design_team" },
          { kind: "task_team", taskTeamRunId: firstTaskTeamRunId },
          { kind: "member", memberRouteKey: "team_lead" },
        ],
      },
      receiverAddress: {
        segments: [
          { kind: "member", memberRouteKey: "design_team" },
          { kind: "task_team", taskTeamRunId: firstTaskTeamRunId },
          { kind: "member", memberRouteKey: "implementer" },
        ],
      },
      receiverTargetKind: "member",
      taskRun: {
        address: {
          segments: [
            { kind: "member", memberRouteKey: "design_team" },
            { kind: "task_team", taskTeamRunId: firstTaskTeamRunId },
            { kind: "member", memberRouteKey: "implementer" },
            { kind: "task_agent", taskAgentRunId: findTaskAgentIdentity(firstTaskTeam!.backend, childTaskId).taskAgentRunId },
          ],
        },
      },
    });
    await expect(
      fs.access(path.join(harness.memoryDir, "agent_teams", firstTaskTeamRunId!, "task_delegation_records.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    await expect(executeSubmitTaskResultWithContext(harness, firstIngressContext, {
      message: "Team draft result.",
    })).resolves.toEqual({
      task_id: "task_0001",
      status: "awaiting_review",
    });
    expect(harness.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "coordinator",
      targetMemberRunId: null,
    });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(1);
    const teamSubmissionPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(teamSubmissionPayload).toMatchObject({
      taskId: "task_0001",
      status: "awaiting_review",
      submissionId: "task_0001_submission_0001",
    });

    await expect(executeCoordinatorReview(harness, {
      task_id: "task_0001",
      decision: "request_revision",
      comment: "Please revise the team result.",
    })).resolves.toEqual({
      task_id: "task_0001",
      status: "active",
    });
    expect(harness.backend.taskTeamPosts).toEqual([
      expect.objectContaining({
        routeKey: "design_team",
        requestedRunId: firstTaskTeamRunId,
        accepted: true,
      }),
    ]);
    expect(firstTaskTeam!.backend.messages.at(-1)).toMatchObject({
      targetRouteKey: "design_team/team_lead",
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
    })).resolves.toEqual({
      task_id: "task_0001",
      status: "accepted",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.backend.taskTeamSettlements).toHaveLength(0);
    expect(activeDirectory.resolveActiveRun(firstTaskTeamRunId!)?.runId).toBe(firstTaskTeamRunId);

    const childTaskAgentContext = buildTaskAgentToolContextForRun(firstTaskTeam!.run, firstTaskTeam!.backend, childTaskId);
    await executeSubmitTaskResultWithContext(harness, childTaskAgentContext, {
      message: "Child implementation complete.",
    });
    await executeReviewTaskResultWithContext(harness, firstIngressContext, {
      task_id: childTaskId,
      decision: "accept",
    });
    publishIdleEvent(firstTaskTeam!.backend, childTaskId);
    await vi.waitFor(() => {
      expect(firstTaskTeam!.backend.taskAgentSettlementAttempts).toEqual([
        expect.objectContaining({
          routeKey: "implementer",
          requestedRunId: findTaskAgentIdentity(firstTaskTeam!.backend, childTaskId).taskAgentRunId,
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
      recipient_name: "./design_team",
      description: "Coordinate a follow-up feature design.",
    });
    expect(secondCreated).toEqual({
      task_id: "task_0003",
      status: "active",
    });
    const secondTaskTeamRunId = findTaskTeamIdentity(harness.backend, "task_0003").taskTeamRunId;
    expect(secondTaskTeamRunId).toMatch(/^design_team_[a-f0-9]{32}$/);
    expect(secondTaskTeamRunId).not.toBe(firstTaskTeamRunId);
    const secondTaskTeam = harness.backend.getTaskTeamChild(secondTaskTeamRunId!);
    expect(secondTaskTeam).not.toBeNull();
    expect(activeDirectory.resolveActiveRun(secondTaskTeamRunId!)?.runId).toBe(secondTaskTeamRunId);
    const secondIngressContext = buildToolContext(
      secondTaskTeam!.run,
      secondTaskTeam!.run.config!.coordinatorMemberRouteKey!,
      null,
      secondTaskTeam!.identity,
    );

    await executeSubmitTaskResultWithContext(harness, secondIngressContext, {
      message: "Second team result.",
    });
    await executeCoordinatorReview(harness, {
      task_id: "task_0003",
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
    expect((await harness.recordsService.getTaskDelegationRecords(teamRunId)).map((record) => record.taskId))
      .toEqual(["task_0001", "task_0002", "task_0003"]);

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

    expect(rejected).toEqual({
      task_id: "task_0001",
      status: "not_started",
      message: "worker route rejected task activation",
    });
    expect(accepted).toEqual({
      task_id: "task_0002",
      status: "active",
    });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    const activationPayload = (taskDelegationEvents(harness.backend, "TASK_DELEGATION_ACTIVATED")[0]?.data as TeamRunTaskDelegationEventPayload).payload as Record<string, unknown>;
    expect(activationPayload).toMatchObject({ taskIds: ["task_0002"] });
    expect(taskDelegationEvents(harness.backend, "TASK_DELEGATION_STATUS_UPDATED")).toHaveLength(0);
    expect((await harness.recordsService.getTaskDelegationRecords(teamRunId)).map((record) => record.taskId))
      .toEqual(["task_0002"]);
    await expect(executeCoordinatorReview(harness, { task_id: "task_0001", decision: "accept" }))
      .rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
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
