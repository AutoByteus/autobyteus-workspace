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
  const hasRosterRecipients = communicationRecipients.length > 0;
  const sendMessageToAvailable = input.sendMessageToEnabled && Boolean(memberTeamContext);
  const taskDelegationAvailable = input.taskDelegationEnabled === true && Boolean(memberTeamContext);

  const runtimeLines: string[] = [];
  if (memberTeamContext?.memberName) {
    runtimeLines.push(`Current team member: ${memberTeamContext.memberName}`);
  }

  if (sendMessageToAvailable) {
    runtimeLines.push(
      "If you use `send_message_to`, choose exactly one target selector.",
    );
    if (hasRosterRecipients) {
      runtimeLines.push(
        "Set `recipient_name` to one allowed roster name for a logical teammate.",
      );
    } else {
      runtimeLines.push(
        "No logical `recipient_name` roster recipients are currently listed for this run.",
      );
    }
    runtimeLines.push(
      "Set `target_agent_run_id` to an exact active/recoverable AgentRun id supplied by a task packet, task event, or prior message when the message must reach that exact run.",
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
  } else if (hasRosterRecipients) {
    runtimeLines.push(
      "Do not attempt `send_message_to`; it is not exposed for this run even though teammates exist.",
    );
  }

  if (taskDelegationAvailable) {
    if (runtimeLines.length > 0) {
      runtimeLines.push("");
    }
    runtimeLines.push("Task delegation protocol");
    runtimeLines.push("- Use `delegate_tasks` to assign bounded work to exact logical team members; use a one-item `tasks` list for a single task. The framework derives you as the delegator from tool context; do not pass delegator.");
    runtimeLines.push("- Do not use `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or `assign_task_to`; they are not part of this delegation workflow.");
    runtimeLines.push("- Each `delegate_tasks` task item must include `member_name` and rich `description`; do not pass task_name, assignee_name, dependencies, completion_criteria, or expected_deliverables.");
    runtimeLines.push("- Activated task-agent instances receive task details directly in a work packet. The framework marks them active/running internally; do not report in_progress.");
    runtimeLines.push("- Task-agents submit reviewable results with `submit_task_result`; the tool is bound to the current task-agent context, so do not pass task_id, task_name, member_name, or status.");
    runtimeLines.push("- The original delegator reviews submitted results with `review_task_result` using decision `accept` or `request_revision`; revision decisions require a non-empty message and are delivered by the system to the same task-agent.");
    runtimeLines.push("- `send_message_to` remains ordinary teammate communication only. Do not use it for task result submission, revision requests, acceptance, or finalization.");
    runtimeLines.push("- After the original delegator accepts the task, the framework settles or exits the final task-agent instance after that instance becomes idle and no delegated work remains for that instance.");
  }

  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};
