import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION } from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

const MEMBER_ADDRESS_PLACEHOLDER = "{{member_address}}";

const AGENT_TEAM_ADDRESSING_INSTRUCTION_TEMPLATE = [
  "## AgentTeam Addressing",
  "",
  "AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "The root AgentTeam is represented by `/`. Its display or metadata name is not included in any address.",
  "",
  "The following example illustrates the address structure:",
  "",
  "/",
  "├── /A              (Agent)",
  "├── /B              (Agent)",
  "└── /C              (nested AgentTeam)",
  "    ├── /C/D         (Agent)",
  "    └── /C/E         (Agent)",
  "",
  "In this example:",
  "",
  "- `/A` and `/B` are Agents directly under the root AgentTeam.",
  "- `/C` is an AgentTeam directly under the root AgentTeam.",
  "- `/C/D` and `/C/E` are Agents directly inside AgentTeam `/C`.",
  "- Each `/` separates one parent-to-child level.",
  "",
  "The letters in this example are placeholders only. They do not identify available recipients. Use only an exact canonical address made available in your current AgentTeam context.",
  "",
  "Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.",
  "",
  "Your Agent address is:",
  "",
  MEMBER_ADDRESS_PLACEHOLDER,
  "",
  "Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.",
].join("\n");

export const renderMemberCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => [
  AGENT_TEAM_ADDRESSING_INSTRUCTION_TEMPLATE.replace(
    MEMBER_ADDRESS_PLACEHOLDER,
    () => input.memberAddress,
  ),
  AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION,
].join("\n\n");
