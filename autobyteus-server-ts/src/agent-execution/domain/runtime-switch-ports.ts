import type { RuntimeSwitch } from "./runtime-switch.js";

/**
 * What the activation of a switched run needs from agent memory: write the marker and archive the previous agent's
 * records. Owned by `agent-execution` so it does not import `agent-memory`; idempotent by `runtimeSwitch.key`; a throw
 * leaves the activation to be sent again.
 */
export interface RuntimeSwitchMemory {
  record(memoryDir: string, runtimeSwitch: RuntimeSwitch): void;
}

/**
 * What the activation needs from the hand-over notice: remember that this run's next input carries the notice. It gets the
 * switch itself (built once) so the short line it shows the user is the marker sentence, computed in one place.
 */
export interface RuntimeHandoverNotices {
  register(runtimeSwitch: RuntimeSwitch): void;
}

/** The two ports travel together; a lifecycle built without them cannot activate a switch. */
export type RuntimeSwitching = Readonly<{ memory: RuntimeSwitchMemory; notices: RuntimeHandoverNotices }>;
