import type { TaskDelegationRecord } from "./task-delegation-record.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

export class TaskDelegationWorkPacketRenderer {
  render(records: readonly TaskDelegationRecord[]): string {
    if (records.length === 0) throw new Error("Cannot render an empty task delegation work packet.");
    const record = records[0]!;
    const header = this.renderHeader(record, records.length);
    return [
      header,
      "",
      ...records.flatMap((item, index) => this.renderRecord(item, index, records.length)),
      "Task lifecycle guidance:",
      "1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.",
      "2. The framework marks this task execution internally active/running when it starts; do not spend a tool call reporting in_progress.",
      "3. When your result is ready for task review, call submit_task_result with a non-empty message and optional reference_files.",
      "4. If the system sends revision instructions for this task, continue work and then call submit_task_result again with the revised result.",
      "5. Do not use send_message_to for task result submission, revision responses, acceptance, or finalization; task lifecycle is handled by submit_task_result and review_task_result.",
      "6. Use send_message_to only for ordinary non-lifecycle teammate communication when that is genuinely needed.",
      "7. The task review owner reviews submitted results with review_task_result. After acceptance and safe gates, the framework settles this task execution instance.",
    ].join("\n");
  }

  private renderHeader(record: TaskDelegationRecord, count: number): string {
    if (count > 1) return `You have been activated for ${count} delegated tasks.`;
    if (record.execution?.kind === "task_team") {
      return `Your team is accountable for the delegated task below. This task-scoped team run exits after acceptance and safe settlement.`;
    }
    return "You have been activated for the delegated task below.";
  }

  private renderRecord(
    record: TaskDelegationRecord,
    index: number,
    total: number,
  ): string[] {
    const title = total > 1
      ? `Task ${index + 1} label: ${record.taskLabel}`
      : `Task label: ${record.taskLabel}`;
    return [
      title,
      `Task ID: ${record.taskId}`,
      `Task review owner: ${record.delegator.memberName}`,
      "Description:",
      record.description,
      "Reference files:",
      renderList(record.referenceFiles),
      "",
    ];
  }
}
