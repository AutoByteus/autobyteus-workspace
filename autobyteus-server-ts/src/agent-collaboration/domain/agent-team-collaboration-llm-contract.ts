const lines = (...values: string[]): string => values.join("\n");

const RULE_BASED_HANDOFF_LLM_INSTRUCTION = [
  "When you finish your own work or are blocked, call `get_handoff_rules`.",
  "Evaluate the returned rules against your outcome. Select the single rule whose",
  "`when` condition most specifically applies, and notify only its `recipient_address`",
  "using `send_message_to`. Do not notify additional recipients for the same outcome.",
  "If no rule applies, finish normally.",
].join(" ");

export const SEND_MESSAGE_TO_LLM_DESCRIPTION = lines(
  "Send one self-contained ordinary message to an already existing AgentRun. Use",
  "exactly one selector: recipient_address for one canonical absolute non-root",
  "logical Agent-or-AgentTeam address in the same rooted AgentTeam, or",
  "target_agent_run_id for one exact currently active AgentRun. An Agent address",
  "resolves to its mounted Agent execution; an AgentTeam address resolves to its",
  "mounted configured coordinator. This call creates no task or new execution.",
  "On success, it returns the exact existing AgentRun that accepted the message as",
  "flat target_agent_run_id; on rejection, target_agent_run_id is null.",
);

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "Canonical absolute non-root logical Agent-or-AgentTeam address beginning with '/'. Messaging an Agent reaches its existing mounted execution; messaging an AgentTeam reaches its existing mounted configured coordinator. This selector creates no new execution. Provide either recipient_address or target_agent_run_id, never both.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "Exact currently active AgentRun.runId to receive an ordinary message. This selector is live-only: inactive, preallocated, recoverable, lazy-startable, or unknown run IDs are rejected. Provide either target_agent_run_id or recipient_address, never both.";

export const DELEGATE_TASK_LLM_DESCRIPTION = lines(
  "Spawn one fresh, independently tracked task execution for one mounted Agent or",
  "AgentTeam in the same rooted AgentTeam. recipient_address identifies the",
  "Agent or AgentTeam definition from which the task instance is spawned. An",
  "Agent target spawns one fresh task Agent and delivers the complete task packet",
  "to it. An AgentTeam target spawns one fresh task Team and delivers the complete",
  "task packet to that new Team's configured coordinator. The delegation call is",
  "both the task-creation and assignment step; do not resend the same work through",
  "send_message_to. On success, it returns task_id, status, and the fresh task",
  "ingress as target_agent_run_id.",
);

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "Exact canonical absolute non-root address beginning with '/' for the mounted Agent or AgentTeam definition from which a fresh task instance will be spawned. Agent targets spawn a fresh task Agent. AgentTeam targets spawn a fresh task Team whose configured coordinator receives the task packet.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Complete ready-to-run task packet: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this packet to the spawned task execution; do not resend it with send_message_to.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional absolute local file paths the spawned task execution should inspect. Use full filesystem paths; relative paths and URLs are rejected.";

export const AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION = lines(
  "## AgentTeam Collaboration",
  "",
  "Choose the collaboration mode based on your primary intent.",
  "`send_message_to` communicates with an already existing execution.",
  "`delegate_task` spawns a fresh task execution that independently owns a unit",
  "of work. These operations are not interchangeable. Never use both to deliver",
  "the same work.",
  "",
  "### Ordinary Communication",
  "",
  "Use `send_message_to` to communicate with an already existing Agent or",
  "AgentTeam instance.",
  "",
  "- When `recipient_address` identifies an Agent, the message is delivered to",
  "  that mounted Agent's existing execution.",
  "- When `recipient_address` identifies an AgentTeam, the message is delivered",
  "  to that mounted Team's existing configured coordinator.",
  "- When an exact active AgentRun ID is known, `target_agent_run_id` may instead",
  "  select that specific execution.",
  "",
  "A successful call returns the exact existing AgentRun that accepted the",
  "message as `target_agent_run_id`. For an AgentTeam recipient, this is its",
  "existing coordinator AgentRun.",
  "",
  "`send_message_to` does not spawn an Agent or AgentTeam, create or track a task,",
  "submit a task result, review a task result, or change task status.",
  "",
  "### Dedicated Task Execution",
  "",
  "Use `delegate_task` to assign a new bounded unit of work that requires its own",
  "execution, ownership, and task lifecycle.",
  "",
  "The `recipient_address` identifies the mounted Agent or AgentTeam definition",
  "from which the task execution is spawned.",
  "",
  "- When `recipient_address` identifies an Agent, the system spawns a fresh task",
  "  Agent instance and delivers the complete task packet to that new Agent.",
  "- When `recipient_address` identifies an AgentTeam, the system spawns a fresh",
  "  task AgentTeam instance and delivers the complete task packet to that new",
  "  Team's configured coordinator. The entire task Team is newly spawned; its",
  "  coordinator is the initial task ingress.",
  "",
  "A successful call returns the new task's `task_id`, `status`, and exact spawned",
  "task ingress as `target_agent_run_id`. For a task AgentTeam, this is the newly",
  "spawned Team's coordinator AgentRun.",
  "",
  "The delegation call is both the creation and assignment step. Include the",
  "complete task description and reference files in that call. Do not send the",
  "same assignment again through `send_message_to`.",
  "",
  "The original logical `recipient_address` continues to identify the mounted",
  "Agent or AgentTeam. It is not an alias for the newly spawned task execution.",
  "",
  "If delegation returns `status: \"not_started\"`, no task execution was",
  "successfully spawned. Do not use an ordinary message as an equivalent task-",
  "creation fallback. Correct the problem and delegate again, or report the",
  "failure.",
  "",
  "### Additional Task Clarification",
  "",
  "After successful delegation, genuinely new clarification may be sent to the",
  "exact active task ingress using the returned `target_agent_run_id`. Never",
  "repeat the original task packet, and never use the original logical",
  "`recipient_address` as an alias for the spawned task execution.",
  "",
  "An additional message communicates with the active task execution; it does not",
  "create another task or change the existing task's lifecycle state.",
  "",
  "### Task Lifecycle",
  "",
  "The spawned task assignee uses `submit_task_result` to submit its formal result.",
  "The delegator uses `review_task_result` to accept the result or request a",
  "revision.",
  "",
  "Message wording such as \"finished,\" \"accepted,\" or \"please revise\" does not",
  "change task state.",
  "",
  "### Rule-Based Handoffs",
  "",
  RULE_BASED_HANDOFF_LLM_INSTRUCTION,
  "",
  "Do not claim that a message, delegation, or handoff succeeded unless the",
  "corresponding tool confirms success.",
);
