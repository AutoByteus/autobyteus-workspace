import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

const MEMBER_ADDRESS_PLACEHOLDER = "{{member_address}}";

const AGENT_TEAM_COLLABORATION_INSTRUCTION_TEMPLATE = [
  "## AgentTeam Addressing",
  "",
  "AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.",
  "",
  "Your Agent address is:",
  "",
  MEMBER_ADDRESS_PLACEHOLDER,
  "",
  "For example, `/requirements_engineering/requirements_lead` identifies one Agent, while `/requirements_engineering` identifies that AgentTeam. Sending a message to an AgentTeam address delivers it through that Team's configured coordinator.",
  "",
  "## AgentTeam Collaboration",
  "",
  "Use `send_message_to` with `recipient_address` to contact any mounted Agent or AgentTeam in your rooted AgentTeam. When you know an exact active AgentRun ID, you may instead use `target_agent_run_id` to contact that execution directly.",
  "",
  "Use `delegate_task` with `recipient_address` to create a fresh dedicated task execution for any mounted Agent or AgentTeam in your rooted AgentTeam, except your own exact Agent address. An AgentTeam task starts a fresh Team execution through its configured coordinator.",
  "",
  "When you finish your work or are blocked, call `get_handoff_rules`. If a returned rule applies, notify its `recipient_address` using `send_message_to`. Combine applicable reasons for the same recipient and follow distinct recipients in their returned order. If no rule applies, finish normally.",
  "",
  "Do not claim that a message or handoff was delivered unless `send_message_to` confirms delivery. Use `submit_task_result` and `review_task_result`—not ordinary message wording—for formal task lifecycle changes.",
].join("\n");

export const renderMemberCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => AGENT_TEAM_COLLABORATION_INSTRUCTION_TEMPLATE.replace(
  MEMBER_ADDRESS_PLACEHOLDER,
  () => input.memberAddress,
);
