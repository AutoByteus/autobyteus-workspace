import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

/**
 * Collaboration guidance for a member that belongs to no Team: the host of a standalone Agent
 * run, or a collaborator Agent (or extra copy) directly under it. It has `send_message_to` and
 * `delegate_task` but no handoff rules. Kept short: every eligible standalone agent gets it.
 */
export const renderStandaloneCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => [
  "## Collaboration",
  "",
  "You can work with other agents or agent teams the user brings into this run.",
  "",
  "- A user message may end with a `[Mentioned collaborators]` note that lists each mentioned Agent or Agent Team with its address. Each one is already in the run.",
  "- Message a collaborator with `send_message_to` and its exact address as `recipient_address`; it starts on its first message and keeps its conversation. A message to an Agent Team goes to its coordinator. Only the run's own agent and its collaborators are reachable by address.",
  "- `delegate_task` to a collaborator's address starts an extra, separate copy with your work description as its first message. Use it only when you need an additional instance; afterwards reach that copy with `send_message_to` and its `target_agent_run_id`.",
  "- Do not claim that a message or delegation succeeded unless the tool confirms it.",
  "",
  `Your address in this run is \`${input.memberAddress}\`.`,
].join("\n");
