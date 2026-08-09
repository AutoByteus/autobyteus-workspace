import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import type {
  StartTaskAgentInstanceRequest,
  TaskAgentInstanceIdentity,
} from "../../../src/agent-team-execution/domain/task-agent-instance.js";
import type { StartTaskTeamInstanceRequest } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
  type TeamRunEventUnsubscribe,
  type TeamRunTaskDelegationEventPayload,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { TeamRecipientResolver } from "../../../src/agent-team-execution/services/team-recipient-resolver.js";
import { TeamRunTreeIndex } from "../../../src/agent-team-execution/services/team-run-tree-index.js";
import {
  disposeTaskAgentDirectory,
  getTaskAgentDirectory,
} from "../../../src/agent-team-execution/task-delegation/task-agent-directory.js";
import {
  clearTaskTeamActiveRunDirectory,
} from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import type {
  DelegateTaskResult,
  ReviewTaskResultResult,
  SubmitTaskResultResult,
  TaskDelegationContext,
  TaskDelegationRecord,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-record.js";
import { TaskDelegationRunRegistry } from "../../../src/agent-team-execution/task-delegation/task-delegation-run-registry.js";
import { TaskDelegationRecordsService } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-service.js";
import { TaskDelegationReferenceContentService } from "../../../src/agent-team-execution/task-delegation/task-delegation-reference-content-service.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import { TaskDelegationToolRunRouter } from "../../../src/agent-tools/task-delegation/task-delegation-tool-run-router.js";
import { TaskDelegationToolService } from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import { registerTaskDelegationRoutes } from "../../../src/api/rest/task-delegation.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  address,
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const rootTeamRunId = "task-delegation-integration-run";
const delegateEntry = getTaskDelegationToolManifestEntry(DELEGATE_TASK_TOOL_NAME);
const submitEntry = getTaskDelegationToolManifestEntry(SUBMIT_TASK_RESULT_TOOL_NAME);
const reviewEntry = getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME);
const tempDirs: string[] = [];
const registries: TaskDelegationRunRegistry[] = [];

class ManagedTaskBackend implements TeamRunBackend {
  readonly teamRunId = rootTeamRunId;
  readonly runId = rootTeamRunId;
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly taskAgentStarts: StartTaskAgentInstanceRequest[] = [];
  readonly taskTeamStarts: StartTaskTeamInstanceRequest[] = [];
  readonly taskAgentSettlements: Array<{ address: AgentTeamAddress; runId: string }> = [];
  readonly postedMessages: Array<{
    message: AgentInputUserMessage;
    target?: AgentTeamAddress | null;
    targetAgentRunId?: string | null;
  }> = [];
  readonly publishedEvents: TeamRunEvent[] = [];
  readonly taskAgentStartResults: AgentOperationResult[] = [];
  private readonly listeners = new Set<TeamRunEventListener>();

  constructor(private readonly runtimeContext: MixedTeamRunContext) {}

  getRuntimeContext(): MixedTeamRunContext { return this.runtimeContext; }
  isActive(): boolean { return true; }
  getLeafAgentStatusSnapshots() { return []; }
  hasOpenExecutionWork(): boolean { return false; }
  subscribeToEvents(listener: TeamRunEventListener): TeamRunEventUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  resolveRecipient(recipientAddress: string, caller: ReturnType<typeof createMemberLogicalAddressContext>) {
    return new TeamRecipientResolver().resolve(
      new TeamRunTreeIndex(buildConfig().rootTeam),
      recipientAddress,
      caller,
    );
  }
  async postMessage(
    message: AgentInputUserMessage,
    target?: AgentTeamAddress | null,
    targetAgentRunId?: string | null,
  ): Promise<AgentOperationResult> {
    this.postedMessages.push({ message, target, targetAgentRunId });
    return { accepted: true };
  }
  async deliverInterAgentMessage(_intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    return { accepted: true };
  }
  async approveToolInvocation(): Promise<AgentOperationResult> { return { accepted: true }; }
  async interruptMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async startTaskAgentInstance(request: StartTaskAgentInstanceRequest): Promise<AgentOperationResult> {
    this.taskAgentStarts.push(request);
    return this.taskAgentStartResults.shift() ?? { accepted: true };
  }
  async settleTaskAgentInstance(
    memberAddress: AgentTeamAddress,
    taskAgentRunId: string,
  ): Promise<AgentOperationResult> {
    this.taskAgentSettlements.push({ address: memberAddress, runId: taskAgentRunId });
    return { accepted: true };
  }
  async startTaskTeamInstance(request: StartTaskTeamInstanceRequest): Promise<AgentOperationResult> {
    this.taskTeamStarts.push(request);
    return { accepted: true };
  }
  async postMessageToTaskTeamInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleTaskTeamInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async terminate(): Promise<AgentOperationResult> { return { accepted: true }; }
  publishEvent(event: TeamRunEvent): void {
    this.publishedEvents.push(event);
    for (const listener of this.listeners) listener(event);
  }
}

