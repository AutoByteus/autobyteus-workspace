import type { ChildProcess } from "node:child_process";

export const watcherRuntimeLogger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const isTimingTraceEnabled = (): boolean =>
  process.env.AUTOBYTEUS_FILE_EXPLORER_WATCHER_TRACE === "1" ||
  process.env.AUTOBYTEUS_FE_TERMINAL_TIMING === "1" ||
  process.env.AUTOBYTEUS_TIMING_TRACE === "1";

export const watcherRuntimeTimingLog = (
  event: string,
  details: Record<string, unknown> = {},
): void => {
  if (!isTimingTraceEnabled()) {
    return;
  }

  watcherRuntimeLogger.info(`[TIMING][WatcherRuntimeClient] ${event} ${JSON.stringify({
    at: Date.now(),
    ...details,
  })}`);
};

const normalizeBuffer = (chunk: Buffer | string): string =>
  Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;

export const attachWatcherRuntimeOutputLogging = (child: ChildProcess): void => {
  child.stdout?.on("data", (chunk) => {
    for (const line of normalizeBuffer(chunk).split(/\r?\n/).filter(Boolean)) {
      watcherRuntimeLogger.info(`[WatcherRuntime:${child.pid ?? "unknown"}:stdout] ${line}`);
    }
  });
  child.stderr?.on("data", (chunk) => {
    for (const line of normalizeBuffer(chunk).split(/\r?\n/).filter(Boolean)) {
      watcherRuntimeLogger.warn(`[WatcherRuntime:${child.pid ?? "unknown"}:stderr] ${line}`);
    }
  });
};
