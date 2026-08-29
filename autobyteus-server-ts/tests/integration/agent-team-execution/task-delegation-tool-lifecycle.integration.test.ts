import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import type { AgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import type { PreparedLocalExecutionTermination } from "../../../src/agent-team-execution/domain/prepared-local-execution-termination.js";
import type { PreparedTaskExecution } from "../../../src/agent-team-execution/domain/prepared-task-execution.js";
import type { PreparedTaskSettlement } from "../../../src/agent-team-execution/domain/prepared-task-settlement.js";
import { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { PrepareTaskAgentInput } from "../../../src/agent-team-execution/domain/task-agent-execution.js";
import type { PrepareTaskTeamInput } from "../../../src/agent-team-execution/domain/task-team-execution.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createTeamMemberExecutionIdentity } from "../../../src/agent-team-execution/domain/team-member-execution-identity.js";
import type { TeamMemberExecutionCommand } from "../../../src/agent-team-execution/domain/team-member-execution-command.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
  type TeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";
import { TeamRunPersistenceCoordinator } from "../../../src/agent-team-execution/services/team-run-persistence-coordinator.js";
import { TaskDelegationRecordsV1Store, getTaskDelegationRecordsV1Path } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAME_LIST,
} from "../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "../../../src/agent-tools/task-delegation/task-delegation-tool-manifest.js";
import { TaskDelegationToolService } from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const rootTeamRunId = "task-delegation-integration-run";
const tempDirs: string[] = [];

const findTeamNode = (root: TeamRunAgentTeamNode, teamRunId: string): TeamRunAgentTeamNode | null => {
  if (root.teamRunId === teamRunId) return root;
  for (const child of root.children) {
    if (child.kind !== "agent_team") continue;
    const found = findTeamNode(child, teamRunId);
    if (found) return found;
  }
  return null;
};

class PreparedTask implements PreparedTaskExecution {
  readonly binding;
  readonly preparedTeamRuns;
  readonly stagedPlatformBindings = Object.freeze([]);
  readonly releaseWork = vi.fn();
  readonly abort = vi.fn(async () => undefined);
  private state: "open" | "sealed" | "committed" | "aborted" = "open";

  constructor(input: {
    binding: PreparedTaskExecution["binding"];
    preparedTeamRuns?: readonly TeamRun[];
  }) {
    this.binding = input.binding;
    this.preparedTeamRuns = Object.freeze([...(input.preparedTeamRuns ?? [])]);
  }

  sealForCommit(): void {
    if (this.state !== "open") throw new Error("Task preparation cannot be sealed twice.");
    this.state = "sealed";
  }

  commitAfterDurability() {
    if (this.state !== "sealed") throw new Error("Task preparation was not sealed.");
    this.state = "committed";
    return Object.freeze({ releaseWork: this.releaseWork });
  }
}

class TestTeamBackend implements TeamRunBackend {
  readonly teamBackendKind = TeamBackendKind.MIXED;
  readonly runtimeContext: MixedTeamRunContext;
  readonly context: TeamRunContext<MixedTeamRunContext>;
  readonly preparedAgents: PrepareTaskAgentInput[] = [];
  readonly preparedTeams: PrepareTaskTeamInput[] = [];
  readonly commands: Array<{ agentRunId: string; command: TeamMemberExecutionCommand }> = [];
  readonly children = new Map<string, TestTeamBackend>();
  active = true;

  constructor(
    readonly physicalScope: TeamRunPhysicalScope,
    readonly teamNode: TeamRunAgentTeamNode,
    readonly config: TeamRunConfig,
  ) {
    this.runtimeContext = new MixedTeamRunContext({
      memberContexts: teamNode.children.filter((node) => node.kind === "agent").map((node) =>
        new MixedAgentMemberContext({
          address: node.address,
          agentRunId: node.agentRunId,
          runtimeKind: node.runtimeKind,
          platformAgentRunId: node.platformAgentRunId,
        })),
    });
    this.context = new TeamRunContext({
      physicalScope,
      teamRunId: teamNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode,
      handoffs: config.handoffs,
      runtimeContext: this.runtimeContext,
    });
  }

  get rootTeamRunId(): string { return this.physicalScope.rootTeamRunId; }
  get teamRunId(): string { return this.teamNode.teamRunId; }
  getRuntimeContext(): MixedTeamRunContext { return this.runtimeContext; }
  isActive(): boolean { return this.active; }
  getLeafAgentStatusSnapshots() { return []; }
  hasOpenExecutionWork(): boolean { return false; }
  async getOrCreateConfiguredChildTeam(teamRunId: string): Promise<TeamRun> {
    const existing = this.children.get(teamRunId);
    if (existing) return new TeamRun(existing.context, existing);
    const node = this.teamNode.children.find((child) => child.kind === "agent_team" && child.teamRunId === teamRunId);
    if (!node || node.kind !== "agent_team") throw new Error(`Configured child TeamRun '${teamRunId}' was not found.`);
    const child = new TestTeamBackend(
      createChildTeamRunPhysicalScope(this.physicalScope, node.teamRunId),
      node,
      this.config,
    );
    this.children.set(teamRunId, child);
    return new TeamRun(child.context, child);
  }
  async reserveDirectAgentInput(): Promise<AgentRunInputReservationResult> {
    return { accepted: false, code: "NOT_REQUIRED", message: "Reservation is outside this integration scenario." };
  }
  async deliverToDirectAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    return this.executeDirectAgentCommand(agentRunId, { kind: "post_message", message });
  }
  async executeDirectAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    this.commands.push({ agentRunId, command });
    return { accepted: true };
  }
  async prepareTaskAgent(input: PrepareTaskAgentInput): Promise<PreparedTaskExecution> {
    this.preparedAgents.push(input);
    return new PreparedTask({
      binding: Object.freeze({ kind: "agent", address: input.address, agentRunId: input.agentRunId }),
    });
  }
  async prepareTaskTeam(input: PrepareTaskTeamInput): Promise<PreparedTaskExecution> {
    this.preparedTeams.push(input);
    const taskBackend = new TestTeamBackend(
      createChildTeamRunPhysicalScope(this.physicalScope, input.teamNode.teamRunId),
      input.teamNode,
      this.config,
    );
    this.children.set(input.teamRunId, taskBackend);
    const coordinator = input.teamNode.children.find((node) =>
      node.kind === "agent" && node.address === input.teamNode.coordinatorAddress,
    );
    if (!coordinator || coordinator.kind !== "agent") throw new Error("Task Team coordinator was not materialized.");
    return new PreparedTask({
      binding: Object.freeze({
        kind: "team",
        address: input.address,
        teamRunId: input.teamRunId,
        coordinatorAgentRunId: coordinator.agentRunId,
      }),
      preparedTeamRuns: [new TeamRun(taskBackend.context, taskBackend)],
    });
  }
  async prepareDirectTaskSettlement(): Promise<PreparedTaskSettlement | null> { return null; }
  async prepareTermination(): Promise<PreparedLocalExecutionTermination> {
    return Object.freeze({
      cancel: () => undefined,
      commit: () => Object.freeze({ finish: () => this.terminate() }),
    });
  }
  async terminate(): Promise<AgentOperationResult> { this.active = false; return { accepted: true }; }
}

