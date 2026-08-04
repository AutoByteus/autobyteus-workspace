import type { ActiveTaskDelegationWorkEntry } from "./task-delegation-active-entry.js";
import { deriveTaskLabel } from "./task-delegation-record-derived.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";

const renderList = (items: readonly string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None specified";

const entryTaskId = (entry: ActiveTaskDelegationWorkEntry): string => (
  entry.phase === "record" ? entry.record.taskId : entry.taskId
);

const entryExecutionKind = (entry: ActiveTaskDelegationWorkEntry): "task_agent" | "task_team" | null => (
  entry.phase === "record"
    ? entry.taskRunExecution.kind
    : entry.boundExecution?.kind ?? null
);

const entryReferencePaths = (entry: ActiveTaskDelegationWorkEntry): string[] => (
  entry.phase === "record" ? entry.record.referenceFiles : entry.referenceFiles
).map((reference) => reference.path);

export class TaskDelegationWorkPacketRenderer {
  render(entries: readonly ActiveTaskDelegationWorkEntry[]): string {
    if (entries.length === 0) throw new Error("Cannot render an empty task delegation work packet.");
    const header = this.renderHeader(entries[0]!, entries.length);
    return [
      header,
      "",
      ...entries.flatMap((item, index) => this.renderEntry(item, index, entries.length)),
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

  private renderHeader(entry: ActiveTaskDelegationWorkEntry, count: number): string {
    if (count > 1) return `You have been activated for ${count} delegated tasks.`;
    if (entryExecutionKind(entry) === "task_team") {
      return "Your team is accountable for the delegated task below. This task-scoped team run exits after acceptance and safe settlement.";
    }
    return "You have been activated for the delegated task below.";
  }

  private renderEntry(
    entry: ActiveTaskDelegationWorkEntry,
    index: number,
    total: number,
  ): string[] {
    const content = entry.phase === "record" ? entry.record.content : entry.content;
    const taskLabel = deriveTaskLabel(content, entryTaskId(entry));
    const title = total > 1
      ? `Task ${index + 1} label: ${taskLabel}`
      : `Task label: ${taskLabel}`;
    return [
      title,
      `Task ID: ${entryTaskId(entry)}`,
      `Task review owner: ${getAgentTeamAddressBasename(entry.reviewOwner.executionAddress.memberAddress) ?? entry.reviewOwner.executionAddress.memberAddress}`,
      "Description:",
      content,
      "Reference files:",
      renderList(entryReferencePaths(entry)),
      "",
    ];
  }
}
