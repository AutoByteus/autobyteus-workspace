import { describe, expect, it } from "vitest";
import { recordProbeTimeouts, withProbeEvidence } from "../../e2e/helpers/probe-timeout-evidence.js";

/** autobyteus-561 D-6 branch B: a discovery time-out in an E2E run names the probe command and bound that ended it. */
describe("recordProbeTimeouts", () => {
  it("records a RUNTIME_PROBE_TIMED_OUT line, still prints it, and ignores other warnings", () => {
    const printed: unknown[][] = [];
    const realWarn = console.warn;
    console.warn = (...args: unknown[]) => { printed.push(args); }; // what the run's console is; the helper wraps it and passes every call through
    const evidence = recordProbeTimeouts();
    console.warn("something else", { a: 1 });
    console.warn("RUNTIME_PROBE_TIMED_OUT", { runtime: "antigravity", command: "agy models", boundMs: 30_000 });
    evidence.stop();
    console.warn = realWarn;
    expect(evidence.seen).toEqual([{ runtime: "antigravity", command: "agy models", boundMs: 30_000 }]);
    expect(printed).toHaveLength(2);
    expect(evidence.describe()).toContain("agy models");
    expect(evidence.describe()).toContain("30000");
  });

  it("adds the evidence to a discovery time-out message only; says plainly when no probe time-out was logged", () => {
    const evidence = recordProbeTimeouts();
    const timeout = "Antigravity model discovery timed out; check the CLI and retry.";
    expect(withProbeEvidence(timeout, evidence)).toContain("no RUNTIME_PROBE_TIMED_OUT was logged");
    expect(withProbeEvidence("AGY_MODEL_DISCOVERY_TIMEOUT", evidence)).toContain("not a probe's time bound");
    expect(withProbeEvidence("Run not found", evidence)).toBe("Run not found");
    evidence.stop();
  });
});
