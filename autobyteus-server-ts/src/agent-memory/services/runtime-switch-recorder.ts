import type { RuntimeSwitch } from "../../agent-execution/domain/runtime-switch.js";
import type { RuntimeSwitchMemory } from "../../agent-execution/domain/runtime-switch-ports.js";
import { RUNTIME_HANDOVER_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import { ExternalRuntimeMemoryWriter } from "../store/external-runtime-memory-writer.js";

/** The turn of the marker record: it belongs to no turn of either agent runtime. */
const MARKER_TURN_ID = "runtime_switch";

/**
 * Writes the agent runtime switch into a run's raw traces: the marker (a platform notice record) as the first record of the
 * new file, and the previous agent's records archived before it with the existing rotate-before-boundary primitive. Idempotent
 * by the switch key: a retry finds the marker or the archived segment and writes nothing twice. Nothing the previous agent
 * wrote is edited. No agent runtime has recorded anything in the new file yet, so one file never holds two agent runtimes.
 */
export class RuntimeSwitchRecorder implements RuntimeSwitchMemory {
  record(memoryDir: string, runtimeSwitch: RuntimeSwitch): void {
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const state = writer.getRuntimeSwitchState(runtimeSwitch.key);
    if (state.hasCompleteSegment) {
      // The archive was published; a crash-free retry only has to drop what the archive already holds.
      writer.removeActiveRecordsArchivedByBoundary(runtimeSwitch.key);
      return;
    }
    const markerTraceId = state.activeMarkerTraceId ?? writer.appendRawTrace({
      traceType: "system_task_notification",
      turnId: MARKER_TURN_ID,
      content: runtimeSwitch.markerText,
      senderId: RUNTIME_HANDOVER_NOTICE_SENDER_ID,
      correlationId: runtimeSwitch.key,
      sourceEvent: "runtime_switch",
    }).id;
    writer.rotateActiveRawTracesBeforeBoundary({
      boundaryTraceId: markerTraceId,
      boundaryKey: runtimeSwitch.key,
      boundaryType: "runtime_switch",
      runtimeKind: runtimeSwitch.from.runtimeKind,
      sourceEvent: "runtime_switch",
    });
  }
}
