import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildTeamMembershipRosterManifest,
  renderTeamMembershipRosterManifest,
} from "./member-team-roster-manifest.js";

type MemberRunInstructionComposerInput = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  memberTeamContext: MemberTeamContext | null;
  sendMessageToEnabled: boolean;
  taskDelegationEnabled?: boolean;
};

export type MemberRunInstructionComposition = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  runtimeInstruction: string | null;
};

export const composeMemberRunInstructions = (
  input: MemberRunInstructionComposerInput,
): MemberRunInstructionComposition => {
  const memberTeamContext = input.memberTeamContext;
  const communicationRecipients = memberTeamContext?.communicationRecipients ?? [];
  const sendMessageToAvailable = input.sendMessageToEnabled && communicationRecipients.length > 0;
  const taskDelegationAvailable = input.taskDelegationEnabled === true && Boolean(memberTeamContext);

  const runtimeLines: string[] = [];
  if (memberTeamContext?.memberName) {
    runtimeLines.push(`Current team member: ${memberTeamContext.memberName}`);
  }

  if (sendMessageToAvailable) {
    runtimeLines.push(
      "If you use `send_message_to`, set `recipient_name` to exactly match one allowed recipient name from the team membership roster below.",
    );
    runtimeLines.push(
      "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
    );
    runtimeLines.push(
      "When sending files the teammate may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files` for Team Communication messages.",
    );
    runtimeLines.push(
      "Example: content explains the handoff and may mention `/Users/me/project/implementation-handoff.md`; reference_files includes [`/Users/me/project/implementation-handoff.md`].",
    );
    runtimeLines.push("Do not claim teammate delivery unless the tool call succeeds.");
    const manifestText = renderTeamMembershipRosterManifest(
      buildTeamMembershipRosterManifest(memberTeamContext!),
    );
    if (manifestText) {
      runtimeLines.push("");
      runtimeLines.push(manifestText);
    }
  } else if (communicationRecipients.length > 0) {
    runtimeLines.push(
      "Do not attempt `send_message_to`; it is not exposed for this run even though teammates exist.",
    );
  }

  if (taskDelegationAvailable) {
    if (runtimeLines.length > 0) {
      runtimeLines.push("");
    }
    runtimeLines.push("Task delegation protocol");
    runtimeLines.push("- Use `delegate_tasks` to assign bounded work to exact logical team members; use a one-item `tasks` list for a single task.");
    runtimeLines.push("- Do not use `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or `assign_task_to`; they are not part of this delegation workflow.");
    runtimeLines.push("- Each `delegate_tasks` task item must include `member_name` and rich `description`; do not pass task_name, assignee_name, dependencies, completion_criteria, or expected_deliverables.");
    runtimeLines.push("- Activated task-agent instances receive task details directly in a work packet. `update_task_status` is bound to that task-agent instance and does not take task_id or task_name.");
    runtimeLines.push("- Use `update_task_status` with only `status` to report `in_progress`, `completed`, or `failed`; include optional `message` and `reference_files` for status context.");
    runtimeLines.push("- After terminal status is accepted, the framework notifies the delegator and must settle or exit the final task-agent instance after that instance becomes idle and no delegated work remains for that instance.");
  }

  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};