const config = () => {
  const designLead = testAgentNode("/design_team/team_lead", {
    agentRunId: "configured-design-lead",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  });
  const implementer = testAgentNode("/design_team/implementer", {
    agentRunId: "configured-implementer",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
  });
  return testTeamRunConfig({
    rootTeamRunId,
    rootTeamDefinitionId: "task-delegation-integration-team",
    coordinatorAddress: "/coordinator",
    children: [
      testAgentNode("/coordinator", {
        agentRunId: "run-coordinator",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      }),
      testAgentNode("/worker", {
        agentRunId: "run-worker",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      testAgentNode("/reviewer", {
        agentRunId: "run-reviewer",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      }),
      testAgentTeamNode({
        address: "/design_team",
        coordinatorAddress: designLead.address,
        teamRunId: "configured-design-team-run",
        teamDefinitionId: "design-team-definition",
        children: [designLead, implementer],
      }),
    ],
  });
};

const createHarness = async () => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-delegation-current-integration-"));
  tempDirs.push(memoryDir);
  AgentRunIdentityAllocator.getInstance({
    memoryDir,
    agentDefinitionService: {
      getAgentDefinitionById: async (id: string) => ({ id, name: id }) as never,
    },
    agentRunManager: { hasActiveRun: () => false },
    agentRunMetadataService: { readMetadata: async () => null },
    teamRunExecutionTreeLocationService: { containsRunId: async () => false },
  });
  const currentConfig = config();
  const tree = buildInitialTeamRunExecutionTree({ config: currentConfig, teamDefinitionName: "Task Integration Team" });
  const tasks = Object.freeze({ schemaVersion: 1 as const, rootTeamRunId, records: Object.freeze([]) });
  const messages = Object.freeze({ schemaVersion: 1 as const, rootTeamRunId, messages: Object.freeze([]) });
  const rootDir = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  const treeStore = new TeamRunExecutionTreeStore();
  const taskStore = new TaskDelegationRecordsV1Store();
  const communicationStore = new TeamCommunicationV1Store();
  await Promise.all([
    treeStore.write(rootDir, tree),
    taskStore.write(rootDir, tasks),
    communicationStore.write(rootDir, messages),
  ]);
  const backend = new TestTeamBackend(
    createRootTeamRunPhysicalScope(rootTeamRunId),
    currentConfig.rootTeam,
    currentConfig,
  );
  const publisher = new TeamRunEventPublisher();
  let allocatedTaskAgentOrdinal = 0;
  let root: RootTeamRun | null = null;
  const persistence = new TeamRunPersistenceCoordinator({
    rootTeamRunId,
    teamMemoryDir: rootDir,
    executionTreeStore: treeStore,
    taskRecordsStore: taskStore,
    communicationStore,
    enterPersistenceFailStop: () => root?.enterPersistenceFailStop(),
  });
  root = new RootTeamRun({
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({
      allocateForAgentDefinition: async (agentDefinitionId) =>
        `task-${agentDefinitionId}-${++allocatedTaskAgentOrdinal}`,
    }),
    rootRun: new TeamRun(backend.context, backend),
    config: currentConfig,
    tree,
    tasks,
    messages,
    persistence,
    publisher,
  });
  const rootResolver = Object.freeze({
    resolveActiveRoot: async () => {
      if (!root?.isActive()) throw new Error("RootTeamRun is inactive.");
      return root;
    },
  });
  const service = new TaskDelegationToolService();
  return { memoryDir, rootDir, root, rootResolver, service, backend };
};

afterEach(async () => {
  vi.clearAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const context = (
  rootResolver: Awaited<ReturnType<typeof createHarness>>["rootResolver"],
  memberAddress: string,
  agentRunId: string,
  rootId = rootTeamRunId,
) => Object.freeze({
  identity: createTeamMemberExecutionIdentity({ rootTeamRunId: rootId, memberAddress, agentRunId }),
  rootResolver,
});

const execute = async (
  service: TaskDelegationToolService,
  name: typeof TASK_DELEGATION_TOOL_NAME_LIST[number],
  toolContext: ReturnType<typeof context>,
  raw: Record<string, unknown>,
) => {
  const entry = getTaskDelegationToolManifestEntry(name);
  return entry.execute(service, toolContext, entry.parseInput(raw) as never);
};

describe("current universal task-delegation tool lifecycle integration", () => {
  it("persists delegate -> submit -> request revision -> resubmit -> accept through the three public tools", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.rootResolver, "/coordinator", "run-coordinator");
    const created = await execute(harness.service, DELEGATE_TASK_TOOL_NAME, coordinator, {
      recipient_address: "/worker",
      description: "Solve the assigned classroom exercise and return evidence.",
      reference_files: [],
    });
    expect(created).toMatchObject({ status: "active", target_agent_run_id: expect.any(String) });
    const taskId = (created as { task_id: string }).task_id;
    const taskAgentRunId = (created as { target_agent_run_id: string }).target_agent_run_id;
    expect(harness.backend.preparedAgents[0]).toMatchObject({
      taskId,
      address: "/worker",
      agentRunId: taskAgentRunId,
      message: expect.objectContaining({
        content: expect.stringContaining("Task delegator AgentRun ID: run-coordinator"),
      }),
    });
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions[0]).toMatchObject({
      address: "/worker",
      agentRunId: taskAgentRunId,
      settledAt: null,
    });

    const assignee = context(harness.rootResolver, "/worker", taskAgentRunId);
    await expect(execute(harness.service, SUBMIT_TASK_RESULT_TOOL_NAME, assignee, {
      message: "Initial result.", reference_files: [],
    })).resolves.toMatchObject({ task_id: taskId, status: "awaiting_review" });
    await expect(execute(harness.service, REVIEW_TASK_RESULT_TOOL_NAME, coordinator, {
      task_id: taskId, decision: "request_revision", comment: "Add the verification step.", reference_files: [],
    })).resolves.toMatchObject({ task_id: taskId, status: "active" });
    await expect(execute(harness.service, SUBMIT_TASK_RESULT_TOOL_NAME, assignee, {
      message: "Revised result with verification.", reference_files: [],
    })).resolves.toMatchObject({ task_id: taskId, status: "awaiting_review" });
    await expect(execute(harness.service, REVIEW_TASK_RESULT_TOOL_NAME, coordinator, {
      task_id: taskId, decision: "accept", comment: null, reference_files: [],
    })).resolves.toMatchObject({ task_id: taskId, status: "accepted" });

    const records = harness.root.getTaskRecordsSnapshot().records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      taskId,
      delegatorAgentRunId: "run-coordinator",
      recipientAddress: "/worker",
      taskExecution: { agentRunId: taskAgentRunId },
      status: "accepted",
      updates: [
        expect.objectContaining({ message: "Initial result." }),
        expect.objectContaining({ decision: "request_revision", comment: "Add the verification step." }),
        expect.objectContaining({ message: "Revised result with verification." }),
        expect.objectContaining({ decision: "accept" }),
      ],
    });
    const persisted = JSON.parse(await fs.readFile(getTaskDelegationRecordsV1Path(harness.rootDir), "utf8"));
    expect(persisted.records[0]).toMatchObject({ taskId, status: "accepted" });
    expect(TASK_DELEGATION_TOOL_NAME_LIST).toEqual([
      "delegate_task", "submit_task_result", "review_task_result",
    ]);
  });

  it("keeps identical general and application identities bound to their own root capabilities", async () => {
    const general = await createHarness();
    const application = await createHarness();
    const generalCoordinator = context(general.rootResolver, "/coordinator", "run-coordinator");
    const applicationCoordinator = context(application.rootResolver, "/coordinator", "run-coordinator");

    await execute(application.service, DELEGATE_TASK_TOOL_NAME, applicationCoordinator, {
      recipient_address: "/worker",
      description: "Application-scoped task.",
      reference_files: [],
    });
    expect(application.root.getTaskRecordsSnapshot().records).toHaveLength(1);
    expect(general.root.getTaskRecordsSnapshot().records).toEqual([]);

    await execute(general.service, DELEGATE_TASK_TOOL_NAME, generalCoordinator, {
      recipient_address: "/worker",
      description: "General-scoped task.",
      reference_files: [],
    });
    expect(general.root.getTaskRecordsSnapshot().records).toHaveLength(1);
    expect(application.root.getTaskRecordsSnapshot().records).toHaveLength(1);
    expect(general.backend.preparedAgents).toHaveLength(1);
    expect(application.backend.preparedAgents).toHaveLength(1);
  });

  it("lets a fresh task Agent delegate a nested sibling task and preserves exact review ownership", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.rootResolver, "/coordinator", "run-coordinator");
    const parent = await execute(harness.service, DELEGATE_TASK_TOOL_NAME, coordinator, {
      recipient_address: "/worker", description: "Parent task", reference_files: [],
    }) as { task_id: string; target_agent_run_id: string };
    const parentContext = context(harness.rootResolver, "/worker", parent.target_agent_run_id);
    const child = await execute(harness.service, DELEGATE_TASK_TOOL_NAME, parentContext, {
      recipient_address: "/reviewer", description: "Review the parent work", reference_files: [],
    }) as { task_id: string; target_agent_run_id: string };

    await execute(harness.service, SUBMIT_TASK_RESULT_TOOL_NAME, context(harness.rootResolver, "/reviewer", child.target_agent_run_id), {
      message: "Child review complete.", reference_files: [],
    });
    await expect(execute(harness.service, REVIEW_TASK_RESULT_TOOL_NAME, parentContext, {
      task_id: child.task_id, decision: "accept", comment: null, reference_files: [],
    })).resolves.toMatchObject({ task_id: child.task_id, status: "accepted" });
    await expect(execute(harness.service, REVIEW_TASK_RESULT_TOOL_NAME, coordinator, {
      task_id: child.task_id, decision: "accept", comment: null, reference_files: [],
    })).rejects.toMatchObject({ code: "DELEGATOR_NOT_AUTHORIZED" });

    expect(harness.root.getTaskRecordsSnapshot().records.find((record) => record.taskId === child.task_id)).toMatchObject({
      delegatorAgentRunId: parent.target_agent_run_id,
      recipientAddress: "/reviewer",
      taskExecution: { agentRunId: child.target_agent_run_id },
      status: "accepted",
    });
  });

  it("materializes a fresh task AgentTeam and lets its concrete coordinator delegate inside that exact task TeamRun", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.rootResolver, "/coordinator", "run-coordinator");
    const parent = await execute(harness.service, DELEGATE_TASK_TOOL_NAME, coordinator, {
      recipient_address: "/design_team", description: "Coordinate a design exercise", reference_files: [],
    }) as { task_id: string; target_agent_run_id: string };
    const parentRecord = harness.root.getTaskRecordsSnapshot().records.find((record) => record.taskId === parent.task_id)!;
    expect(parentRecord.taskExecution).toEqual({ teamRunId: expect.any(String) });
    const taskTeamRunId = (parentRecord.taskExecution as { teamRunId: string }).teamRunId;
    expect(taskTeamRunId).not.toBe("configured-design-team-run");
    const taskTeamExecution = harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions[0]!;
    expect(taskTeamExecution).toMatchObject({
      address: "/design_team",
      teamRunId: taskTeamRunId,
      members: expect.arrayContaining([
        expect.objectContaining({ address: "/design_team/team_lead", agentRunId: parent.target_agent_run_id }),
      ]),
    });

    const taskTeamCoordinator = context(harness.rootResolver, "/design_team/team_lead", parent.target_agent_run_id);
    const child = await execute(harness.service, DELEGATE_TASK_TOOL_NAME, taskTeamCoordinator, {
      recipient_address: "/design_team/implementer",
      description: "Implement the task-Team plan",
      reference_files: [],
    }) as { task_id: string; target_agent_run_id: string };
    const taskBackend = harness.backend.children.get(taskTeamRunId)!;
    expect(taskBackend.preparedAgents[0]).toMatchObject({
      taskId: child.task_id,
      address: "/design_team/implementer",
      agentRunId: child.target_agent_run_id,
    });

    await execute(harness.service, SUBMIT_TASK_RESULT_TOOL_NAME, context(harness.rootResolver, "/design_team/implementer", child.target_agent_run_id), {
      message: "Implementation complete.", reference_files: [],
    });
    await execute(harness.service, REVIEW_TASK_RESULT_TOOL_NAME, taskTeamCoordinator, {
      task_id: child.task_id, decision: "accept", comment: null, reference_files: [],
    });
    await execute(harness.service, SUBMIT_TASK_RESULT_TOOL_NAME, taskTeamCoordinator, {
      message: "Task Team result ready.", reference_files: [],
    });
    await execute(harness.service, REVIEW_TASK_RESULT_TOOL_NAME, coordinator, {
      task_id: parent.task_id, decision: "accept", comment: null, reference_files: [],
    });

    expect(harness.root.getTaskRecordsSnapshot().records.map((record) => [record.taskId, record.status])).toEqual([
      [parent.task_id, "accepted"],
      [child.task_id, "accepted"],
    ]);
  });

  it("rejects self, root, missing, noncanonical, traversal, foreign, and relative targets before mutation", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.rootResolver, "/coordinator", "run-coordinator");
    for (const recipient_address of [
      "/coordinator",
      "/",
      "/missing",
      "worker",
      "./worker",
      "/worker/child",
    ]) {
      await expect(execute(harness.service, DELEGATE_TASK_TOOL_NAME, coordinator, {
        recipient_address,
        description: "must reject",
        reference_files: [],
      })).rejects.toBeTruthy();
    }
    await expect(execute(harness.service, DELEGATE_TASK_TOOL_NAME, context(harness.rootResolver, "/coordinator", "run-coordinator", "foreign-root"), {
      recipient_address: "/worker", description: "foreign", reference_files: [],
    })).rejects.toMatchObject({ code: "COLLABORATION_CONTEXT_REQUIRED" });
    expect(harness.root.getTaskRecordsSnapshot().records).toEqual([]);
    expect(harness.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([]);
    expect(harness.backend.preparedAgents).toEqual([]);
    expect(harness.backend.preparedTeams).toEqual([]);
  });

  it("validates absolute reference files before preparation and persists the exact accepted path", async () => {
    const harness = await createHarness();
    const coordinator = context(harness.rootResolver, "/coordinator", "run-coordinator");
    await expect(execute(harness.service, DELEGATE_TASK_TOOL_NAME, coordinator, {
      recipient_address: "/worker",
      description: "Read the reference",
      reference_files: ["relative.txt"],
    })).rejects.toBeTruthy();
    expect(harness.backend.preparedAgents).toEqual([]);

    const referencePath = path.join(harness.memoryDir, "classroom-problem.txt");
    await fs.writeFile(referencePath, "classroom evidence", "utf8");
    const created = await execute(harness.service, DELEGATE_TASK_TOOL_NAME, coordinator, {
      recipient_address: "/worker",
      description: "Read the absolute reference",
      reference_files: [referencePath],
    }) as { task_id: string };
    expect(harness.root.getTaskRecordsSnapshot().records.find((record) => record.taskId === created.task_id)?.referenceFiles)
      .toEqual([referencePath]);
  });
});
