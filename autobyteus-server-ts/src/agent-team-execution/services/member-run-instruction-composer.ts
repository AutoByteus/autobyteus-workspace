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
  recipientNameDeliveryEnabled?: boolean;
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
  const sendMessageToAvailable = input.sendMessageToEnabled;
  const recipientNameDeliveryAvailable =
    sendMessageToAvailable &&
    Boolean(memberTeamContext) &&
    (input.recipientNameDeliveryEnabled ??
      Boolean(memberTeamContext?.sendMessageToEnabled && memberTeamContext.deliverInterAgentMessage));
  const taskDelegationAvailable = input.taskDelegationEnabled === true && Boolean(memberTeamContext);

  const runtimeLines: string[] = [];
  if (memberTeamContext?.memberName) {
    runtimeLines.push(`Current team member: ${memberTeamContext.memberName}`);
  }

  if (sendMessageToAvailable) {
    runtimeLines.push(
      "If you use `send_message_to`, choose exactly one target selector.",
    );
    if (recipientNameDeliveryAvailable && hasRosterRecipients) {
      runtimeLines.push(
        "Set `recipient_name` to one allowed roster name for a logical teammate.",
      );
    } else if (recipientNameDeliveryAvailable) {
      runtimeLines.push(
        "No logical `recipient_name` roster recipients are currently listed for this run.",
      );
    } else {
      runtimeLines.push(
        "Do not set `recipient_name` from this run; it requires an active team member context with Team Communication enabled.",
      );
    }
    runtimeLines.push(
      "Set `target_agent_run_id` to an exact currently active AgentRun id supplied by a task packet, task event, or prior message when the message must reach that exact live run.",
    );
    runtimeLines.push(
      "Use `send_message_to` only for actual delivery; plain text does not deliver a teammate or exact-run message.",
    );
    runtimeLines.push(
      "When sending files the recipient may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files`.",
    );
    runtimeLines.push(
      "Example: content explains the handoff and may mention `/Users/me/project/implementation-handoff.md`; reference_files includes [`/Users/me/project/implementation-handoff.md`].",
    );
    runtimeLines.push("Do not claim delivery unless the tool call succeeds.");
    const manifestText = recipientNameDeliveryAvailable && memberTeamContext
      ? renderTeamMembershipRosterManifest(buildTeamMembershipRosterManifest(memberTeamContext))
      : null;
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
    runtimeLines.push("- Use `delegate_task` to assign one bounded ready-to-run task to an exact logical team member. Provide `member_name`, a complete `description`, and optional `reference_files`.");
    runtimeLines.push("- To assign multiple independent tasks, call `delegate_task` separately for each task.");
    runtimeLines.push("- Available lifecycle tools for this workflow are `delegate_task`, `submit_task_result`, and `review_task_result`.");
    runtimeLines.push("- Activated task-agent instances receive task details directly in a work packet. The framework marks them active/running internally; do not report in_progress.");
    runtimeLines.push("- Task-agents submit reviewable results with `submit_task_result`; provide a non-empty `message` and optional `reference_files`.");
    runtimeLines.push("- The original delegator reviews submitted results with `review_task_result` using decision `accept` or `request_revision`; revision decisions require a non-empty message and are delivered by the system to the same task-agent.");
    runtimeLines.push("- `send_message_to` remains ordinary agent message delivery only. Do not use it for task result submission, revision requests, acceptance, or finalization.");
    runtimeLines.push("- After the original delegator accepts the task, the framework settles or exits the final task-agent instance after that instance becomes idle and no delegated work remains for that instance.");
  }

  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};
