import type { RuntimeSwitch } from "./runtime-switch.js";

/**
 * What one attempt to make a switch real holds: the switch and the watermark, the ID of the last record the previous agent
 * wrote (null when its file was empty). A plain value, so a retry rebuilds it from the current end of the file.
 */
export type RuntimeSwitchTicket = Readonly<{
  runtimeSwitch: RuntimeSwitch;
  watermarkTraceId: string | null;
}>;

/**
 * What the activation of a switched run needs from agent memory. Owned by `agent-execution` so it does not import
 * `agent-memory`. A failed attempt leaves nothing behind: `discard` removes what the attempt's candidate wrote after the
 * watermark. `record` and `discard` are idempotent by the switch key.
 */
export interface RuntimeSwitchMemory {
  /** The watermark of this attempt. Reads the end of the active raw-trace file; writes nothing. */
  begin(memoryDir: string, runtimeSwitch: RuntimeSwitch): RuntimeSwitchTicket;
  /** Archive the previous agent's records through the watermark and start the active file with the marker. */
  record(memoryDir: string, ticket: RuntimeSwitchTicket): void;
  /** Remove the records written after the watermark; a no-op once the marker is in the file. */
  discard(memoryDir: string, ticket: RuntimeSwitchTicket): void;
}

/** A lifecycle built without it cannot activate a switch (it fails closed). */
export type RuntimeSwitching = Readonly<{ memory: RuntimeSwitchMemory }>;
