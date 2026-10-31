import type { RuntimeSwitch } from "../../agent-execution/domain/runtime-switch.js";
import type { RuntimeSwitchMemory, RuntimeSwitchTicket } from "../../agent-execution/domain/runtime-switch-memory-port.js";
import { RUNTIME_HANDOVER_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import { ExternalRuntimeMemoryWriter } from "../store/external-runtime-memory-writer.js";

/** The turn of the marker record: it belongs to no turn of either agent runtime. */
const MARKER_TURN_ID = "runtime_switch";

/**
 * Writes an agent runtime switch into a run's raw traces. `begin` takes the watermark: the last record the previous agent wrote
 * (nothing is written). `record` archives the records through the watermark behind the marker, in one library call, so the
 * marker is the first record of the new file and the records the new agent's candidate wrote while it prepared follow it.
 * `discard` removes those records when the attempt failed before `record`. Idempotent by the switch key: a retry finds the
 * marker or the archived segment and writes nothing twice. Nothing the previous agent wrote is edited.
 */
export class RuntimeSwitchRecorder implements RuntimeSwitchMemory {
  begin(memoryDir: string, runtimeSwitch: RuntimeSwitch): RuntimeSwitchTicket {
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    return Object.freeze({ runtimeSwitch, watermarkTraceId: writer.readLastActiveRawTraceId() });
  }

  record(memoryDir: string, ticket: RuntimeSwitchTicket): void {
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
    const { runtimeSwitch } = ticket;
    writer.rotateActiveRawTracesForRuntimeSwitch({
      key: runtimeSwitch.key,
      marker: writer.buildRawTrace({
        id: runtimeSwitch.markerTraceId,
        traceType: "system_task_notification",
        turnId: MARKER_TURN_ID,
        content: runtimeSwitch.markerText,
        senderId: RUNTIME_HANDOVER_NOTICE_SENDER_ID,
        correlationId: runtimeSwitch.key,
        sourceEvent: "runtime_switch",
      }),
      throughTraceId: ticket.watermarkTraceId,
      previousRuntimeKind: runtimeSwitch.from.runtimeKind,
    });
  }

  discard(memoryDir: string, ticket: RuntimeSwitchTicket): void {
    new ExternalRuntimeMemoryWriter({ memoryDir }).removeActiveRawTracesAfter(ticket.watermarkTraceId, ticket.runtimeSwitch.key);
  }
}
