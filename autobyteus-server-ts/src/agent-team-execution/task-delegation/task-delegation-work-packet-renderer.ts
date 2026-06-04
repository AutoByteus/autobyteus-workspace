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
      "2. The framework marks this task-agent internally active/running when it starts; do not spend a tool call reporting in_progress.",
      "3. When done, call mark_task_completed. If unable to complete, call mark_task_failed.",
      "4. Include a concise message and optional reference_files when reporting completion/failure. Do not pass task_id or task_name; these tools are bound to the current task-agent instance.",
      "5. After you report completed, the framework will notify the delegator and keep this task-agent addressable while awaiting acceptance. If the delegator requests changes, continue the same task and report completed again when revised.",
      "6. After the delegator accepts the task, the framework must settle this task-agent instance once this turn is idle and no delegated work remains for this instance.",
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
      ...(record.delegator.taskAgentRunId ? [`Delegator task-agent run: ${record.delegator.taskAgentRunId}`] : []),
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
