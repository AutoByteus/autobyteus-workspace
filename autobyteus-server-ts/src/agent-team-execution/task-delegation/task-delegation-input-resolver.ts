import {
  TaskDelegationError,
  type DelegateTasksInput,
  type TaskDelegationContext,
  type TaskDelegationDeliverable,
  type TaskDelegationMemberIdentity,
  type TaskDelegationTaskInput,
  type UpdateTaskStatusInput,
} from "./task-delegation-record.js";
import type {
  CreateTaskDelegationRecordInput,
  TaskDelegationLedger,
} from "./task-delegation-ledger.js";

export const normalizeRequiredTaskDelegationString = (
  value: string,
  fieldName: string,
): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new TaskDelegationError("VALIDATION_ERROR", `${fieldName} is required.`);
  }
  return normalized;
};

export const cloneTaskDelegationMemberIdentity = (
  identity: TaskDelegationMemberIdentity,
): TaskDelegationMemberIdentity => ({
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
});

export class TaskDelegationInputResolver {
  constructor(
    private readonly teamRunId: string,
    private readonly ledger: TaskDelegationLedger,
  ) {}

  assertContext(context: TaskDelegationContext): void {
    const contextTeamRunId = normalizeRequiredTaskDelegationString(
      context.teamRunId,
      "teamRunId",
    );
    if (contextTeamRunId !== this.teamRunId) {
      throw new TaskDelegationError(
        "TEAM_RUN_MISMATCH",
        `Task delegation call is bound to team run '${contextTeamRunId}', not '${this.teamRunId}'.`,
      );
    }
    normalizeRequiredTaskDelegationString(context.caller.memberName, "caller.memberName");
    normalizeRequiredTaskDelegationString(context.caller.memberRouteKey, "caller.memberRouteKey");
    normalizeRequiredTaskDelegationString(context.caller.memberRunId, "caller.memberRunId");
  }

  buildCreateInputs(
    context: TaskDelegationContext,
    input: DelegateTasksInput,
  ): CreateTaskDelegationRecordInput[] {
    const normalizedTasks = input.tasks.map((task) => this.normalizeTaskInput(task));
    this.assertUniqueTaskNames(normalizedTasks.map((task) => task.task_name));
    const assignees = normalizedTasks.map((task) =>
      this.resolveAssignee(context, task.assignee_name),
    );

    for (const task of normalizedTasks) {
      if (this.ledger.hasTaskName(task.task_name)) {
        throw new TaskDelegationError(
          "DUPLICATE_TASK_NAME",
          `Delegated task name '${task.task_name}' already exists in this team run.`,
        );
      }
    }
    this.assertDependenciesResolvable(normalizedTasks);

    const taskIdsByTaskName = new Map(
      normalizedTasks.map((task) => [task.task_name, this.ledger.reserveTaskId()] as const),
    );
    return normalizedTasks.map((task, index) => ({
      taskId: taskIdsByTaskName.get(task.task_name)!,
      task,
      assignee: assignees[index]!,
      delegator: cloneTaskDelegationMemberIdentity(context.caller),
      dependencyTaskIds: this.resolveDependencies(
        task.dependencies,
        task.task_name,
        taskIdsByTaskName,
      ),
    }));
  }

  normalizeTaskId(taskId: string): string {
    return normalizeRequiredTaskDelegationString(taskId, "task_id");
  }

  normalizeDeliverables(
    caller: TaskDelegationMemberIdentity,
    deliverables: UpdateTaskStatusInput["deliverables"],
  ): TaskDelegationDeliverable[] {
    return deliverables.map((deliverable) => ({
      file_path: normalizeRequiredTaskDelegationString(
        deliverable.file_path,
        "deliverables.file_path",
      ),
      summary: normalizeRequiredTaskDelegationString(
        deliverable.summary,
        "deliverables.summary",
      ),
      author_agent_name: caller.memberName,
      timestamp: new Date().toISOString(),
    }));
  }

