import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";

export const renderMemberCollaborationInstruction = (input: {
  addressing: MemberLogicalAddressContext;
  sendMessageToEnabled: boolean;
  taskDelegationEnabled: boolean;
  getHandoffRulesEnabled: boolean;
}): string => {
  const lines = [
    `Your absolute collaboration address is \`${input.addressing.memberAddress}\`.`,
    `Your immediate Team address is \`${input.addressing.immediateTeamAddress}\`.`,
  ];
  if (input.sendMessageToEnabled || input.taskDelegationEnabled) {
    lines.push(
      "For logical Team recipients, `recipient_name` must be a rooted absolute address (`/...`) or an immediate-Team-relative address (`./...`). Bare names are invalid.",
      "A Team address targets that Team through its configured coordinator ingress Agent; an Agent address targets that Agent.",
    );
  }
  if (input.sendMessageToEnabled) {
    lines.push(
      "`send_message_to.target_agent_run_id` is separate: use it only for an exact currently active AgentRun id, never as a Team logical address.",
    );
  }
  if (input.getHandoffRulesEnabled) {
    lines.push(
      "Call `get_handoff_rules` when you need the configured outgoing handoff guidance for your current logical Agent address.",
    );
  }
  return lines.join("\n");
};
