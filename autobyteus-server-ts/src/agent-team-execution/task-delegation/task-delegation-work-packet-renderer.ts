import type { TaskDelegationRecord } from "./task-delegation-record.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

const renderDelegatorReplySelector = (record: TaskDelegationRecord): string => {
  if (record.delegatorReplyTargetAgentRunId) {
    return `Delegator reply target_agent_run_id: ${record.delegatorReplyTargetAgentRunId}`;
  }
  return `Delegator reply recipient_name: ${record.delegatorReplyRecipientName ?? record.delegator.memberName}`;
};

export class TaskDelegationWorkPacketRenderer {
  render(records: readonly TaskDelegationRecord[]): string {
    if (records.length === 0) {
      throw new Error("Cannot render an empty task delegation work packet.");
    }
    const record = records[0]!;
    const header = records.length === 1
      ? `You have been activated as task agent target_agent_run_id=${record.targetAgentRunId ?? "(unbound)"} for the delegated task below.`
      : `You have been activated for ${records.length} delegated tasks.`;
    return [
      header,
      "",
      ...records.flatMap((item, index) => this.renderRecord(item, index, records.length)),
      "Lifecycle instructions:",
      "1. Work directly from this task packet. Do not call get_my_tasks; that tool is not part of this workflow.",
      "2. The framework marks this task-agent internally active/running when it starts; do not spend a tool call reporting in_progress.",
      "3. Report progress, blockers, completion reports, and requested revision results with ordinary send_message_to messages to the delegator reply selector shown in the task details.",
      "4. Choose exactly one send_message_to target selector: recipient_name for a logical roster recipient, or target_agent_run_id for an exact concrete run supplied by a task packet, task event, or prior message.",
      "5. Use send_message_to content as the durable task report. Mention relevant files in content and attach them in reference_files when needed so Team Communication projection includes them.",
      "6. Worker-owned result tools are not part of this workflow; ordinary Team Communication messages are the task report surface.",
      "7. The original delegator accepts the task with accept_task. After acceptance, this target_agent_run_id is no longer a valid active recipient and the framework settles the task-agent once idle.",
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
      `Task ID: ${record.taskId}`,
      `Your target_agent_run_id: ${record.targetAgentRunId ?? "unbound"}`,
      renderDelegatorReplySelector(record),
      `Delegated by: ${record.delegator.memberName}`,
      `Logical member: ${record.member.memberName}`,
      "Description:",
      record.description,
      "Reference files:",
      renderList(record.referenceFiles),
      "",
    ];
  }
}
