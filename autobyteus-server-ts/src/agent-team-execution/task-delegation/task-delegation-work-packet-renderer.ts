import type { TaskDelegationRecord } from "./task-delegation-record.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

const renderDelegatorReplySelector = (record: TaskDelegationRecord): string => {
  if (record.delegatorReplyTargetAgentRunId) {
    return `Original delegator task-agent run: ${record.delegatorReplyTargetAgentRunId}`;
  }
  return `Original delegator: ${record.delegatorReplyRecipientName ?? record.delegator.memberName}`;
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
      "3. When your result is ready for delegator review, call submit_task_result with a non-empty message and optional reference_files.",
      "4. If the system sends revision instructions for this task, continue work and then call submit_task_result again with the revised result.",
      "5. Do not use send_message_to for task result submission, revision responses, acceptance, or finalization; task lifecycle is handled by submit_task_result and review_task_result.",
      "6. Use send_message_to only for ordinary non-lifecycle teammate communication when that is genuinely needed.",
      "7. The original delegator reviews submitted results with review_task_result. After acceptance and safe idle/no-open-work gates, the framework settles this task-agent.",
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
