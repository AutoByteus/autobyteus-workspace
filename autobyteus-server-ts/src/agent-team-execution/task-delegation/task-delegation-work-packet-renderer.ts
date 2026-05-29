import type { TaskDelegationRecord } from "./task-delegation-record.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

export class TaskDelegationWorkPacketRenderer {
  render(records: readonly TaskDelegationRecord[]): string {
    if (records.length === 0) {
      throw new Error("Cannot render an empty task delegation work packet.");
    }
    const header = records.length === 1
      ? `You have been activated for delegated task ${records[0].taskId}.`
      : `You have been activated for ${records.length} delegated tasks.`;
    return [
      header,
      "",
      ...records.flatMap((record, index) => this.renderRecord(record, index, records.length)),
      "Lifecycle instructions:",
      "1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.",
      "2. If you need to mark a task started, call update_task_status with the exact task_id and status=\"in_progress\".",
      "3. When done, call update_task_status with status=\"completed\" or status=\"failed\".",
      "4. Include a summary and deliverables when reporting terminal status.",
      "5. After terminal status is accepted, the framework will notify the delegator and settle this member if no more delegated work remains.",
    ].join("\n");
  }

  private renderRecord(
    record: TaskDelegationRecord,
    index: number,
    total: number,
  ): string[] {
    const title = total > 1
      ? `Task ${index + 1}: ${record.taskName} (${record.taskId})`
      : `Task: ${record.taskName} (${record.taskId})`;
    return [
      title,
      `Delegated by: ${record.delegator.memberName}`,
      `Assignee: ${record.assignee.memberName}`,
      `Description: ${record.description}`,
      `Completion criteria: ${record.completionCriteria ?? "None specified"}`,
      "Expected deliverables:",
      renderList(record.expectedDeliverables),
      `Dependency task IDs: ${record.dependencyTaskIds.length > 0 ? record.dependencyTaskIds.join(", ") : "none"}`,
      `Use task_id=\"${record.taskId}\" when calling update_task_status.`,
      "",
    ];
  }
}
