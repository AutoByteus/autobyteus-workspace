const lines = (...values: string[]): string => values.join("\n");

export const WORK_REQUEST_EXECUTION_LLM_INSTRUCTION = [
  "On receiving a work request, follow your own agent instructions and applicable skills.",
  "Do not send acknowledgements or promises to work.",
  "Use `send_message_to` when your instructions or skill call for a handoff, or when you are blocked.",
  "Follow applicable handoff rules; otherwise, return the result or specific blocker to the requesting agent.",
].join(" ");

const RULE_BASED_HANDOFF_LLM_INSTRUCTION = [
  "When you finish your own work or are blocked, call `get_handoff_rules`.",
  "Evaluate the returned rules against your outcome. Select the single rule whose",
  "`when` condition most specifically applies, and notify only its `recipient_address`",
  "using `send_message_to`. Do not notify additional recipients for the same outcome.",
  "If no rule applies to an incoming work request, return the result or specific blocker",
  "to the requesting agent using `send_message_to`; otherwise, finish normally.",
].join(" ");

export const SEND_MESSAGE_TO_LLM_DESCRIPTION = lines(
  "Send a self-contained work request, result, or blocker to the one Agent or AgentTeam instance",
  "at an address, or to one exact AgentRun. Use exactly one selector:",
  "recipient_address for one canonical absolute non-root Agent-or-AgentTeam",
  "address, or target_agent_run_id for one exact AgentRun. An Agent address",
  "reaches that Agent's instance; an AgentTeam address reaches that Team",
  "instance's coordinator; inside your own team instance, a teammate's address",
  "reaches the member of that same instance. An available agent or team that is",
  "not yet in the run is brought in on first use, and later messages reach that",
  "same instance. A run ID reaches an existing AgentRun only, including a",
  "shut-down delegated agent (restored with its conversation), and never brings",
  "anything in. On success, it returns the exact AgentRun that accepted the",
  "message as flat target_agent_run_id; on rejection, target_agent_run_id is null.",
);

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "Canonical absolute non-root Agent-or-AgentTeam address beginning with '/'. It reaches the one instance at that address: an Agent's instance, or an AgentTeam instance's coordinator; inside your own team instance, a teammate's address reaches the member of that same instance. An available agent or team that is not yet in the run is brought in on first use. Provide either recipient_address or target_agent_run_id, never both.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "Exact AgentRun.runId to receive a work request, result, or blocker: any AgentRun in the same root, including a shut-down delegated agent (restored with its conversation before delivery), or a currently active AgentRun elsewhere. Unknown run IDs are rejected; a run ID never brings anything in. Provide either target_agent_run_id or recipient_address, never both.";

export const DELEGATE_TASK_LLM_DESCRIPTION = lines(
  "Spawn one new copy of an Agent or AgentTeam and give it this work as its",
  "first message. recipient_address identifies what to copy: a mounted Agent or",
  "AgentTeam, a collaborator, or an available agent or team that is not yet in",
  "the run. Every call spawns another copy, so copies can work in parallel; an",
  "AgentTeam copy's coordinator receives the work. The first message includes",
  "your address and AgentRun ID so the copy can reply. On success it returns the",
  "copy's target_agent_run_id; if nothing was started,",
  "target_agent_run_id is null and message explains why. Follow up on the copy",
  "only by its run ID through send_message_to.",
);

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "Exact canonical absolute non-root address beginning with '/' of the Agent or AgentTeam to copy: a mounted one, a collaborator, or an available agent or team. Every call spawns a new copy; an AgentTeam copy's coordinator receives the work.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Complete ready-to-run work description: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this as the new instance's first message; do not resend it with send_message_to.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional absolute local file paths the new instance should inspect. Use full filesystem paths; relative paths and URLs are rejected.";

export const AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION = lines(
  "## AgentTeam Collaboration",
  "",
  "### Work Requests and Outcomes",
  "",
  WORK_REQUEST_EXECUTION_LLM_INSTRUCTION,
  "",
  "Choose the collaboration mode based on your primary intent.",
  "`send_message_to` reaches the one instance at an address, brought in on first use.",
  "`delegate_task` always spawns a new copy of an Agent or AgentTeam for new work.",
  "Never use both to deliver the same work.",
  "",
  "### Work Requests and Results",
  "",
  "Use `send_message_to` to communicate with the one Agent or AgentTeam instance",
  "at an address.",
  "",
  "- When `recipient_address` identifies an Agent, the message is delivered to",
  "  that Agent's instance.",
  "- When `recipient_address` identifies an AgentTeam, the message is delivered",
  "  to that Team instance's coordinator.",
  "- Inside your own team instance, a teammate's address reaches the member of",
  "  that same instance.",
  "- An available agent or team that is not yet in the run is brought in on",
  "  first use; later messages to its address reach the same instance.",
  "- When an exact AgentRun ID is known, `target_agent_run_id` may instead",
  "  select that specific execution: any AgentRun in the same root, including a",
  "  shut-down delegated agent, or a currently active AgentRun elsewhere. A run ID",
  "  never brings anything in.",
  "",
  "A successful call returns the exact AgentRun that accepted the message as",
  "`target_agent_run_id`. For an AgentTeam recipient, this is its coordinator",
  "AgentRun.",
  "",
  "### Delegated Agents",
  "",
  "Use `delegate_task` to spawn a new copy of an Agent or AgentTeam for new work.",
  "The `recipient_address` identifies what to copy (a mounted Agent or AgentTeam,",
  "a collaborator, or an available agent or team); it is not an alias for the new",
  "copy. Every call spawns another copy, so copies can work in parallel.",
  "",
  "- The work description and reference files become the copy's first message,",
  "  together with your address and AgentRun ID.",
  "- On success, `target_agent_run_id` is the new copy (for an AgentTeam, its",
  "  coordinator). If `target_agent_run_id` is null, nothing was started and",
  "  `message` explains why; correct the problem and delegate again, or report",
  "  the failure.",
  "",
  "Follow up on a copy only through `send_message_to` with its",
  "`target_agent_run_id`, in both directions. A copy that stays quiet is shut",
  "down after a while; a message to its run ID restores it with its",
  "conversation, so follow-ups remain possible at any time.",
  "",
  "### Rule-Based Handoffs",
  "",
  RULE_BASED_HANDOFF_LLM_INSTRUCTION,
  "",
  "Do not claim that a message, delegation, or handoff succeeded unless the",
  "corresponding tool confirms success.",
);
