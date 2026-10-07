const lines = (...values: string[]): string => values.join("\n");

export const WORK_REQUEST_EXECUTION_LLM_INSTRUCTION = [
  "On receiving a work request, follow your own agent instructions and applicable skills.",
  "Do not send acknowledgements or promises to work.",
  "Use `send_message_to` only at a workflow-defined handoff point or when blocked and needing external input.",
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
  "anything in. A copy whose Task is DONE is stopped: the run that assigned it",
  "can continue with it by first moving the Task to TODO or IN_PROGRESS with",
  "create_or_update_task and then messaging the run ID delegate_task returned,",
  "which reactivates the copy with its conversation. On success, it returns the",
  "exact AgentRun that accepted the message as flat target_agent_run_id; on",
  "rejection, target_agent_run_id is null.",
);

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "Canonical absolute non-root Agent-or-AgentTeam address beginning with '/'. It reaches the one instance at that address: an Agent's instance, or an AgentTeam instance's coordinator; inside your own team instance, a teammate's address reaches the member of that same instance. An available agent or team that is not yet in the run is brought in on first use. Provide either recipient_address or target_agent_run_id, never both.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "Exact AgentRun.runId to receive a work request, result, or blocker: any AgentRun in the same root, including a shut-down delegated agent (restored with its conversation before delivery), or a currently active AgentRun elsewhere. A delegated copy whose Task is DONE is reactivated only by the run that assigned it, after it moves the Task to TODO or IN_PROGRESS. Unknown run IDs are rejected; a run ID never brings anything in. Provide either target_agent_run_id or recipient_address, never both.";

export const DELEGATE_TASK_LLM_DESCRIPTION = lines(
  "Use exactly one work source: task_id alone uses the saved Task description and files;",
  "without task_id, description is required and reference_files is optional.",
  "Never supply project_id or description/reference_files keys with task_id.",
  "Spawn one new copy of an Agent or AgentTeam and give it this work as its",
  "first message. recipient_address identifies what to copy: a mounted Agent or",
  "AgentTeam, a collaborator, or an available agent or team that is not yet in",
  "the run. Every call spawns another copy, so copies can work in parallel; an",
  "AgentTeam copy's coordinator receives the work. The first message includes",
  "your address and AgentRun ID so the copy can reply. On success it returns the",
  "copy's target_agent_run_id and target_kind (agent, or team for an AgentTeam",
  "copy whose coordinator is the run ID); if nothing was started,",
  "target_agent_run_id is null and message explains why. Follow up on the copy",
  "only by its run ID through send_message_to. A description-only delegation",
  "that creates a Task also returns its task_id; when the work is finished, call",
  "create_or_update_task with that task_id and status DONE, which stops the copy",
  "and removes it from the run. To continue with the same copy later, move the",
  "Task to TODO or IN_PROGRESS first, then message its run ID: that reactivates",
  "it with its conversation.",
);

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "Exact canonical absolute non-root address beginning with '/' of the Agent or AgentTeam to copy: a mounted one, a collaborator, or an available agent or team. Every call spawns a new copy; an AgentTeam copy's coordinator receives the work.";

export const DELEGATE_TASK_ID_DESCRIPTION = "Unique saved Task ID on the current node. Supply only recipient_address and task_id; the system reads saved text/files. Blank, unknown, ambiguous or DONE Tasks fail. Each call creates a fresh linked copy.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Required only when task_id is absent; forbidden when task_id is present. Complete ready-to-run work description: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this as the new instance's first message; do not resend it with send_message_to.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional only without task_id; forbidden with task_id even as an empty array. Absolute local file paths the new instance should inspect. Use full filesystem paths; relative paths and URLs are rejected.";

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
  "- Supply task_id alone for saved Task text/files, or description and optional reference_files without task_id.",
  "- The work description and reference files become the copy's first message,",
  "  together with your address and AgentRun ID.",
  "- On success, `target_agent_run_id` is the new copy (for an AgentTeam, its",
  "  coordinator) and `target_kind` says whether it is an `agent` or a `team`.",
  "  If `target_agent_run_id` is null, nothing was started and",
  "  `message` explains why; correct the problem and delegate again, or report",
  "  the failure.",
  "- A description-only delegation that creates a Task also returns its",
  "  `task_id`. When the work is finished, call `create_or_update_task` with that",
  "  `task_id` and status `DONE`; this stops the copy and removes it from the run.",
  "",
  "Follow up on a copy only through `send_message_to` with its",
  "`target_agent_run_id`, in both directions. A copy that stays quiet is shut",
  "down after a while; a message to its run ID restores it with its",
  "conversation. A copy whose Task is `DONE` is stopped. To continue with it, the",
  "run that assigned the work first moves the Task out of `DONE` (for example to",
  "`IN_PROGRESS`) with `create_or_update_task`, then messages the copy's run ID;",
  "that reactivates it with its conversation. Setting the status alone starts",
  "nothing.",
  "",
  "### Rule-Based Handoffs",
  "",
  RULE_BASED_HANDOFF_LLM_INSTRUCTION,
  "",
  "Do not claim that a message, delegation, or handoff succeeded unless the",
  "corresponding tool confirms success.",
);
