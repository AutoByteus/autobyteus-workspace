import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

/**
 * Collaboration guidance for a member that belongs to no Team: the host of a standalone Agent
 * run, or a task Agent delegated directly under it. It has `send_message_to` and
 * `delegate_task` but no handoff rules. Kept short: every eligible standalone agent gets it.
 */
export const renderStandaloneCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => [
  "## Collaboration",
  "",
  "You can bring other agents or agent teams into this run and work with them.",
  "",
  "- `delegate_task` starts a fresh instance of an Agent or Agent Team that is available in this run and gives it your work description as its first message. Only Agents and Agent Teams the user mentioned with `@` in this run are available; otherwise the call starts nothing and explains why.",
  "- A user message may end with a `[Mentioned collaborators]` note that lists each mentioned Agent or Agent Team with its address. Use that exact address as `recipient_address` for `delegate_task`.",
  "- After delegation, communicate with the started instance only through `send_message_to` with its `target_agent_run_id`, in both directions. A quiet delegated instance is shut down after a while; a message to its run ID restores it with its conversation.",
  "- Do not claim that a message or delegation succeeded unless the tool confirms it.",
  "",
  `Your address in this run is \`${input.memberAddress}\`.`,
].join("\n");
