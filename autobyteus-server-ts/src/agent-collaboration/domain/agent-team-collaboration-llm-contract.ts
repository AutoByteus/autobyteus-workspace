/**
 * Descriptions of `send_message_to` and `delegate_task`, written for the agent (ticket
 * collaboration-prompt-wording, wording authority §6). They say only how each tool works, true for
 * any caller; who the agent reaches by address or by ID and when to message is in its prompt
 * (`agent-execution/prompt/collaboration-prompt-sections.ts`). Native tools and the Agent Tools
 * MCP server share these constants, so every runtime reads the same text.
 */

export const SEND_MESSAGE_TO_LLM_DESCRIPTION = [
  "Send a self-contained request, result, question or blocker to an agent or agent team that already exists. Use exactly one selector, never both:",
  "- recipient_address: an exact address beginning with '/'. A team's address reaches its coordinator. An address inside your own team reaches the member of your own team.",
  "- target_agent_run_id: an agent's run id. For a task agent team, use its coordinator's run id; a team's own run id is refused.",
  "send_message_to never creates an agent; to have work done by a new agent, use delegate_task. It returns the run id of the agent that received the message as target_agent_run_id, or null with the reason when the message can't be delivered.",
].join("\n");

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "An exact address beginning with '/'. Relative addresses, bare names and '/' alone are not valid.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "An agent's run id. Unknown run ids are rejected.";

export const DELEGATE_TASK_LLM_DESCRIPTION = [
  "Delegate a task to an agent or agent team. Use exactly one mode:",
  "(1) recipient_address and description, with optional reference_files: creates a new task agent (or task agent team) that works on the task you describe;",
  "(2) recipient_address and task_id: creates a new task agent (or task agent team) for that saved Task (its description and files);",
  "(3) exactly one of target_agent_run_id or target_team_run_id, with task_id: gives the saved Task to one of your task agents (or task agent teams), which continues with its conversation; use it for follow-up work that builds on what that task agent already did. This works only when you made its most recent assignment and its current Task is DONE or CANCELLED; that earlier Task stays closed.",
  "Never supply project_id. Delegating to yourself, a teammate or your own team is refused.",
  "The task description and reference files become the task agent's first message (for a task agent team, its coordinator receives them), together with your run id.",
  "If you are a task agent yourself (another agent delegated your task to you or to your team), task_id is refused, and a delegation with a description returns no task_id: the new task agent's work is part of your Task. Otherwise, a delegation with a description also creates a Task with no Project and returns its task_id.",
  "On success, delegated is true, target_kind is agent or team, and the result names the task agent: target_agent_run_id for a task agent; for a task agent team, target_team_run_id (the team; use it to give the team a later Task) and target_team_coordinator_agent_run_id (its coordinator; talk with the team through this run id). launch_notes, when present, says which agent runs on a different runtime or model than configured. If delegated is false, nothing was created and message says why; correct the problem and delegate again, or report the failure.",
].join("\n");

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "Only for a new task agent: the exact address of an available agent or agent team, beginning with '/'. Every call with an address creates another task agent or task agent team. Omit it when you give a Task to one of your task agents with target_agent_run_id or target_team_run_id.";

export const DELEGATE_TASK_TARGET_TEAM_RUN_ID_DESCRIPTION =
  "One of your task agent teams, by the target_team_run_id an earlier delegation returned (the team's run id, not its coordinator's). Supply only it and task_id.";

export const DELEGATE_TASK_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "One of your task agents, by the target_agent_run_id an earlier delegation returned. Supply only it and task_id. A task agent team's coordinator's run id is refused: use target_team_run_id for a task agent team.";

export const DELEGATE_TASK_ID_DESCRIPTION =
  "A saved Task's ID on this node; its saved text and files are used. With recipient_address: a new task agent works on the Task. With target_agent_run_id or target_team_run_id: that task agent takes on the Task. Blank, unknown, ambiguous, DONE or CANCELLED Tasks fail.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Only with recipient_address and without task_id. A complete, ready-to-work task description: objective, context, scope, constraints, what done looks like, expected output and reference guidance.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional, only with recipient_address and description; not allowed with task_id, not even as an empty list. Absolute local file paths the task agent should read. Relative paths and URLs are rejected.";
