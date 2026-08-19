import type {
  ConfiguredMemberExecution,
  TaskExecution,
  TaskTeamMemberExecution,
  TeamRunExecutionTreeSnapshot,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type {
  TaskDelegationRecordV1,
  TaskDelegationRecordsSnapshot,
} from "../../agent-team-execution/task-delegation/task-delegation-record-v1.js";
import type { TaskDelegationRecordsV1Store } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import type { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
import type { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../store/team-run-execution-tree-schema.js";
import { validateTaskDelegationRecordsV1Payload } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import {
  validateTeamRunStatePackage,
  type ValidatedTeamRunStatePackage,
} from "./team-run-state-package-validator.js";

export type TeamRunStatePackageLoadResult =
  | Readonly<{ loaded: true; state: ValidatedTeamRunStatePackage; repaired: boolean }>
  | Readonly<{ loaded: false; code: string; message: string }>;

const taskRunId = (task: TaskExecution): string =>
  "agentRunId" in task ? task.agentRunId : task.teamRunId;

const repairTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  referencedTaskRuns: ReadonlySet<string>;
  settledAtByRunId: ReadonlyMap<string, string>;
}): TeamRunExecutionTreeSnapshot => {
  const repairTask = (task: TaskExecution): TaskExecution | null => {
    const runId = taskRunId(task);
    if (!input.referencedTaskRuns.has(runId)) return null;
    const settledAt = task.settledAt ?? input.settledAtByRunId.get(runId) ?? null;
    if ("agentRunId" in task) return { ...task, settledAt };
    return {
      ...task,
      settledAt,
      members: task.members.map(repairTaskMember),
      taskExecutions: task.taskExecutions.map(repairTask).filter(notNull),
    };
  };
  const repairTaskMember = (member: TaskTeamMemberExecution): TaskTeamMemberExecution =>
    "agentRunId" in member ? member : {
      ...member,
      members: member.members.map(repairTaskMember),
      taskExecutions: member.taskExecutions.map(repairTask).filter(notNull),
    };
  const repairConfiguredMember = (member: ConfiguredMemberExecution): ConfiguredMemberExecution =>
    "agentRunId" in member ? member : {
      ...member,
      members: member.members.map(repairConfiguredMember),
      taskExecutions: member.taskExecutions.map(repairTask).filter(notNull),
    };
  const notNull = <T>(value: T | null): value is T => value !== null;

  return validateTeamRunExecutionTreePayload({
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(repairConfiguredMember),
      taskExecutions: input.tree.rootTeam.taskExecutions.map(repairTask).filter(notNull),
    },
  }, input.tree.rootTeam.teamRunId);
};

const repairTasks = (input: {
  tasks: TaskDelegationRecordsSnapshot;
  recoveryTimestamp: string;
}): {
  tasks: TaskDelegationRecordsSnapshot;
  referencedTaskRuns: ReadonlySet<string>;
  settledAtByRunId: ReadonlyMap<string, string>;
  changed: boolean;
} => {
  const referencedTaskRuns = new Set<string>();
  const settledAtByRunId = new Map<string, string>();
  let changed = false;
  const records = input.tasks.records.map((task): TaskDelegationRecordV1 => {
    const runId = "agentRunId" in task.taskExecution
      ? task.taskExecution.agentRunId
      : task.taskExecution.teamRunId;
    referencedTaskRuns.add(runId);
    settledAtByRunId.set(runId, input.recoveryTimestamp);
    if (task.status !== "active" && task.status !== "awaiting_review") return task;
    changed = true;
    return {
      ...task,
      status: "interrupted",
      updates: [...task.updates, {
        interruptionId: `${task.taskId}_interruption_restart`,
        reason: "Interrupted because live task recovery is not supported after TeamRun reopen.",
        createdAt: input.recoveryTimestamp,
      }],
    };
  });
  return {
    tasks: validateTaskDelegationRecordsV1Payload({ ...input.tasks, records }, input.tasks.rootTeamRunId),
    referencedTaskRuns,
    settledAtByRunId,
    changed,
  };
};

const sameJson = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export class TeamRunStatePackageLoader {
  constructor(private readonly options: {
    executionTreeStore: TeamRunExecutionTreeStore;
    taskRecordsStore: TaskDelegationRecordsV1Store;
    communicationStore: TeamCommunicationV1Store;
  }) {}

  async loadAndRepair(input: {
    teamMemoryDir: string;
    rootTeamRunId: string;
    recoveryTimestamp?: string;
  }): Promise<TeamRunStatePackageLoadResult> {
    const [executionTree, taskRecords, communicationMessages] = await Promise.all([
      this.options.executionTreeStore.read(input.teamMemoryDir, input.rootTeamRunId),
      this.options.taskRecordsStore.read(input.teamMemoryDir, input.rootTeamRunId),
      this.options.communicationStore.read(input.teamMemoryDir, input.rootTeamRunId),
    ]);
    if (!executionTree || !taskRecords || !communicationMessages) {
      return {
        loaded: false,
        code: "TEAM_RUN_STATE_PACKAGE_INCOMPLETE",
        message: `TeamRun '${input.rootTeamRunId}' does not have all three V1 authorities.`,
      };
    }

    const recoveredTasks = repairTasks({
      tasks: taskRecords,
      recoveryTimestamp: input.recoveryTimestamp ?? new Date().toISOString(),
    });
    const recoveredTree = repairTree({
      tree: executionTree,
      referencedTaskRuns: recoveredTasks.referencedTaskRuns,
      settledAtByRunId: recoveredTasks.settledAtByRunId,
    });
    const treeChanged = !sameJson(executionTree, recoveredTree);
    const tasksChanged = recoveredTasks.changed || !sameJson(taskRecords, recoveredTasks.tasks);

    if (treeChanged) {
      const result = await this.options.executionTreeStore.write(input.teamMemoryDir, recoveredTree);
      if (result.outcome !== "committed") return this.repairFailure(input.rootTeamRunId, result.outcome);
    }
    if (tasksChanged) {
      const result = await this.options.taskRecordsStore.write(input.teamMemoryDir, recoveredTasks.tasks);
      if (result.outcome !== "committed") return this.repairFailure(input.rootTeamRunId, result.outcome);
    }

    return {
      loaded: true,
      repaired: treeChanged || tasksChanged,
      state: validateTeamRunStatePackage({
        executionTree: recoveredTree,
        taskRecords: recoveredTasks.tasks,
        communicationMessages,
      }),
    };
  }

  private repairFailure(
    rootTeamRunId: string,
    outcome: "not_renamed" | "renamed_finalization_indeterminate",
  ): TeamRunStatePackageLoadResult {
    return {
      loaded: false,
      code: "TEAM_RUN_STATE_REPAIR_FAILED",
      message: `TeamRun '${rootTeamRunId}' repair did not commit (${outcome}).`,
    };
  }
}
