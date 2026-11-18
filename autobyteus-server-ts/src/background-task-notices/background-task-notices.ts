import { BackgroundTaskNoticeService } from "./services/background-task-notice-service.js";

/** The background task notice subsystem of one `AgentRunManager` (autobyteus-338). */
export type BackgroundTaskNotices = Readonly<{
  /** The input-preface port and the run lifecycle observer for the run manager's platform notices. */
  service: BackgroundTaskNoticeService;
  close(): void;
}>;

/** Builds the subsystem: native runs are told, in one batched notice, when their background tasks end. */
export const createBackgroundTaskNotices = (input: Readonly<{ settleMs?: number }> = {}): BackgroundTaskNotices => {
  const service = new BackgroundTaskNoticeService({ settleMs: input.settleMs });
  return Object.freeze({ service, close: () => service.close() });
};
