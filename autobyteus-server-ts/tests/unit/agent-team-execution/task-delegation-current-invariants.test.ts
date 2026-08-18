import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { createAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { createTeamMemberExecutionIdentity } from "../../../src/agent-team-execution/domain/team-member-execution-identity.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../../src/agent-team-execution/services/team-execution-index.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { buildTaskAssigneeWorkPacket } from "../../../src/agent-team-execution/task-delegation/task-delegation-input.js";
import {
  hasOpenChildTask,
  orderTasksDeepestFirst,
  taskOwnsAgent,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-ownership.js";
import type { TaskDelegationRecordV1 } from "../../../src/agent-team-execution/task-delegation/task-delegation-record-v1.js";
import { TaskDelegationService } from "../../../src/agent-team-execution/task-delegation/task-delegation-service.js";
import { TeamRunPersistenceFinalizationIndeterminateError } from "../../../src/agent-team-execution/services/team-run-persistence-contract.js";

const at = (value: string) => createAgentTeamAddress(value.split("/").filter(Boolean));
const createdAt = "2020-01-01T00:00:00.000Z";

const configuredAgent = (address: string, agentRunId: string) => Object.freeze({
  address: at(address),
  agentDefinitionId: `definition-${agentRunId}`,
  role: null,
  description: null,
  agentRunId,
  platformAgentRunId: null,
  launchConfiguration: Object.freeze({
    runtimeKind: "AUTOBYTEUS" as const,
    llmModelIdentifier: "test-model",
    llmConfig: null,
    autoExecuteTools: true,
    skillAccessMode: SkillAccessMode.NONE,
    workspaceRootPath: null,
  }),
});

const parent: TaskDelegationRecordV1 = Object.freeze({
  taskId: "task-parent",
  delegatorAgentRunId: "root-coordinator",
  recipientAddress: at("/study-group"),
  taskExecution: Object.freeze({ teamRunId: "task-team-run" }),
  description: "Parent task",
  referenceFiles: Object.freeze([]),
  status: "accepted",
  updates: Object.freeze([]),
  createdAt,
});

const child: TaskDelegationRecordV1 = Object.freeze({
  taskId: "task-child",
  delegatorAgentRunId: "task-team-coordinator",
  recipientAddress: at("/researcher"),
  taskExecution: Object.freeze({ agentRunId: "task-child-agent" }),
  description: "Child task",
  referenceFiles: Object.freeze([]),
  status: "active",
  updates: Object.freeze([]),
  createdAt,
});

const tree: TeamRunExecutionTreeSnapshot = Object.freeze({
  schemaVersion: 1,
  createdAt,
  archivedAt: null,
  applicationBinding: null,
  handoffs: Object.freeze([]),
  rootTeam: Object.freeze({
    teamDefinitionId: "root-definition",
    teamDefinitionName: "Root",
    teamRunId: "root-team-run",
    coordinatorAddress: at("/coordinator"),
    members: Object.freeze([
      configuredAgent("/coordinator", "root-coordinator"),
      configuredAgent("/researcher", "configured-researcher"),
      Object.freeze({
        address: at("/study-group"),
        teamDefinitionId: "study-group-definition",
        role: null,
        description: null,
        teamRunId: "configured-study-group-run",
        coordinatorAddress: at("/study-group/coordinator"),
        members: Object.freeze([
          configuredAgent("/study-group/coordinator", "configured-study-group-coordinator"),
        ]),
        taskExecutions: Object.freeze([]),
      }),
    ]),
    taskExecutions: Object.freeze([
      Object.freeze({
        address: at("/study-group"),
        teamRunId: "task-team-run",
        startedAt: createdAt,
        settledAt: null,
        members: Object.freeze([
          Object.freeze({
            address: at("/study-group/coordinator"),
            agentRunId: "task-team-coordinator",
            platformAgentRunId: null,
          }),
        ]),
        taskExecutions: Object.freeze([
          Object.freeze({
            address: at("/researcher"),
            agentRunId: "task-child-agent",
            platformAgentRunId: null,
            startedAt: createdAt,
            settledAt: null,
          }),
        ]),
      }),
    ]),
  }),
});

const acceptedUpdates = Object.freeze([
  Object.freeze({
    submissionId: "submission-parent",
    message: "Done",
    referenceFiles: Object.freeze([]),
    createdAt,
  }),
  Object.freeze({
    reviewId: "review-parent",
    reviewedSubmissionId: "submission-parent",
    decision: "accept" as const,
    comment: null,
    referenceFiles: Object.freeze([]),
    createdAt,
  }),
]);

const createSettlementHarness = (input: {
  initialTree: TeamRunExecutionTreeSnapshot;
  records: readonly TaskDelegationRecordV1[];
  canPrepare?: () => boolean;
  settlementOutcome?: (taskId: string) => "not_committed" | "committed" | "finalization_indeterminate";
  cleanupResult?: () => { accepted: boolean; code?: string; message?: string };
}) => {
  let currentTree = input.initialTree;
  let currentIndex = new TeamExecutionIndex(currentTree);
  let currentRecords = input.records;
  const finishLocalTeardown = vi.fn(async () => input.cleanupResult?.() ?? ({ accepted: true as const }));
  const preparations: Array<{ cancel: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }> = [];
  const prepareDirectTaskSettlement = vi.fn(async (taskId: string, binding: { agentRunId: string } | { teamRunId: string }) => {
    if (!(input.canPrepare?.() ?? true)) return null;
    const indexed = currentIndex.getTaskExecution(binding);
    if (!indexed) return null;
    const committed = Object.freeze({ finishLocalTeardown });
    const cancel = vi.fn();
    const commit = vi.fn(() => committed);
    preparations.push({ cancel, commit });
    return Object.freeze({
      taskId,
      binding: indexed.kind === "agent"
        ? Object.freeze({ kind: "agent" as const, address: indexed.address, agentRunId: indexed.agentRunId })
        : Object.freeze({
            kind: "team" as const,
            address: indexed.address,
            teamRunId: indexed.teamRunId,
            coordinatorAgentRunId: currentIndex.listDirectAgentExecutions(indexed.teamRunId)[0]!.agentRunId,
          }),
      cancelBeforeDurability: cancel,
      commitAfterDurability: commit,
    });
  });
  const unregisterInactive = vi.fn();
  const enterLifecycleFailStop = vi.fn();
  const owner = { prepareDirectTaskSettlement };
  let service!: TaskDelegationService;
  service = new TaskDelegationService({
    rootTeamRunId: currentTree.rootTeam.teamRunId,
    config: { rootTeam: { children: [] }, handoffs: [] } as never,
    initialTasks: Object.freeze({
      schemaVersion: 1 as const,
      rootTeamRunId: currentTree.rootTeam.teamRunId,
      records: input.records,
    }),
    getTree: () => currentTree,
    getIndex: () => currentIndex,
    isRootOpen: () => true,
    authorize: () => undefined,
    requireTeamRun: async () => owner as never,
    teamRunResolver: { unregisterInactive } as never,
    commitTaskMutation: async (command) => {
      if (command.kind !== "record_transition") throw new Error(`Unexpected ${command.kind} commit.`);
      command.commitAfterDurability();
      return { outcome: "committed" as const };
    },
    commitTaskSettlement: async (command) => {
      const outcome = input.settlementOutcome?.(command.settlement.taskId) ?? "committed";
      const preparedMutation = command.prepareAgainstCurrent();
      if (outcome === "not_committed") {
        command.settlement.cancelBeforeDurability();
        return { outcome, cause: new Error("tree write rejected") };
      }
      if (outcome === "finalization_indeterminate") {
        service.enterRootFailStop();
        return { outcome, file: "execution_tree" as const, stage: "sync_directory" as const };
      }
      const settlement = command.settlement.commitAfterDurability();
      preparedMutation.commitTreeAndEvent(settlement);
      return { outcome, settlement };
    },
    enterLifecycleFailStop,
    replaceState: (state) => {
      currentTree = state.tree;
      currentIndex = new TeamExecutionIndex(currentTree);
      currentRecords = state.tasks.records;
    },
    publish: () => undefined,
    deliverSystemMessage: async () => ({ accepted: true }),
    agentRunIdentityAllocator: { allocateForAgentDefinition: async () => "unused-agent-run" },
  });
  return {
    service,
    prepareDirectTaskSettlement,
    preparations,
    finishLocalTeardown,
    enterLifecycleFailStop,
    unregisterInactive,
    records: () => currentRecords,
    tree: () => currentTree,
  };
};

describe("current task delegation invariants", () => {
  it("builds the exact assignee packet from delegator identity without exposing task IDs", () => {
    const message = buildTaskAssigneeWorkPacket({
      delegator: createTeamMemberExecutionIdentity({
        rootTeamRunId: "root-team-run",
        memberAddress: "/teacher",
        agentRunId: "teacher-run",
      }),
      description: "Investigate the failing scenario.",
      referenceFiles: ["/tmp/evidence-one.log", "/tmp/evidence-two.json"],
    });

    expect(message.content).toBe([
      "Task delegator address: /teacher",
      "Task delegator AgentRun ID: teacher-run",
      "",
      "Description:",
      "Investigate the failing scenario.",
      "",
      "Reference files:",
      "- /tmp/evidence-one.log",
      "- /tmp/evidence-two.json",
    ].join("\n"));
    expect(message.content).not.toContain("task-parent");
  });

  it("blocks parent settlement for a cross-scope child and orders shutdown child-first", () => {
    const index = new TeamExecutionIndex(tree);

    expect(taskOwnsAgent(parent, "task-team-coordinator", index)).toBe(true);
    expect(taskOwnsAgent(parent, "task-child-agent", index)).toBe(true);
    expect(taskOwnsAgent(child, "task-team-coordinator", index)).toBe(false);
    expect(hasOpenChildTask([parent, child], parent, index)).toBe(true);
    expect(orderTasksDeepestFirst([parent, child], index).map((task) => task.taskId))
      .toEqual(["task-child", "task-parent"]);
  });

  it("retains an accepted task until exact local work becomes idle", async () => {
    let settleable = false;
    const accepted = Object.freeze({ ...parent, updates: acceptedUpdates });
    const parentOnlyTree = Object.freeze({
      ...tree,
      rootTeam: Object.freeze({
        ...tree.rootTeam,
        taskExecutions: Object.freeze([tree.rootTeam.taskExecutions[0]!]),
      }),
    });
    const harness = createSettlementHarness({
      initialTree: parentOnlyTree,
      records: [accepted],
      canPrepare: () => settleable,
    });

    await harness.service.settle(parent.taskId);
    expect(harness.prepareDirectTaskSettlement).toHaveBeenCalledOnce();
    expect(harness.tree().rootTeam.taskExecutions[0]!.settledAt).toBeNull();

    settleable = true;
    harness.service.onRootEvent({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: {} as never,
      payload: { eventType: "AGENT_STATUS", details: { status: "idle" } } as never,
    } satisfies TeamRunEvent);

    await vi.waitFor(() => expect(harness.prepareDirectTaskSettlement).toHaveBeenCalledTimes(2));
    expect(harness.tree().rootTeam.taskExecutions[0]!.settledAt).not.toBeNull();
    expect(harness.unregisterInactive).toHaveBeenCalledOnce();
  });

  it("settles root shutdown from deepest child through the same task FIFO", async () => {
    const accepted = Object.freeze({ ...parent, updates: acceptedUpdates });
    const harness = createSettlementHarness({ initialTree: tree, records: [accepted, child] });

    await harness.service.shutdownAndSettle("Root terminated.");

    expect(harness.prepareDirectTaskSettlement.mock.calls.map(([taskId, binding]) => [taskId, binding])).toEqual([
      ["task-child", { agentRunId: "task-child-agent" }],
      ["task-parent", { teamRunId: "task-team-run" }],
    ]);
    expect(harness.records().find((record) => record.taskId === child.taskId)?.status).toBe("interrupted");
    expect(harness.records().find((record) => record.taskId === parent.taskId)?.status).toBe("accepted");
    expect(harness.tree().rootTeam.taskExecutions[0]!.settledAt).not.toBeNull();
  });

  it("cancels reversible settlement on not_renamed and retries the same live execution later", async () => {
    let outcome: "not_committed" | "committed" = "not_committed";
    const accepted = Object.freeze({ ...parent, updates: acceptedUpdates });
    const harness = createSettlementHarness({
      initialTree: tree,
      records: [accepted],
      settlementOutcome: () => outcome,
    });

    await harness.service.settle(parent.taskId);
    expect(harness.preparations[0]!.cancel).toHaveBeenCalledOnce();
    expect(harness.preparations[0]!.commit).not.toHaveBeenCalled();
    expect(harness.finishLocalTeardown).not.toHaveBeenCalled();
    expect(harness.tree().rootTeam.taskExecutions[0]!.settledAt).toBeNull();

    outcome = "committed";
    await harness.service.settle(parent.taskId);
    expect(harness.preparations[1]!.commit).toHaveBeenCalledOnce();
    expect(harness.finishLocalTeardown).toHaveBeenCalledOnce();
    expect(harness.tree().rootTeam.taskExecutions[0]!.settledAt).not.toBeNull();
  });

  it("fail-stops the root when committed local cleanup rejects without rolling back settledAt", async () => {
    const accepted = Object.freeze({ ...parent, updates: acceptedUpdates });
    const harness = createSettlementHarness({
      initialTree: tree,
      records: [accepted],
      cleanupResult: () => ({ accepted: false, code: "BUSY", message: "cleanup rejected" }),
    });

    await expect(harness.service.settle(parent.taskId)).rejects.toThrow("cleanup rejected");
    expect(harness.tree().rootTeam.taskExecutions[0]!.settledAt).not.toBeNull();
    expect(harness.enterLifecycleFailStop).toHaveBeenCalledOnce();
    expect(harness.unregisterInactive).not.toHaveBeenCalled();
  });

  it("does not settle or retry trailing terminal tasks after the first indeterminate tree write", async () => {
    const agentTask = (taskId: string, agentRunId: string): TaskDelegationRecordV1 => Object.freeze({
      taskId,
      delegatorAgentRunId: "root-coordinator",
      recipientAddress: at(`/${taskId}`),
      taskExecution: Object.freeze({ agentRunId }),
      description: taskId,
      referenceFiles: Object.freeze([]),
      status: "accepted" as const,
      updates: acceptedUpdates,
      createdAt,
    });
    const terminalTree = Object.freeze({
      ...tree,
      rootTeam: Object.freeze({
        ...tree.rootTeam,
        members: Object.freeze([
          ...tree.rootTeam.members,
          configuredAgent("/task-a", "configured-a"),
          configuredAgent("/task-b", "configured-b"),
        ]),
        taskExecutions: Object.freeze([
          Object.freeze({
            address: at("/task-a"), agentRunId: "agent-a", platformAgentRunId: null,
            startedAt: createdAt, settledAt: null,
          }),
          Object.freeze({
            address: at("/task-b"), agentRunId: "agent-b", platformAgentRunId: null,
            startedAt: createdAt, settledAt: null,
          }),
        ]),
      }),
    });
    const taskA = agentTask("task-a", "agent-a");
    const taskB = agentTask("task-b", "agent-b");
    const harness = createSettlementHarness({
      initialTree: terminalTree,
      records: [taskA, taskB],
      settlementOutcome: (taskId) => taskId === taskA.taskId
        ? "finalization_indeterminate"
        : "committed",
    });

    const first = harness.service.settle(taskA.taskId);
    const trailing = harness.service.settle(taskB.taskId);
    await expect(first).rejects.toBeInstanceOf(TeamRunPersistenceFinalizationIndeterminateError);
    await expect(trailing).rejects.toThrow("persistence authority is indeterminate");
    expect(harness.prepareDirectTaskSettlement.mock.calls.map(([taskId]) => taskId))
      .toEqual([taskA.taskId]);
    expect(harness.preparations[0]!.cancel).not.toHaveBeenCalled();
    expect(harness.preparations[0]!.commit).not.toHaveBeenCalled();
    expect(harness.finishLocalTeardown).not.toHaveBeenCalled();

    harness.service.onRootEvent({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution: {} as never,
      payload: { eventType: "AGENT_STATUS", details: { status: "idle" } } as never,
    } satisfies TeamRunEvent);
    await Promise.resolve();
    await expect(harness.service.settle(taskA.taskId))
      .rejects.toThrow("persistence authority is indeterminate");
    expect(harness.prepareDirectTaskSettlement).toHaveBeenCalledOnce();
    expect(harness.tree().rootTeam.taskExecutions.every((execution) => execution.settledAt === null))
      .toBe(true);
  });

  it("keeps indeterminate activation hidden and flips committed work release synchronously", async () => {
    const buildService = (outcome: "committed" | "finalization_indeterminate") => {
      let currentTree = tree;
      let currentIndex = new TeamExecutionIndex(currentTree);
      const abort = vi.fn(async () => undefined);
      const releaseWork = vi.fn();
      const commit = vi.fn(() => Object.freeze({ releaseWork }));
      const prepared = Object.freeze({
        binding: Object.freeze({ kind: "agent" as const, address: at("/researcher"), agentRunId: "task-agent-new" }),
        preparedTeamRuns: Object.freeze([]),
        stagedPlatformBindings: Object.freeze([{
          execution: createTeamMemberExecutionIdentity({
            rootTeamRunId: tree.rootTeam.teamRunId,
            memberAddress: at("/researcher"),
            agentRunId: "task-agent-new",
          }),
          platformAgentRunId: "thread-task-new",
        }]),
        sealForCommit: vi.fn(), commitAfterDurability: commit, abort,
      });
      let releasedInsideCommit = false;
      let preparedTreePlatformAgentRunId: string | null = null;
      const service = new TaskDelegationService({
        rootTeamRunId: tree.rootTeam.teamRunId,
        config: { rootTeam: { children: [{ ...configuredAgent("/researcher", "configured-researcher"), kind: "agent" }] }, handoffs: [] } as never,
        initialTasks: Object.freeze({ schemaVersion: 1 as const, rootTeamRunId: tree.rootTeam.teamRunId, records: Object.freeze([]) }),
        getTree: () => currentTree,
        getIndex: () => currentIndex,
        isRootOpen: () => true,
        authorize: () => undefined,
        requireTeamRun: async () => ({ prepareTaskAgent: async () => prepared }) as never,
        teamRunResolver: { unregisterInactive: vi.fn() } as never,
        commitTaskMutation: async (command) => {
          if (command.kind !== "activation") throw new Error("Expected activation.");
          command.activation.assertCommitReady();
          const next = command.prepareAgainstCurrent();
          const task = next.nextTree.rootTeam.taskExecutions.find((execution) =>
            "agentRunId" in execution && execution.agentRunId === "task-agent-new");
          preparedTreePlatformAgentRunId = task && "agentRunId" in task
            ? task.platformAgentRunId
            : null;
          if (outcome === "finalization_indeterminate") {
            await command.activation.abortBeforeCommit();
            return { outcome, file: "task_records" as const, stage: "sync_directory" as const };
          }
          command.activation.commitAfterDurability();
          releasedInsideCommit = releaseWork.mock.calls.length === 1;
          return { outcome };
        },
        commitTaskSettlement: async () => { throw new Error("Unexpected settlement."); },
        enterLifecycleFailStop: vi.fn(),
        replaceState: (state) => {
          currentTree = state.tree;
          currentIndex = new TeamExecutionIndex(currentTree);
        },
        publish: vi.fn(),
        deliverSystemMessage: async () => ({ accepted: true }),
        agentRunIdentityAllocator: { allocateForAgentDefinition: async () => "task-agent-new" },
      });
      return {
        service,
        prepared,
        abort,
        releaseWork,
        commit,
        releasedInsideCommit: () => releasedInsideCommit,
        preparedTreePlatformAgentRunId: () => preparedTreePlatformAgentRunId,
      };
    };
    const context = { identity: createTeamMemberExecutionIdentity({
      rootTeamRunId: "root-team-run", memberAddress: "/coordinator", agentRunId: "root-coordinator",
    }) };
    const placement = { kind: "agent" as const, address: at("/researcher") };

    const indeterminate = buildService("finalization_indeterminate");
    await expect(indeterminate.service.delegateTask(context, { recipient_address: "/researcher", description: "work" }, placement))
      .rejects.toBeInstanceOf(TeamRunPersistenceFinalizationIndeterminateError);
    expect(indeterminate.abort).toHaveBeenCalledOnce();
    expect(indeterminate.commit).not.toHaveBeenCalled();
    expect(indeterminate.releaseWork).not.toHaveBeenCalled();
    expect(indeterminate.preparedTreePlatformAgentRunId()).toBe("thread-task-new");

    const committed = buildService("committed");
    await expect(committed.service.delegateTask(context, { recipient_address: "/researcher", description: "work" }, placement))
      .resolves.toMatchObject({ status: "active", target_agent_run_id: "task-agent-new" });
    expect(committed.releasedInsideCommit()).toBe(true);
    expect(committed.releaseWork).toHaveBeenCalledOnce();
    expect(committed.preparedTreePlatformAgentRunId()).toBe("thread-task-new");
  });
});
