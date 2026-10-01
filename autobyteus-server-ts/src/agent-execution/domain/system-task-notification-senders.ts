/**
 * `sender_id` of the conversation notice a Claude session emits before a turn the Claude
 * CLI started itself (a background task completed). Shared by the Claude backend, which
 * produces it, and agent memory, which records only this producer's notices.
 */
export const CLAUDE_BACKGROUND_TASK_NOTICE_SENDER_ID = "system.claude_background_task";
