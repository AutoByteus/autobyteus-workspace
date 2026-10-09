import { WORK_REQUEST_EXECUTION_LLM_INSTRUCTION } from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

/**
 * Collaboration guidance for a member that belongs to no Team: the host of a standalone Agent
 * run, or a collaborator Agent (or copy) directly under it. It has `send_message_to` and
 * `delegate_task` but no handoff rules (REQ-009 wording). Kept short: every eligible
 * standalone agent gets it.
 */
export const renderStandaloneCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => [
  "## Collaboration",
  "",
  "### Work Requests and Outcomes",
  "",
  WORK_REQUEST_EXECUTION_LLM_INSTRUCTION,
  "",
  "You can work with other agents and agent teams: the ones the user brings into this run, and any available agent or team.",
  "",
  "- A user message may end with a `[Mentioned collaborators]` note that lists each mentioned Agent or Agent Team with its address. Each one is already in the run.",
  "- `send_message_to` with an exact address as `recipient_address` reaches the one instance at that address; an available agent or team that is not yet in the run is brought in on first use and keeps its conversation. A message to an Agent Team goes to its coordinator.",
  "- `delegate_task` with an address spawns a new, separate copy with your work description as its first message; copies can work in parallel. It returns the copy's IDs: `target_agent_run_id` for an Agent copy, or `target_team_run_id` and `target_team_coordinator_agent_run_id` for a Team copy. Message a copy with `send_message_to` and its agent run ID (a Team copy's coordinator). To give a copy a follow-up Task once its current Task is DONE or CANCELLED, call `delegate_task` with its `target_team_run_id` or `target_agent_run_id` and the new `task_id`.",
  "- If you have `list_available_agents`, it lists the available agents and teams with their addresses.",
  "- Do not claim that a message or delegation succeeded unless the tool confirms it.",
  "",
  `Your address in this run is \`${input.memberAddress}\`.`,
].join("\n");