  private normalizeTaskInput(task: TaskDelegationTaskInput): TaskDelegationTaskInput {
    return {
      task_name: normalizeRequiredTaskDelegationString(task.task_name, "task_name"),
      assignee_name: normalizeRequiredTaskDelegationString(task.assignee_name, "assignee_name"),
      description: normalizeRequiredTaskDelegationString(task.description, "description"),
      dependencies: task.dependencies.map((dependency) =>
        normalizeRequiredTaskDelegationString(dependency, "dependency"),
      ),
      completion_criteria: task.completion_criteria?.trim() || null,
      expected_deliverables: task.expected_deliverables.map((deliverable) =>
        normalizeRequiredTaskDelegationString(deliverable, "expected_deliverables item"),
      ),
    };
  }

  private assertUniqueTaskNames(taskNames: readonly string[]): void {
    const seen = new Set<string>();
    for (const name of taskNames) {
      if (seen.has(name)) {
        throw new TaskDelegationError(
          "DUPLICATE_TASK_NAME",
          `Duplicate task_name '${name}' found in delegate_tasks input.`,
        );
      }
      seen.add(name);
    }
  }

  private assertDependenciesResolvable(tasks: readonly TaskDelegationTaskInput[]): void {
    const newTaskNames = new Set(tasks.map((task) => task.task_name));
    for (const task of tasks) {
      for (const dependency of task.dependencies) {
        if (dependency === task.task_name) {
          throw new TaskDelegationError(
            "INVALID_DEPENDENCY",
            `Task '${task.task_name}' cannot depend on itself.`,
          );
        }
        if (newTaskNames.has(dependency) || this.ledger.getRecord(dependency)) {
          continue;
        }
        const byName = this.ledger.findRecordByTaskName(dependency);
        if (byName.length !== 1) {
          throw new TaskDelegationError(
            byName.length === 0 ? "DEPENDENCY_NOT_FOUND" : "DEPENDENCY_AMBIGUOUS",
            byName.length === 0
              ? `Dependency '${dependency}' was not found.`
              : `Dependency '${dependency}' matched multiple delegated tasks.`,
          );
        }
      }
    }
  }

  private resolveAssignee(
    context: TaskDelegationContext,
    assigneeName: string,
  ): TaskDelegationMemberIdentity {
    const matches = context.members.filter(
      (member) =>
        member.memberName === assigneeName ||
        member.memberRouteKey === assigneeName,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError(
        matches.length === 0 ? "ASSIGNEE_NOT_FOUND" : "ASSIGNEE_AMBIGUOUS",
        matches.length === 0
          ? `Assignee '${assigneeName}' was not found in the current team run.`
          : `Assignee '${assigneeName}' matched multiple team members; use a unique member route key.`,
      );
    }
    return cloneTaskDelegationMemberIdentity(matches[0]);
  }

  private resolveDependencies(
    dependencies: readonly string[],
    taskName: string,
    newTaskIdsByName: ReadonlyMap<string, string>,
  ): string[] {
    const resolved = new Set<string>();
    for (const dependency of dependencies) {
      const resolvedTaskId = this.resolveDependency(dependency, newTaskIdsByName);
      if (resolvedTaskId === newTaskIdsByName.get(taskName)) {
        throw new TaskDelegationError(
          "INVALID_DEPENDENCY",
          `Task '${taskName}' cannot depend on itself.`,
        );
      }
      resolved.add(resolvedTaskId);
    }
    return [...resolved];
  }

  private resolveDependency(
    dependency: string,
    newTaskIdsByName: ReadonlyMap<string, string>,
  ): string {
    const newTaskId = newTaskIdsByName.get(dependency);
    if (newTaskId) {
      return newTaskId;
    }
    const byId = this.ledger.getRecord(dependency);
    if (byId) {
      return byId.taskId;
    }
    const byName = this.ledger.findRecordByTaskName(dependency);
    if (byName.length !== 1) {
      throw new TaskDelegationError(
        byName.length === 0 ? "DEPENDENCY_NOT_FOUND" : "DEPENDENCY_AMBIGUOUS",
        byName.length === 0
          ? `Dependency '${dependency}' was not found.`
          : `Dependency '${dependency}' matched multiple delegated tasks.`,
      );
    }
    return byName[0].taskId;
  }
}
