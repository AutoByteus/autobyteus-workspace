import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";

const MEMBER_ADDRESS_PLACEHOLDER = "{{member_address}}";

const AGENT_TEAM_COLLABORATION_INSTRUCTION_TEMPLATE = [
  "## AgentTeam Addressing",
  "",
  "AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "An address beginning with `/` starts from the root AgentTeam. An address beginning with `./` starts from your immediate AgentTeam—the Team that directly contains you. Bare names, `../`, and backslashes are invalid.",
  "",
  "Within this structure, your address is:",
  "",
  MEMBER_ADDRESS_PLACEHOLDER,
  "",
  "For example:",
  "",
  "- `./architecture_reviewer` identifies an Agent in your immediate AgentTeam.",
  "- `./implementation_team` identifies a nested AgentTeam in your immediate AgentTeam.",
  "- `/requirements_engineering/requirements_lead` identifies an Agent using an absolute address from the root AgentTeam.",
  "",
  "An AgentTeam address identifies the Team itself. Sending a message to that address delivers it to the Team's configured coordinator.",
  "",
  "## AgentTeam Collaboration",
  "",
  "Use `send_message_to` with `recipient_address` to send a message to an Agent or AgentTeam.",
  "",
  "`delegate_task` uses the same address format, but its recipient must be a direct Agent or AgentTeam child of your immediate AgentTeam. Message delivery may address deeper or cross-branch recipients.",
  "",
  "When you finish your work or are blocked, call `get_handoff_rules`. If a returned rule applies, notify its `recipient_address` using `send_message_to`. Combine applicable reasons for the same recipient and follow distinct recipients in their returned order. If no rule applies, finish normally.",
  "",
  "Do not claim that a handoff was completed unless `send_message_to` confirms delivery.",
].join("\n");

export const renderMemberCollaborationInstruction = (input: {
  addressing: MemberLogicalAddressContext;
}): string => AGENT_TEAM_COLLABORATION_INSTRUCTION_TEMPLATE.replace(
  MEMBER_ADDRESS_PLACEHOLDER,
  () => input.addressing.memberAddress,
);