const buildConfig = () => testTeamRunConfig({
  rootTeamRunId,
  rootTeamDefinitionId: "task-delegation-integration-team",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", {
      agentRunId: "run-coordinator",
      agentDefinitionId: "agent-coordinator",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/worker", {
      agentRunId: "run-worker",
      agentDefinitionId: "agent-worker",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/reviewer", {
      agentRunId: "run-reviewer",
      agentDefinitionId: "agent-reviewer",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentTeamNode({
      address: "/design_team",
      coordinatorAddress: "/design_team/team_lead",
      teamRunId: "persistent-design-team-run",
      teamDefinitionId: "team-def-design",
      children: [
        testAgentNode("/design_team/team_lead", {
          agentRunId: "run-team-lead",
          agentDefinitionId: "agent-team-lead",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        }),
        testAgentNode("/design_team/implementer", {
          agentRunId: "run-implementer",
          agentDefinitionId: "agent-implementer",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        }),
      ],
    }),
  ],
});

const createHarness = async () => {
  disposeTaskAgentDirectory(rootTeamRunId);
  clearTaskTeamActiveRunDirectory();
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-delegation-integration-"));
  tempDirs.push(memoryDir);
  const config = buildConfig();
  const runtimeContext = new MixedTeamRunContext({
    memberContexts: [
      new MixedAgentMemberContext({
        address: address("/coordinator"),
        agentRunId: "run-coordinator",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: null,
      }),
      new MixedAgentMemberContext({
        address: address("/worker"),
        agentRunId: "run-worker",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: null,
      }),
      new MixedAgentMemberContext({
        address: address("/reviewer"),
        agentRunId: "run-reviewer",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: null,
      }),
      new MixedSubTeamMemberContext({
        address: address("/design_team"),
        teamDefinitionId: "team-def-design",
        teamRunId: "persistent-design-team-run",
        childRuntimeContext: null,
      }),
    ],
    teamExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId,
      memberAddress: "/",
    }),
  });
  const context = new TeamRunContext({
    teamRunId: rootTeamRunId,
    teamAddress: address("/"),
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext,
  });
  const backend = new ManagedTaskBackend(runtimeContext);
  const run = new TeamRun({ context, backend });
  const recordsService = new TaskDelegationRecordsService({ memoryDir });
  let allocation = 0;
  const runRegistry = new TaskDelegationRunRegistry({
    recordsService,
    agentRunIdentityAllocator: {
      allocateForAgentDefinition: async (agentDefinitionId: string) => {
        allocation += 1;
        const prefix = agentDefinitionId.replace(/^agent-/, "").replaceAll("-", "_");
        return `${prefix}_${String(allocation).padStart(32, "0")}`;
      },
    },
  });
  registries.push(runRegistry);
  const runRouter = new TaskDelegationToolRunRouter({
    teamRunService: {
      resolveTeamRun: async (teamRunId: string) => teamRunId === rootTeamRunId ? run : null,
    } as never,
    runRegistry,
  });
  return {
    backend,
    run,
    runRegistry,
    recordsService,
    service: new TaskDelegationToolService({ runRouter }),
    coordinatorContext: persistentContext("/coordinator", "run-coordinator"),
  };
};

type Harness = Awaited<ReturnType<typeof createHarness>>;

const persistentContext = (
  memberAddress: AgentTeamAddress,
  agentRunId: string,
): TaskDelegationContext => ({
  teamRunId: rootTeamRunId,
  teamDefinitionId: "task-delegation-integration-team",
  teamName: "Task Delegation Integration Team",
  caller: {
    executionAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress }),
    agentRunId,
    taskAgentInstance: null,
    taskTeamInstance: null,
  },
  coordinatorAddress: address("/coordinator"),
  addressing: createMemberLogicalAddressContext({ rootTeamRunId, memberAddress }),
});

