import type { TaskDelegationRecord } from "./task-delegation-record.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";
import { getTaskExecutionRunId } from "./task-execution-instance.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

const renderDelegatorReplySelector = (record: TaskDelegationRecord): string => {
  if (record.delegatorReplyTargetAgentRunId) {
    return `Original delegator task-agent run: ${record.delegatorReplyTargetAgentRunId}`;
  }
  return `Original delegator: ${record.delegatorReplyRecipientName ?? record.delegator.memberName}`;
};

const executionRunLabel = (record: TaskDelegationRecord): string => {
  if (record.execution?.kind === "task_team") return `Task-team run ID: ${record.execution.taskTeamInstance.taskTeamRunId}`;
  return `Your target_agent_run_id: ${getTaskExecutionRunId(record.execution) ?? "unbound"}`;
};

export class TaskDelegationWorkPacketRenderer {
  render(records: readonly TaskDelegationRecord[]): string {
    if (records.length === 0) throw new Error("Cannot render an empty task delegation work packet.");
    const record = records[0]!;
    const header = this.renderHeader(record, records.length);
    return [
      header,
      "",
      ...records.flatMap((item, index) => this.renderRecord(item, index, records.length)),
      "Lifecycle instructions:",
      "1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.",
      "2. The framework marks this task execution internally active/running when it starts; do not spend a tool call reporting in_progress.",
      "3. When your result is ready for delegator review, call submit_task_result with a non-empty message and optional reference_files.",
      "4. If the system sends revision instructions for this task, continue work and then call submit_task_result again with the revised result.",
      "5. Do not use send_message_to for task result submission, revision responses, acceptance, or finalization; task lifecycle is handled by submit_task_result and review_task_result.",
      "6. Use send_message_to only for ordinary non-lifecycle teammate communication when that is genuinely needed.",
      "7. The original delegator reviews submitted results with review_task_result. After acceptance and safe gates, the framework settles this task execution instance.",
    ].join("\n");
  }

  private renderHeader(record: TaskDelegationRecord, count: number): string {
    if (count > 1) return `You have been activated for ${count} delegated tasks.`;
    if (record.execution?.kind === "task_team") {
      return `Your team has been activated as accountable task target ${record.target.kind}:${getTaskDelegationTargetName(record.target)} for the delegated task below. This task-scoped team run exits after acceptance and safe settlement.`;
    }
    return `You have been activated as task agent target_agent_run_id=${getTaskExecutionRunId(record.execution) ?? "(unbound)"} for the delegated task below.`;
  }

  private renderRecord(
    record: TaskDelegationRecord,
    index: number,
    total: number,
  ): string[] {
    const title = total > 1
      ? `Task ${index + 1} label: ${record.taskLabel}`
      : `Task label: ${record.taskLabel}`;
    const targetName = getTaskDelegationTargetName(record.target);
    return [
      title,
      `Task ID: ${record.taskId}`,
      executionRunLabel(record),
      renderDelegatorReplySelector(record),
      `Delegated by: ${record.delegator.memberName}`,
      record.target.kind === "team"
        ? `Accountable team target: ${targetName}`
        : `Logical member: ${targetName}`,
      ...(record.execution?.kind === "task_team"
        ? [`Ingress coordinator: ${record.execution.taskTeamInstance.ingress.memberName}`]
        : []),
      "Description:",
      record.description,
      "Reference files:",
      renderList(record.referenceFiles),
      "",
    ];
  }
}
