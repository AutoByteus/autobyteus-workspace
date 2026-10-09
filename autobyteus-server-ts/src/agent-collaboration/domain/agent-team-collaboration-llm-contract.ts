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
  "anything in. target_agent_run_id takes agent run IDs only: to message a Team copy, use",
  "its coordinator's ID (target_team_coordinator_agent_run_id from delegate_task); a team",
  "run ID is refused with the coordinator's ID to use. A copy whose Task is DONE or CANCELLED is",
  "stopped: the run that assigned it can continue that same Task with it by first moving the",
  "Task to TODO or IN_PROGRESS with create_or_update_task and then messaging the copy's agent",
  "run ID (for a Team copy, its coordinator's), which reactivates the copy with its",
  "conversation. To give such a copy a different Task, use delegate_task with its",
  "target_team_run_id or target_agent_run_id instead. On success, it returns the",
  "exact AgentRun that accepted the message as flat target_agent_run_id; on",
  "rejection, target_agent_run_id is null.",
);

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "Canonical absolute non-root Agent-or-AgentTeam address beginning with '/'. It reaches the one instance at that address: an Agent's instance, or an AgentTeam instance's coordinator; inside your own team instance, a teammate's address reaches the member of that same instance. An available agent or team that is not yet in the run is brought in on first use. Provide either recipient_address or target_agent_run_id, never both.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "Exact agent run ID (AgentRun.runId) to receive a work request, result, or blocker: any AgentRun in the same root, including a shut-down delegated agent (restored with its conversation before delivery), or a currently active AgentRun elsewhere. For a Team copy, use its coordinator's agent run ID (target_team_coordinator_agent_run_id); a team run ID is refused. A delegated copy whose Task is DONE or CANCELLED is reactivated only by the run that assigned it, after it moves the Task to TODO or IN_PROGRESS. Unknown run IDs are rejected; a run ID never brings anything in. Provide either target_agent_run_id or recipient_address, never both.";

export const DELEGATE_TASK_LLM_DESCRIPTION = lines(
  "Delegate work to a copy of an Agent or AgentTeam. Use exactly one mode:",
  "(1) recipient_address and task_id: spawn a new copy for the saved Task (its description and files);",
  "(2) recipient_address and description, with optional reference_files: spawn a new copy for described work;",
  "(3) exactly one of target_team_run_id or target_agent_run_id, and task_id: give the saved Task",
  "to an existing copy you delegated in this run, named by its own ID (a Team copy by its team run",
  "ID, an Agent copy by its agent run ID). Never supply project_id. With an address, every call spawns",
  "another copy, so copies can work in parallel; recipient_address identifies what to copy: a",
  "mounted Agent or AgentTeam, a collaborator, or an available agent or team that is not yet in the",
  "run. An AgentTeam copy's coordinator receives the work. With a copy's ID, the copy resumes with its",
  "conversation and receives the Task's work as a message from you; use it for follow-up work that",
  "builds on what the copy already did. A copy has one current Task at a time: you can give it a new",
  "Task only if you made its most recent assignment and its current Task is DONE or CANCELLED; that",
  "earlier Task stays closed, and closing it again never stops the copy. The work includes your",
  "address and AgentRun ID so the copy can reply. On success it returns delegated: true and",
  "target_kind. An Agent copy: target_agent_run_id. A Team copy: target_team_run_id (the copy;",
  "use it to give this copy a later Task) and target_team_coordinator_agent_run_id (its",
  "coordinator; message the copy through it with send_message_to). On failure delegated is false",
  "and message explains why; nothing was started. A description-only delegation that creates a",
  "Task also returns its task_id; when the work is finished, call create_or_update_task with that",
  "task_id and status DONE (or CANCELLED if the work turned out not to be needed), which stops the",
  "copy and removes it from the run. To continue the same Task with the same copy later, move the",
  "Task to TODO or IN_PROGRESS first, then message the copy's agent run ID (for a Team, its",
  "coordinator's): that reactivates it with its conversation. While you work on a Task yourself, a",
  "description-only delegation is sub-work of your Task: it returns no task_id and closes only when",
  "your Task is DONE or CANCELLED; you cannot use task_id.",
);

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "For a new copy: exact canonical absolute non-root address beginning with '/' of the Agent or AgentTeam to copy: a mounted one, a collaborator, or an available agent or team. With an address, every call spawns a new copy; an AgentTeam copy's coordinator receives the work. Omit it when you give a Task to an existing copy with target_team_run_id or target_agent_run_id.";

export const DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION =
  "For an existing Team copy: the target_team_run_id an earlier delegate_task returned (the team run ID, not its coordinator's agent run ID). Supply only it and task_id. The copy gets that saved Task and resumes with its conversation; you must have made its most recent assignment, and its current Task must be DONE or CANCELLED.";