const taskAgentContext = (harness: Harness, taskId: string): TaskDelegationContext => {
  const start = harness.backend.taskAgentStarts.find((candidate) => candidate.identity.taskId === taskId);
  if (!start) throw new Error(`Task '${taskId}' was not activated.`);
  const identity = start.identity;
  const active = getTaskAgentDirectory(rootTeamRunId).resolveTaskAgentRunId(identity.taskAgentRunId);
  if (!active) throw new Error(`Task Agent '${identity.taskAgentRunId}' is not active.`);
  return {
    teamRunId: identity.owningTeamRunId,
    teamDefinitionId: "task-delegation-integration-team",
    teamName: "Task Delegation Integration Team",
    caller: {
      executionAddress: start.receiver,
      agentRunId: identity.taskAgentRunId,
      taskAgentInstance: identity,
      taskTeamInstance: null,
    },
    coordinatorAddress: address("/coordinator"),
    addressing: createMemberLogicalAddressContext({
      rootTeamRunId,
      memberAddress: active.memberAddress,
    }),
  };
};

const executeDelegate = async (
  harness: Harness,
  context: TaskDelegationContext,
  input: Record<string, unknown>,
): Promise<DelegateTaskResult> => delegateEntry.execute(
  harness.service,
  context,
  delegateEntry.parseInput(input),
) as Promise<DelegateTaskResult>;

const executeSubmit = async (
  harness: Harness,
  context: TaskDelegationContext,
  input: Record<string, unknown>,
): Promise<SubmitTaskResultResult> => submitEntry.execute(
  harness.service,
  context,
  submitEntry.parseInput(input),
) as Promise<SubmitTaskResultResult>;

const executeReview = async (
  harness: Harness,
  context: TaskDelegationContext,
  input: Record<string, unknown>,
): Promise<ReviewTaskResultResult> => reviewEntry.execute(
  harness.service,
  context,
  reviewEntry.parseInput(input),
) as Promise<ReviewTaskResultResult>;

const publishIdle = (backend: ManagedTaskBackend, taskId: string): void => {
  const start = backend.taskAgentStarts.find((candidate) => candidate.identity.taskId === taskId);
  if (!start) throw new Error(`Task '${taskId}' was not activated.`);
  backend.publishEvent({
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: rootTeamRunId,
    executionAddress: start.receiver,
    data: {
      runtimeKind: start.sourceNode.runtimeKind,
      executionAddress: start.receiver,
      displayName: start.sourceNode.address.slice(1),
      taskAgentInstance: start.identity,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: start.identity.taskAgentRunId,
        payload: { status: "idle" },
        statusHint: "IDLE",
      },
    },
  });
};

const eventPayloads = (
  backend: ManagedTaskBackend,
  eventType: TeamRunTaskDelegationEventPayload["eventType"],
): TeamRunTaskDelegationEventPayload[] => backend.publishedEvents
  .filter((event) => event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION)
  .map((event) => event.data as TeamRunTaskDelegationEventPayload)
  .filter((payload) => payload.eventType === eventType);

const recordsById = (records: readonly TaskDelegationRecord[]) =>
  new Map(records.map((record) => [record.taskId, record]));

const createReferenceApp = async (harness: Harness): Promise<FastifyInstance> => {
  const app = fastify();
  await registerTaskDelegationRoutes(app, {
    contentService: new TaskDelegationReferenceContentService(
      harness.runRegistry,
      harness.recordsService,
    ),
  });
  return app;
};

