/**
 * `sender_id` of the conversation notice a Claude session emits before a turn the Claude
 * CLI started itself (a background task completed). Shared by the Claude backend, which
 * produces it, and agent memory, which records only this producer's notices.
 */
export const CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID = "system.claude_background_task";

/**
 * `sender_id` of the platform notice that tells a run a skill it uses changed on disk. Shared by
 * the skill update notice service, which produces it, and agent memory, which records it.
 */
export const SKILL_UPDATE_NOTICE_SENDER_ID = "system.skill_update_notifier";

/**
 * `sender_id` of the platform notice that tells a run its tool list changed. Shared by the tool
 * list update service, which produces it, and agent memory, which records it.
 */
export const TOOL_LIST_UPDATE_NOTICE_SENDER_ID = "system.tool_list_update_notifier";

/**
 * `sender_id` of a routing request posted into the node's Model Router agent (autobyteus-32 A-31). Shared by Model
 * Routing, which produces it, and agent memory, which records it so the agent's conversation keeps its requests.
 */
export const MODEL_ROUTER_REQUEST_SENDER_ID = "system.model_router";

/**
 * `sender_id` of the agent runtime switch marker and of the hand-over notice the new agent receives with its first input.
 * The marker is recorded once at the activation; the live notice only shows it, so this id is deliberately not recorded
 * by the live-event path.
 */
export const RUNTIME_HANDOVER_NOTICE_SENDER_ID = "system.runtime_handover";
