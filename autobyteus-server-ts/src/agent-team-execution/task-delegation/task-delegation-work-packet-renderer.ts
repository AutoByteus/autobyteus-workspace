import type { TaskDelegationRecord } from "./task-delegation-record.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

export class TaskDelegationWorkPacketRenderer {
  render(records: readonly TaskDelegationRecord[]): string {
    if (records.length === 0) {
      throw new Error("Cannot render an empty task delegation work packet.");
    }
    const header = records.length === 1
      ? `You have been activated as task agent ${records[0].taskAgentInstance?.taskAgentInstanceId ?? "(unbound)"} for the delegated task below.`
      : `You have been activated for ${records.length} delegated tasks.`;
    return [
      header,
      "",
      ...records.flatMap((record, index) => this.renderRecord(record, index, records.length)),
      "Lifecycle instructions:",
      "1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.",
      "2. If you need to mark the task started, call update_task_status with status=\"in_progress\". Do not pass task_id or task_name; this tool is bound to the current task-agent instance.",
      "3. When done, call update_task_status with status=\"completed\" or status=\"failed\".",
      "4. Include a short message and reference_files, if useful, when reporting terminal status.",
      "5. After terminal status is accepted, the framework will notify the delegator and must settle this task-agent instance once this turn is idle and no delegated work remains for this instance.",
    ].join("\n");
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
      `Delegated by: ${record.delegator.memberName}`,
      `Logical member: ${record.member.memberName}`,
      `Task-agent instance: ${record.taskAgentInstance?.taskAgentInstanceId ?? "unbound"}`,
      `Task-agent run: ${record.taskAgentInstance?.taskAgentRunId ?? "unbound"}`,
      "Description:",
      record.description,
      "Reference files:",
      renderList(record.referenceFiles),
      "",
    ];
  }
}
