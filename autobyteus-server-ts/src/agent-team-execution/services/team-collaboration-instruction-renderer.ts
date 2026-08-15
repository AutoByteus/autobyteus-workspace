import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildDelegationTargetRosterManifest,
  renderDelegationTargetRosterManifest,
} from "./delegation-target-roster-builder.js";
import {
  buildTeamMembershipRosterManifest,
  renderTeamMembershipRosterManifest,
} from "./member-team-roster-manifest.js";

const DELEGATION_PROTOCOL = `Task delegation protocol
- Use \`delegate_task\` to assign one bounded ready-to-run task to an explicit target object: \`{ target: { kind: "member" | "team", name }, description, reference_files? }\`. The \`description\` is task-centered content: objective, context, constraints, done conditions, expected output, and reference guidance for the task itself.
- Task-delegation \`reference_files\` must be absolute local file paths. Use full paths returned by file-writing tools or run \`realpath <file>\` before passing references; relative paths and URLs are rejected.
- Member targets are physical current-team agent members. Team targets are visible current-team teams/subteams; the team is accountable and the listed ingress coordinator receives the initial packet.
- To assign multiple independent tasks, call \`delegate_task\` separately for each task.
- Activated task-agent or task-team executions receive task details directly in a work packet. The framework marks them active/running internally; do not report in_progress.`;

export const renderTeamCollaborationInstruction = (
  context: MemberTeamContext,
  normalizedMemberName: string = context.memberName.trim(),
): string => {
  if (!context.sendMessageToEnabled || !context.deliverInterAgentMessage) {
    throw new Error("Team member context requires an active message-delivery binding.");
  }
  const lines = [
    `Current team member: ${normalizedMemberName}`,
    "",
    "If you use `send_message_to`, choose exactly one target selector.",
    context.communicationRecipients.length > 0
      ? "Set `recipient_name` to one allowed roster name for a logical teammate."
      : "No logical `recipient_name` roster recipients are currently listed for this run.",
    "Set `target_agent_run_id` to an exact currently active AgentRun id supplied by a task packet, task event, or prior message when the message must reach that exact live run.",
    "Use `send_message_to` only for actual delivery; plain text does not deliver a teammate or exact-run message.",
    "When sending files the recipient may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files`.",
    "Do not claim delivery unless the tool call succeeds.",
  ];
  const roster = renderTeamMembershipRosterManifest(buildTeamMembershipRosterManifest(context));
  if (roster) {
    lines.push("", roster);
  }
  lines.push(
    "",
    renderDelegationTargetRosterManifest(buildDelegationTargetRosterManifest(context)),
    "",
    DELEGATION_PROTOCOL,
  );
  return lines.join("\n");
};
