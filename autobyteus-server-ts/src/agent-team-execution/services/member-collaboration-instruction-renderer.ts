import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";

export const renderMemberCollaborationInstruction = (input: {
  addressing: MemberLogicalAddressContext;
}): string => [
  "You are working as a member of an AgentTeam. Agents and AgentTeams use filesystem-like logical addresses to communicate. These addresses identify Team members; they are not real filesystem paths.",
  "",
  "Your address in the AgentTeam is:",
  "",
  input.addressing.memberAddress,
  "",
  "Addresses beginning with `/` start from the root AgentTeam. Addresses beginning with `./` start from your current AgentTeam, similar to relative filesystem paths.",
  "",
  "For example:",
  "",
  "- `./architecture_reviewer` addresses a member named `architecture_reviewer` in your current AgentTeam.",
  "- `./implementation_team` addresses a child AgentTeam named `implementation_team`.",
  "- `/requirements_engineering/requirements_lead` is an absolute address from the root AgentTeam.",
  "",
  "Sending a message to an AgentTeam address delivers it to that Team's configured coordinator. Bare member names, `../`, and backslashes are not valid addresses.",
  "",
  "When you finish your work or are blocked, call `get_handoff_rules` to check your configured handoff rules. Each returned rule tells you when a handoff applies and provides the `recipient_address` to notify.",
  "",
  "If a rule applies, use `send_message_to` to notify that Agent or AgentTeam. If several applicable rules have the same recipient, send one message that combines the relevant reasons. Follow distinct recipients in the order they first appear. If no rule applies, finish normally.",
  "",
  "Do not say that you completed a handoff unless `send_message_to` confirms that the message was delivered.",
].join("\n");
