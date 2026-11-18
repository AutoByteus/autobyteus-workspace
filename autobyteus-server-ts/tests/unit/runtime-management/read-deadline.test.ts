import { describe, expect, it } from "vitest";
import {
  commandBound, createReadDeadline, DeadlineExceededError, deadlineCause, isDeadlineExceeded,
} from "../../../src/runtime-management/read-deadline.js";
import { runRuntimeCommand } from "../../../src/runtime-management/agent-runtimes/runtime-command-runner.js";

/** The one time-out rule (SR-006 CR-002) and command bounds inside a step (SR-007 decision 3). */
describe("read deadline", () => {
  it("bounds a command by the time left only when that is shorter than its usual bound", () => {
    expect(commandBound(undefined, 3_000)).toEqual({ timeoutMs: 3_000, byDeadline: false });
    expect(commandBound(createReadDeadline(8_000), 3_000)).toEqual({ timeoutMs: 3_000, byDeadline: false });
    const cut = commandBound(createReadDeadline(1_000), 15_000);
    expect(cut.byDeadline).toBe(true);
    expect(cut.timeoutMs).toBeGreaterThan(900);
    expect(commandBound(createReadDeadline(0), 15_000)).toEqual({ timeoutMs: 0, byDeadline: true });
  });

  it("recognises the step's time-out directly or as a helper error's cause, and nothing else", () => {
    expect(isDeadlineExceeded(new DeadlineExceededError())).toBe(true);
    expect(isDeadlineExceeded(new Error("AGY_MODEL_DISCOVERY_TIMEOUT", deadlineCause({ timeoutMs: 5, byDeadline: true })))).toBe(true);
    expect(isDeadlineExceeded(new Error("outer", { cause: new Error("inner", { cause: new DeadlineExceededError() }) }))).toBe(true);
    expect(deadlineCause({ timeoutMs: 5, byDeadline: false })).toBeUndefined();
    expect(isDeadlineExceeded(new Error("Command timed out after 100ms."))).toBe(false);
    expect(isDeadlineExceeded(null)).toBe(false);
  });

  it("the command runner: an ordinary time-out is an ordinary failure; one set by the deadline is the step's time-out", async () => {
    const ordinary = await runRuntimeCommand(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], 150);
    expect(ordinary.error?.message).toBe("Command timed out after 150ms.");
    expect(isDeadlineExceeded(ordinary.error)).toBe(false);
    const byDeadline = await runRuntimeCommand(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], commandBound(createReadDeadline(150), 10_000));
    expect(byDeadline.error).toBeInstanceOf(DeadlineExceededError);
    const notStarted = await runRuntimeCommand(process.execPath, ["-e", "1"], commandBound(createReadDeadline(0), 10_000));
    expect(notStarted.error).toBeInstanceOf(DeadlineExceededError);
  });
});
