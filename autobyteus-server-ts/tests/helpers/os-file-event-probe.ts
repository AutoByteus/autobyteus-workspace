import fs from "node:fs/promises";
import { existsSync, watch as fsWatch } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * TESTING.md "File watching on a busy Mac" (autobyteus-579 I-3; first in `file-system-watcher.integration.test.ts`, SR-013/014
 * of autobyteus-500): when a wait for a file event reaches its limit, whether the OS delivers file events at all now decides
 * what the failure means. A fresh raw `fs.watch` (none of our watcher code) gets one sentinel write, for at most 10 s:
 * - no event: `ENVIRONMENT` — the OS delivered nothing (FSEvents under load), so the watcher result says nothing;
 * - an event: `INCONCLUSIVE` — under load the OS can drop one stream's events and not another's, so not a product verdict
 *   either; the proof is a run where the OS delivers events.
 * Neither is a pass: the label only says the failure is the host's, not the product's.
 */
export const OS_FILE_EVENT_PROBE_MS = 10_000;

export const ENVIRONMENT_LABEL = "ENVIRONMENT: the OS delivered no file event within 10 s (FSEvents under load); this watcher result is not meaningful";
export const INCONCLUSIVE_LABEL = "INCONCLUSIVE: the watcher saw no change; a fresh fs.watch stream did. Under load the OS can drop one stream's events (FU-500-06); rerun where the OS delivers events.";

/**
 * Whether a fresh raw `fs.watch` gets an event for one write within `probeMs`: in `dir` (the folder the timed-out wait
 * watched, when it still exists; the sentinel file is removed afterwards), or else in a new temp folder.
 */
export const osDeliversFileEvents = async (options: { dir?: string; probeMs?: number } = {}): Promise<boolean> => {
  const own = !options.dir || !existsSync(options.dir);
  const dir = own ? await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-watch-probe-")) : options.dir!;
  const sentinel = path.join(dir, `.os-file-event-probe-${process.pid}-${Date.now()}.txt`);
  try {
    return await new Promise<boolean>((resolve) => {
      const watcher = fsWatch(dir, () => { clearTimeout(timer); watcher.close(); resolve(true); });
      const timer = setTimeout(() => { watcher.close(); resolve(false); }, options.probeMs ?? OS_FILE_EVENT_PROBE_MS);
      void fs.writeFile(sentinel, "probe", "utf-8");
    });
  } finally {
    if (own) await fs.rm(dir, { recursive: true, force: true });
    else await fs.rm(sentinel, { force: true });
  }
};

/**
 * The error for a file-event wait that reached its limit: the label from the probe, then the wait's own message (what it
 * waited for, what it saw). Throw what it returns.
 */
export const labelFileEventTimeout = async (
  timedOut: Error | string,
  options: { dir?: string; probeMs?: number } = {},
): Promise<Error> => {
  const detail = timedOut instanceof Error ? timedOut.message : timedOut;
  return new Error(`${await osDeliversFileEvents(options) ? INCONCLUSIVE_LABEL : ENVIRONMENT_LABEL}\n${detail}`);
};