afterEach(async () => {
  for (const registry of registries.splice(0)) registry.clear();
  disposeTaskAgentDirectory(rootTeamRunId);
  clearTaskTeamActiveRunDirectory();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("task delegation tool lifecycle integration", () => {
  it("routes manifest parsing through durable delegate, submit, review, persistence, event, and idle-settlement boundaries", async () => {
    const harness = await createHarness();

    const created = await executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./worker",
      description: "Draft a validation note.",
    });
    expect(created).toEqual({ task_id: "task_0001", status: "active" });
    const start = harness.backend.taskAgentStarts[0]!;
    expect(start).toMatchObject({
      sourceNode: { address: "/worker", agentRunId: "run-worker" },
      receiver: {
        rootTeamRunId,
        taskTeamRunIds: [],
        memberAddress: "/worker",
        taskAgentRunId: start.identity.taskAgentRunId,
      },
      identity: {
        taskId: "task_0001",
        owningTeamRunId: rootTeamRunId,
      },
    });
    expect(start.message.content).toContain("submit_task_result");
    expect(start.message.content).toContain("review_task_result");
    expect(eventPayloads(harness.backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);

    await expect(executeSubmit(harness, taskAgentContext(harness, "task_0001"), {
      message: "Draft completed.",
    })).resolves.toEqual({ task_id: "task_0001", status: "awaiting_review" });
    expect(harness.backend.postedMessages.at(-1)).toMatchObject({
      target: "/coordinator",
      targetAgentRunId: null,
    });

    await expect(executeReview(harness, harness.coordinatorContext, {
      task_id: "task_0001",
      decision: "accept",
    })).resolves.toEqual({ task_id: "task_0001", status: "accepted" });
    publishIdle(harness.backend, "task_0001");
    await vi.waitFor(() => expect(harness.backend.taskAgentSettlements).toEqual([
      { address: "/worker", runId: start.identity.taskAgentRunId },
    ]));

    const records = recordsById(await harness.recordsService.getTaskDelegationRecords(rootTeamRunId));
    expect(records.get("task_0001")).toMatchObject({
      status: "accepted",
      senderAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: "/coordinator" }),
      receiverAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: "/worker" }),
      taskRun: { address: start.receiver },
      updates: [
        expect.objectContaining({ kind: "submission", submissionId: "task_0001_submission_0001" }),
        expect.objectContaining({ kind: "review", decision: "accept" }),
      ],
    });
    expect(records.get("task_0001")).not.toHaveProperty("target");
    expect(eventPayloads(harness.backend, "TASK_DELEGATION_RESULT_SUBMITTED")).toHaveLength(1);
    expect(eventPayloads(harness.backend, "TASK_DELEGATION_RESULT_REVIEWED")).toHaveLength(1);
  });

  it("authorizes active task-agent nested delegation by its exact directory-backed run identity", async () => {
    const harness = await createHarness();
    await executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./worker",
      description: "Parent worker task.",
    });
    const parentStart = harness.backend.taskAgentStarts[0]!;
    const parentContext = taskAgentContext(harness, "task_0001");

    await expect(executeDelegate(harness, parentContext, {
      recipient_address: "./reviewer",
      description: "Review the parent task output.",
    })).resolves.toEqual({ task_id: "task_0002", status: "active" });
    const childStart = harness.backend.taskAgentStarts[1]!;
    expect(childStart).toMatchObject({
      sourceNode: { address: "/reviewer", agentRunId: "run-reviewer" },
      identity: { taskId: "task_0002" },
    });

    await executeSubmit(harness, taskAgentContext(harness, "task_0002"), {
      message: "Child review complete.",
    });
    expect(harness.backend.postedMessages.at(-1)).toMatchObject({
      target: "/worker",
      targetAgentRunId: parentStart.identity.taskAgentRunId,
    });
    await expect(executeReview(harness, parentContext, {
      task_id: "task_0002",
      decision: "accept",
    })).resolves.toEqual({ task_id: "task_0002", status: "accepted" });

    const childRecord = (await harness.recordsService.getTaskDelegationRecords(rootTeamRunId))
      .find((record) => record.taskId === "task_0002");
    expect(childRecord).toMatchObject({
      senderAddress: parentStart.receiver,
      receiverAddress: createTeamExecutionAddress({ rootTeamRunId, memberAddress: "/reviewer" }),
      taskRun: { address: childStart.receiver },
    });
  });

  it("enforces absolute reference paths before mutation and serves persisted content through the REST boundary", async () => {
    const harness = await createHarness();
    await expect(executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./worker",
      description: "Use the classroom problem.",
      reference_files: ["relative-problem.txt"],
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(harness.backend.taskAgentStarts).toEqual([]);
    await expect(harness.recordsService.getTaskDelegationRecords(rootTeamRunId)).resolves.toEqual([]);

    const referenceDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-reference-integration-"));
    tempDirs.push(referenceDir);
    const referencePath = path.join(referenceDir, "problem.txt");
    await fs.writeFile(referencePath, "Train-bird math problem content", "utf8");
    await executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./worker",
      description: "Use the absolute classroom problem.",
      reference_files: [referencePath],
    });
    const record = (await harness.recordsService.getTaskDelegationRecords(rootTeamRunId))[0]!;
    const reference = record.referenceFiles[0]!;
    expect(reference).toMatchObject({ path: referencePath, type: "file" });
    expect(reference.referenceId).not.toContain(referencePath);

    const app = await createReferenceApp(harness);
    try {
      const response = await app.inject({
        method: "GET",
        url: `/team-runs/${encodeURIComponent(rootTeamRunId)}`
          + `/task-delegations/${encodeURIComponent(record.taskId)}`
          + `/references/${encodeURIComponent(reference.referenceId)}/content`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.payload).toBe("Train-bird math problem content");
      expect(response.headers["cache-control"]).toBe("no-store");
    } finally {
      await app.close();
    }
  });

  it("materializes task-Team identity from the rooted snapshot without a parallel route authority", async () => {
    const harness = await createHarness();
    await expect(executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./design_team",
      description: "Coordinate the design review.",
    })).resolves.toEqual({ task_id: "task_0001", status: "active" });

    expect(harness.backend.taskAgentStarts).toEqual([]);
    const start = harness.backend.taskTeamStarts[0]!;
    expect(start.identity).toMatchObject({
      taskTeamInstanceId: "task_team_task_0001",
      parentTeamRunId: rootTeamRunId,
      taskId: "task_0001",
    });
    expect(start.teamNode).toMatchObject({
      kind: "agent_team",
      address: "/design_team",
      coordinatorAddress: "/design_team/team_lead",
      teamRunId: start.identity.taskTeamRunId,
    });
    expect(start.receiver).toEqual(createTeamExecutionAddress({
      rootTeamRunId,
      taskTeamRunIds: [start.identity.taskTeamRunId],
      memberAddress: "/design_team/team_lead",
    }));
    expect(start.config.rootTeam.children.find((node) => node.address === "/design_team"))
      .toMatchObject({ teamRunId: start.identity.taskTeamRunId });

    const record = (await harness.recordsService.getTaskDelegationRecords(rootTeamRunId))[0]!;
    expect(record).toMatchObject({
      receiverTargetKind: "agent_team",
      receiverAddress: start.receiver,
      taskRun: {
        address: createTeamExecutionAddress({
          rootTeamRunId,
          taskTeamRunIds: [start.identity.taskTeamRunId],
          memberAddress: "/design_team",
        }),
      },
    });
    expect(record).not.toHaveProperty("ingress");
    expect(record).not.toHaveProperty("coordinator");
  });

  it("does not persist a rejected activation and allocates the next singular task cleanly", async () => {
    const harness = await createHarness();
    harness.backend.taskAgentStartResults.push(
      { accepted: false, code: "REJECTED", message: "worker rejected activation" },
      { accepted: true },
    );

    await expect(executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./worker",
      description: "Rejected work.",
    })).resolves.toEqual({
      task_id: "task_0001",
      status: "not_started",
      message: "worker rejected activation",
    });
    await expect(executeDelegate(harness, harness.coordinatorContext, {
      recipient_address: "./reviewer",
      description: "Accepted work.",
    })).resolves.toEqual({ task_id: "task_0002", status: "active" });

    expect((await harness.recordsService.getTaskDelegationRecords(rootTeamRunId)).map((record) => record.taskId))
      .toEqual(["task_0002"]);
    expect(eventPayloads(harness.backend, "TASK_DELEGATION_ACTIVATED")).toHaveLength(1);
    await expect(executeReview(harness, harness.coordinatorContext, {
      task_id: "task_0001",
      decision: "accept",
    })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
  });

  it("keeps the model-facing task surface limited to the three current lifecycle tools", () => {
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      DELEGATE_TASK_TOOL_NAME,
      SUBMIT_TASK_RESULT_TOOL_NAME,
      REVIEW_TASK_RESULT_TOOL_NAME,
    ]);
    for (const oldName of [
      "create_task",
      "create_tasks",
      "get_my_tasks",
      "get_task_plan_status",
      "assign_task_to",
      "accept_task",
    ]) expect(TASK_DELEGATION_TOOL_NAME_LIST).not.toContain(oldName);
  });
});
