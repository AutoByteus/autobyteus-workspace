import type { RuntimeSwitchMemory, RuntimeSwitchTicket } from "../../../agent-execution/domain/runtime-switch-memory-port.js";

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * One attempt to make a member's agent runtime switch real (autobyteus-316's sequence for Team members, Org members and
 * delegated copies): the ticket was taken before the candidate prepared, `record` archives the previous agent's records
 * behind the marker once the candidate is valid, and `discard` removes what a failed attempt's candidate wrote after the
 * watermark. The handle calls `record` before the durable commit and `discard` only after the candidate's release is
 * confirmed and only if `record` did not succeed (the key-guarded discard is a no-op once the marker is in the file anyway).
 */
export class ConfiguredAgentSwitchAttempt {
  private recorded = false;

  constructor(
    private readonly memory: RuntimeSwitchMemory,
    private readonly memoryDir: string,
    private readonly ticket: RuntimeSwitchTicket,
  ) {}

  record(): void {
    this.memory.record(this.memoryDir, this.ticket);
    this.recorded = true;
  }

  /** Never throws: the attempt's own error is the one the caller reports. */
  discardUnlessRecorded(): void {
    if (this.recorded) return;
    try {
      this.memory.discard(this.memoryDir, this.ticket);
    } catch (error) {
      logger.warn(`RUNTIME_SWITCH_DISCARD_FAILED:${this.ticket.runtimeSwitch.runId}: ${String(error)}`);
    }
  }
}
