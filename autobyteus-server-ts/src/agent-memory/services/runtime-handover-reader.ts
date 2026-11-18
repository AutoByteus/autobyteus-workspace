import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RUNTIME_HANDOVER_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";

/** The switch marker a pending hand-over starts with: its ID and the one line the chat shows. */
export type PendingRuntimeHandover = Readonly<{ markerTraceId: string; markerText: string }>;

const isHandoverMarker = (record: Record<string, unknown>): boolean =>
  record.trace_type === "system_task_notification" && record.sender_id === RUNTIME_HANDOVER_NOTICE_SENDER_ID;

/**
 * Whether a run's new agent still has to receive the hand-over notice, derived from the raw traces and stored nowhere: it is
 * pending while the first record of the active file is the hand-over marker and no `user` record follows it. The scan is
 * read-only and stops at the first `user` record, or at the first record of a run that never switched, so it reads the start
 * of the file and never cuts a damaged end. Returns the marker (its content is the live notice's presentation), or null.
 */
export const readPendingRuntimeHandover = (memoryDir: string): PendingRuntimeHandover | null => {
  let marker: PendingRuntimeHandover | null = null;
  let first = true;
  new RunMemoryFileStore(memoryDir).scanActiveRawTraces((record) => {
    if (first) {
      first = false;
      if (!isHandoverMarker(record) || typeof record.id !== "string") return false;
      marker = { markerTraceId: record.id, markerText: typeof record.content === "string" ? record.content : "" };
      return true;
    }
    if (record.trace_type === "user") {
      marker = null;
      return false;
    }
    return true;
  });
  return marker;
};
