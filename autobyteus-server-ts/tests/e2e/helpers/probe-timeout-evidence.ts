import { vi } from "vitest";

/**
 * Makes a discovery timeout in an E2E run explain itself (autobyteus-561, D-6 branch B). A capability probe that times out logs
 * `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }` (src/runtime-management/probe-time-bound.ts) and the run start then fails with
 * `AGY_MODEL_DISCOVERY_TIMEOUT`, whose text says nothing about which command or bound ended. A stall of the main thread of up to 12 s does
 * not make a probe time out falsely (the stall reproduction of this ticket), so a real occurrence is worth its evidence: this records the
 * lines (the console output itself is unchanged) and `describeProbeTimeouts()` returns them for a failure message.
 */
export type ProbeTimeoutEvidence = Readonly<{
  /** The recorded `RUNTIME_PROBE_TIMED_OUT` details, oldest first. */
  seen: readonly unknown[];
  /** A sentence for a failure message: the command and bound that ended, or that no probe time-out was logged. */
  describe(): string;
  stop(): void;
}>;

export const recordProbeTimeouts = (): ProbeTimeoutEvidence => {
  const seen: unknown[] = [];
  const original = console.warn.bind(console);
  const spy = vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    if (args[0] === "RUNTIME_PROBE_TIMED_OUT") seen.push(args[1]);
    original(...args);
  });
  return {
    seen,
    describe: () => seen.length
      ? `probe time-outs logged: ${seen.map((detail) => JSON.stringify(detail)).join("; ")}`
      : "no RUNTIME_PROBE_TIMED_OUT was logged (the failure is not a probe's time bound)",
    stop: () => spy.mockRestore(),
  };
};

/** The failure text of a discovery error plus the evidence; any other text is returned as it is. */
export const withProbeEvidence = (message: string, evidence: ProbeTimeoutEvidence): string =>
  /discovery timed out|AGY_MODEL_DISCOVERY_TIMEOUT/.test(message) ? `${message} [${evidence.describe()}]` : message;