export const DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "For an existing Agent copy: the target_agent_run_id an earlier delegate_task returned for an Agent copy. Supply only it and task_id. The copy gets that saved Task and resumes with its conversation; you must have made its most recent assignment, and its current Task must be DONE or CANCELLED. A Team coordinator's ID is refused: use target_team_run_id for a Team copy.";

export const DELEGATE_TASK_ID_DESCRIPTION = "Unique saved Task ID on the current node; the system reads its saved text/files. With recipient_address, supply only recipient_address and task_id: a new copy is spawned for the Task. With target_team_run_id or target_agent_run_id, supply only that ID and task_id: the existing copy gets the Task. Blank, unknown, ambiguous, DONE or CANCELLED Tasks fail.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Only with recipient_address and without task_id. Complete ready-to-run work description: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this as the new copy's first message; do not resend it with send_message_to.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional, only with recipient_address and description; forbidden with task_id even as an empty array. Absolute local file paths the new copy should inspect. Use full filesystem paths; relative paths and URLs are rejected.";

export const AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION = lines(
  "## AgentTeam Collaboration",
  "",
  "### Work Requests and Outcomes",
  "",
  WORK_REQUEST_EXECUTION_LLM_INSTRUCTION,
  "",
  "Choose the collaboration mode based on your primary intent.",
  "`send_message_to` reaches the one instance at an address, brought in on first use.",
  "`delegate_task` with an address spawns a new copy of an Agent or AgentTeam for new work;",
  "with a copy's own ID it gives a new saved Task to that existing copy.",
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
  "AgentRun. `target_agent_run_id` takes agent run IDs only: a team run ID is",
  "refused with its coordinator's agent run ID to use.",
  "",
  "### Delegated Agents",
  "",
  "Use `delegate_task` with `recipient_address` to spawn a new copy of an Agent or",
  "AgentTeam for new work. The `recipient_address` identifies what to copy (a mounted",
  "Agent or AgentTeam, a collaborator, or an available agent or team); it is not an",
  "alias for the new copy. Every call with an address spawns another copy, so copies",
  "can work in parallel.",
  "",
  "- Supply task_id alone for saved Task text/files, or description and optional reference_files without task_id.",
  "- The work description and reference files become the copy's first message,",
  "  together with your address and AgentRun ID.",
  "- On success, `delegated` is true and `target_kind` says whether the copy is an",
  "  `agent` or a `team`. An Agent copy is named by `target_agent_run_id`. A Team",
  "  copy is named by `target_team_run_id` (the copy itself) and",
  "  `target_team_coordinator_agent_run_id` (its coordinator, which receives the",
  "  work). If `delegated` is false, nothing was started and `message` explains",
  "  why; correct the problem and delegate again, or report the failure.",
  "- A description-only delegation that creates a Task also returns its",
  "  `task_id`. When the work is finished, call `create_or_update_task` with that",
  "  `task_id` and status `DONE` (or `CANCELLED` if the work turned out not to be",
  "  needed); this stops the copy and removes it from the run.",
  "- While you work on a Task yourself, a description-only delegation is sub-work",
  "  of your Task: it returns no `task_id` and closes only with your Task.",
  "",
  "To give a follow-up Task to a copy you delegated, call `delegate_task` with its",
  "`target_team_run_id` (a Team copy) or `target_agent_run_id` (an Agent copy) and",
  "the new `task_id`. The copy resumes with its conversation and receives the Task's",
  "work from you. A copy has one current Task at a time: this works only when you",
  "made its most recent assignment and its current Task is `DONE` or `CANCELLED`;",
  "that earlier Task stays closed, and closing it again never stops the copy.",
  "",
  "Message a copy only through `send_message_to` with an agent run ID: its",
  "`target_agent_run_id`, or for a Team copy its `target_team_coordinator_agent_run_id`,",
  "in both directions. A copy that stays quiet is shut down after a while, but not",
  "while it has a running background task; a message to it restores it with its",
  "conversation. A copy whose Task is `DONE` or `CANCELLED` is stopped. To continue",
  "that same Task with it, the run that assigned the work first moves the Task out of",
  "`DONE` or `CANCELLED` (for example to `IN_PROGRESS`) with `create_or_update_task`,",
  "then messages the copy; that reactivates it with its conversation. Setting the",
  "status alone starts nothing.",
  "",
  "### Rule-Based Handoffs",
  "",
  RULE_BASED_HANDOFF_LLM_INSTRUCTION,
  "",
  "Do not claim that a message, delegation, or handoff succeeded unless the",
  "corresponding tool confirms success.",
);
