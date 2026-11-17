import type { AgentBackgroundTaskInspection } from "./agent-background-task-view.js";

/**
 * How many background tasks a run has running (autobyteus-448 part 2): the one derivation, from the runtime's
 * background-task view. An event-stream runtime knows its tasks now (`current()`); a snapshot runtime (Codex) answers
 * only asynchronously and an unsupported one (ACP) not at all, so both count 0.
 */
export const runningBackgroundTaskCount = (inspection: AgentBackgroundTaskInspection): number =>
  inspection.kind === "event-stream" ? inspection.current().filter((task) => task.status === "running").length : 0;
