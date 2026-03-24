export type ReplayErrorCode = "RECORD_NOT_FOUND" | "REPLAY_STATUS_MISMATCH";

export class ReplayError extends Error {
  constructor(
    readonly code: ReplayErrorCode,
    detail: string,
  ) {
    super(detail);
    this.name = "ReplayError";
  }
}

export const replayRecordNotFound = (detail: string): ReplayError =>
  new ReplayError("RECORD_NOT_FOUND", detail);

export const replayStatusMismatch = (detail: string): ReplayError =>
  new ReplayError("REPLAY_STATUS_MISMATCH", detail);

export const isReplayError = (error: unknown): error is ReplayError =>
  error instanceof ReplayError;
