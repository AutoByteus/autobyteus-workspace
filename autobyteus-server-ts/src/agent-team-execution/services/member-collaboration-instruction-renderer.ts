import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";

export const renderMemberCollaborationInstruction = (input: {
  addressing: MemberLogicalAddressContext;
  taskDelegationEnabled?: boolean;
}): string => [
  `Your canonical absolute AgentTeam address is \`${input.addressing.memberAddress}\`.`,
  "",
  "AgentTeam members and nested AgentTeams use filesystem-like logical addresses. These are not operating-system file paths. `/` denotes the root AgentTeam, `/research_team` denotes an AgentTeam, `/research_team/research_lead` denotes an Agent, and `./peer` starts from your immediate AgentTeam. Addressing an AgentTeam sends through its configured coordinator. Bare names, `../`, and backslashes are invalid.",
  "",
  "Before completing your work, or before stopping because you are blocked, you must call `get_handoff_rules`. Each returned item contains `when`, the condition to evaluate, and `recipient_address`, the Agent or AgentTeam to contact. Call `send_message_to` once for each distinct applicable `recipient_address`, in the order its first applicable item appears. Multiple applicable conditions for the same address are reasons for one handoff, not duplicate messages. Do not claim a handoff unless delivery is accepted. If no item applies, complete normally.",
  ...(input.taskDelegationEnabled ? [
    "",
    "`delegate_task.recipient_address` uses the same logical-address grammar. A task target must be a direct Agent or AgentTeam child of your immediate AgentTeam; deeper and cross-branch addresses remain valid for message delivery but are not task-eligible.",
  ] : []),
].join("\n");
