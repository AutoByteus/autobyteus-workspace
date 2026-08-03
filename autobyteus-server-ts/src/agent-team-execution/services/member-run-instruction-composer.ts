import type { MemberTeamContext } from "../domain/member-team-context.js";
import { renderMemberCollaborationInstruction } from "./member-collaboration-instruction-renderer.js";

type MemberRunInstructionComposerInput = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  memberTeamContext: MemberTeamContext | null;
  sendMessageToEnabled: boolean;
  recipientNameDeliveryEnabled?: boolean;
  taskDelegationEnabled?: boolean;
  getHandoffRulesEnabled?: boolean;
};

export type MemberRunInstructionComposition = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  runtimeInstruction: string | null;
};

export const composeMemberRunInstructions = (
  input: MemberRunInstructionComposerInput,
): MemberRunInstructionComposition => {
  const context = input.memberTeamContext;
  const logicalSendEnabled = Boolean(
    input.sendMessageToEnabled &&
    context &&
    (input.recipientNameDeliveryEnabled ?? context.sendMessageToEnabled),
  );
  const taskDelegationEnabled = Boolean(input.taskDelegationEnabled && context);
  const runtimeLines: string[] = [];

  if (context) {
    runtimeLines.push(`Current team member: ${context.memberName}`);
    runtimeLines.push("");
    runtimeLines.push(renderMemberCollaborationInstruction({
      addressing: context.collaboration.addressing,
      sendMessageToEnabled: logicalSendEnabled,
      taskDelegationEnabled,
      getHandoffRulesEnabled: Boolean(input.getHandoffRulesEnabled),
    }));
  }

  if (input.sendMessageToEnabled) {
    runtimeLines.push("");
    runtimeLines.push(
      "If you use `send_message_to`, choose exactly one selector: `recipient_name` for a logical Team address or `target_agent_run_id` for an exact live AgentRun.",
      "Use `send_message_to` only for actual delivery; plain text does not deliver a message.",
      "When sending files, keep `content` self-contained and also list every needed absolute local path in `reference_files`.",
      "Do not claim delivery unless the tool result is accepted.",
    );
  }

  if (taskDelegationEnabled) {
    runtimeLines.push("");
    runtimeLines.push(
      "Task delegation protocol",
      "- Use `delegate_task` with `{recipient_name, description, reference_files?}`. Its `recipient_name` uses the same `/...` and `./...` logical address grammar as `send_message_to`.",
      "- A task target must be a direct Agent or Team child of your immediate Team. Deeper and cross-branch addresses are valid communication addresses but are not eligible task targets.",
      "- Task-delegation `reference_files` must be absolute local file paths; relative paths and URLs are rejected.",
      "- Use one `delegate_task` call for each bounded task. Task executions submit with `submit_task_result`; the review owner uses `review_task_result`.",
      "- `send_message_to` remains ordinary message delivery and does not submit, revise, accept, or finalize task results.",
    );
  }

  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};
