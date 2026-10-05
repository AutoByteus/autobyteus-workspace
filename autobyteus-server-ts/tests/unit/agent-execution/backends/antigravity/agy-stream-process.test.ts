import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeChild extends EventEmitter {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly written: string[] = [];
  readonly stdin = {
    writable: true,
    write: (line: string, callback: (error?: Error | null) => void) => { this.written.push(line); callback(null); return true; },
  };
  readonly kill = vi.fn((signal: NodeJS.Signals) => { this.signalCode = signal; queueMicrotask(() => this.emit("close", null, signal)); return true; });
  readonly pid = 4242;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  /** Deliver stdout synchronously so fake timers do not need to drive stream I/O. */
  emitLine(message: unknown): void { this.stdout.emit("data", `${JSON.stringify(message)}\n`); }
}

const children = vi.hoisted(() => [] as unknown[]);
vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => { const child = new FakeChild(); children.push(child); return child; }),
}));
const groups = vi.hoisted(() => ({ list: vi.fn((): number[] => []), signal: vi.fn(), inactive: vi.fn(() => true) }));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-background-process-groups.js", () => ({
  listAgyBackgroundProcessGroups: groups.list,
  signalProcessGroups: groups.signal,
  processGroupsInactive: groups.inactive,
}));

import { spawn } from "node:child_process";
import { AgyStreamProcess } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-process.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";

const conversationId = "conversation-a";
const startInput = { capsulePath: "/tmp/capsule", agentName: "agent", workspacePath: "/tmp/workspace",
  model: "gemini-3.8-flash-low", conversationId };

const startProcess = async () => {
  const process = new AgyStreamProcess();
  const started = process.start(startInput);
  const child = children.at(-1) as FakeChild;
  child.emitLine({ event: "init", conversation_id: conversationId, init: {} });
  await started;
  const messages: AgyStreamMessage[] = [];
  const closes: Error[] = [];
  process.subscribe((message) => messages.push(message));
  process.onClose((error) => closes.push(error));
  return { process, child, messages, closes };
};

describe("AgyStreamProcess turn liveness", () => {
  beforeEach(() => { children.length = 0; groups.list.mockReset().mockReturnValue([]); groups.signal.mockReset(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("keeps a silent turn alive past five minutes and completes it on the later result", async () => {
    const run = await startProcess();
    await run.process.sendUserMessage("start pnpm dev and keep working");
    expect(run.child.written).toHaveLength(1);
    run.child.emitLine({ event: "step_update", step_update: { conversation_id: conversationId,
      step_index: 2, step_type: "tool", state: "ACTIVE", tool_name: "run_command" } });

    await vi.advanceTimersByTimeAsync(30 * 60_000);

    expect(run.child.kill).not.toHaveBeenCalled();
    expect(run.closes).toEqual([]);
    run.child.emitLine({ event: "result", result: { conversation_id: conversationId, status: "SUCCESS" } });
    expect(run.messages.map((message) => message.event)).toEqual(["step_update", "result"]);
    await run.process.sendUserMessage("next turn");
    expect(run.child.written).toHaveLength(2);
    expect(run.child.kill).not.toHaveBeenCalled();
  });

  it("still fails and stops the process when AGY exits mid-turn", async () => {
    const run = await startProcess();
    await run.process.sendUserMessage("work");
    run.child.emit("close", 1, null);
    expect(run.closes).toHaveLength(1);
    expect(run.closes[0]?.message).toContain("AGY process exited (1)");
    expect(run.child.kill).not.toHaveBeenCalled();
  });

  it("keeps the startup readiness timeout", async () => {
    const process = new AgyStreamProcess();
    const started = process.start(startInput);
    const rejection = expect(started).rejects.toThrow("AGY_STARTUP_TIMEOUT");
    await vi.advanceTimersByTimeAsync(60_000);
    await rejection;
    expect((children.at(-1) as FakeChild).kill).toHaveBeenCalledWith("SIGTERM");
  });
});

describe("AgyStreamProcess stop cleans up AGY background process groups", () => {
  beforeEach(() => { children.length = 0; groups.list.mockReset().mockReturnValue([]); groups.signal.mockReset(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("SIGTERMs AGY's background groups before AGY, then SIGKILLs the same groups after a short delay", async () => {
    const run = await startProcess();
    groups.list.mockReturnValue([300, 400]);
    groups.inactive.mockImplementation(groups => groups.length === 0);

    run.process.stop();

    expect(groups.list).toHaveBeenCalledWith(4242);
    expect(groups.signal).toHaveBeenCalledWith([300, 400], "SIGTERM");
    expect(run.child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(groups.signal.mock.invocationCallOrder[0]).toBeLessThan(run.child.kill.mock.invocationCallOrder[0]!);
    expect(groups.signal).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(groups.signal).toHaveBeenLastCalledWith([300, 400], "SIGKILL");
    groups.inactive.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(100);
    await run.process.stop();
    expect(groups.list).toHaveBeenCalledTimes(1);
    groups.inactive.mockReturnValue(true);
  });

  it("does not look for groups when AGY already exited on its own, but still reports the failure", async () => {
    const run = await startProcess();
    run.child.exitCode = 1;
    run.child.emit("close", 1, null);

    expect(run.closes).toHaveLength(1);
    expect(groups.list).not.toHaveBeenCalled();
    expect(groups.signal).not.toHaveBeenCalled();
  });

  it("cleans up groups when AutoByteus stops a live AGY after a stream protocol failure", async () => {
    const run = await startProcess();
    groups.list.mockReturnValue([300]);
    run.child.stdout.emit("data", "not json\n");

    expect(run.closes).toHaveLength(1);
    expect(groups.signal).toHaveBeenCalledWith([300], "SIGTERM");
    expect(run.child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("still stops its exact child independently when group discovery fails; keeps failed ownership proof", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const run = await startProcess();
      groups.list.mockImplementation(() => { throw new Error("ps timed out"); });

      const failed = expect(run.process.stop()).rejects.toThrow("background ownership discovery remains unconfirmed");
      expect(run.child.kill).toHaveBeenCalledWith("SIGTERM");
      await vi.advanceTimersByTimeAsync(100); await failed;
      await expect(run.process.stop()).rejects.toThrow("background ownership discovery remains unconfirmed");
      expect(groups.signal).not.toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });
});

describe("AgyStreamProcess launch arguments", () => {
  beforeEach(() => { children.length = 0; vi.mocked(spawn).mockClear(); });

  it.each([["new", null], ["resumed", conversationId]] as const)(
    "always passes --dangerously-skip-permissions for a %s conversation", async (_kind, id) => {
      const process = new AgyStreamProcess();
      const started = process.start({ ...startInput, conversationId: id });
      (children.at(-1) as FakeChild).emitLine({ event: "init", conversation_id: conversationId, init: {} });
      await started;
      const argv = vi.mocked(spawn).mock.calls.at(-1)?.[1] as string[];
      expect(argv).toContain("--dangerously-skip-permissions");
      expect(argv).toContain(id ? "--conversation" : "--new-project");
      process.stop();
    });
});
