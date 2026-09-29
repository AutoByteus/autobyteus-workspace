const lines = (...values: string[]): string => values.join("\n");

const RULE_BASED_HANDOFF_LLM_INSTRUCTION = [
  "When you finish your own work or are blocked, call `get_handoff_rules`.",
  "Evaluate the returned rules against your outcome. Select the single rule whose",
  "`when` condition most specifically applies, and notify only its `recipient_address`",
  "using `send_message_to`. Do not notify additional recipients for the same outcome.",
  "If no rule applies, finish normally.",
].join(" ");

export const SEND_MESSAGE_TO_LLM_DESCRIPTION = lines(
  "Send one self-contained ordinary message to an existing Agent or AgentTeam.",
  "Use exactly one selector: recipient_address for one canonical absolute",
  "non-root logical Agent-or-AgentTeam address in the same rooted AgentTeam, or",
  "target_agent_run_id for one exact AgentRun. An Agent address resolves to its",
  "mounted Agent execution; an AgentTeam address resolves to its mounted",
  "configured coordinator. A shut-down delegated agent in the same root is",
  "restored with its conversation and receives the message. This call creates",
  "no new execution. On success, it returns the exact AgentRun that accepted the",
  "message as flat target_agent_run_id; on rejection, target_agent_run_id is null.",
);

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "Canonical absolute non-root logical Agent-or-AgentTeam address beginning with '/'. Messaging an Agent reaches its existing mounted execution; messaging an AgentTeam reaches its existing mounted configured coordinator. This selector creates no new execution. Provide either recipient_address or target_agent_run_id, never both.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "Exact AgentRun.runId to receive an ordinary message: any AgentRun in the same root, including a shut-down delegated agent (restored with its conversation before delivery), or a currently active AgentRun elsewhere. Unknown run IDs are rejected. Provide either target_agent_run_id or recipient_address, never both.";

export const DELEGATE_TASK_LLM_DESCRIPTION = lines(
  "Start one fresh instance of a mounted Agent or AgentTeam in the same rooted",
  "AgentTeam and give it this work as its first message. recipient_address",
  "identifies the Agent or AgentTeam definition to instantiate. An Agent target",
  "starts one fresh delegated Agent; an AgentTeam target starts one fresh",
  "delegated Team whose configured coordinator receives the work. The first",
  "message includes your address and AgentRun ID so the new instance can reply.",
  "On success it returns the new instance's target_agent_run_id; if nothing was",
  "started, target_agent_run_id is null and message explains why. Afterwards,",
  "communicate with the instance only through send_message_to.",
);

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "Exact canonical absolute non-root address beginning with '/' for the mounted Agent or AgentTeam definition from which a fresh instance will be started. Agent targets start a fresh delegated Agent. AgentTeam targets start a fresh delegated Team whose configured coordinator receives the work.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Complete ready-to-run work description: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this as the new instance's first message; do not resend it with send_message_to.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional absolute local file paths the new instance should inspect. Use full filesystem paths; relative paths and URLs are rejected.";

export const AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION = lines(
  "## AgentTeam Collaboration",
  "",
  "Choose the collaboration mode based on your primary intent.",
  "`send_message_to` communicates with an existing execution.",
  "`delegate_task` starts a fresh instance of an Agent or AgentTeam with new work.",
  "Never use both to deliver the same work.",
  "",
  "### Ordinary Communication",
  "",
  "Use `send_message_to` to communicate with an existing Agent or AgentTeam",
  "instance.",
  "",
  "- When `recipient_address` identifies an Agent, the message is delivered to",
  "  that mounted Agent's existing execution.",
  "- When `recipient_address` identifies an AgentTeam, the message is delivered",
  "  to that mounted Team's existing configured coordinator.",
  "- When an exact AgentRun ID is known, `target_agent_run_id` may instead",
  "  select that specific execution: any AgentRun in the same root, including a",
  "  shut-down delegated agent, or a currently active AgentRun elsewhere.",
  "",
  "A successful call returns the exact AgentRun that accepted the message as",
  "`target_agent_run_id`. For an AgentTeam recipient, this is its coordinator",
  "AgentRun.",
  "",
  "### Delegated Agents",
  "",
  "Use `delegate_task` to start a fresh instance of a mounted Agent or AgentTeam",
  "for new work. The `recipient_address` identifies the definition to",
  "instantiate; it is not an alias for the new instance.",
  "",
  "- The work description and reference files become the new instance's first",
  "  message, together with your address and AgentRun ID.",
  "- On success, `target_agent_run_id` is the new instance (for an AgentTeam, its",
  "  coordinator). If `target_agent_run_id` is null, nothing was started and",
  "  `message` explains why; correct the problem and delegate again, or report",
  "  the failure.",
  "",
  "After delegation, communicate with the instance only through `send_message_to`",
  "with its `target_agent_run_id`, in both directions. A delegated agent that",
  "stays quiet is shut down after a while; a message to its run ID restores it",
  "with its conversation, so follow-ups remain possible at any time.",
  "",
  "### Rule-Based Handoffs",
  "",
  RULE_BASED_HANDOFF_LLM_INSTRUCTION,
  "",
  "Do not claim that a message, delegation, or handoff succeeded unless the",
  "corresponding tool confirms success.",
);
