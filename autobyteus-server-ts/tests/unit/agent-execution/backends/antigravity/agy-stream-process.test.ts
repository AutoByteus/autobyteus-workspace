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
  readonly kill = vi.fn(() => true);
  /** Deliver stdout synchronously so fake timers do not need to drive stream I/O. */
  emitLine(message: unknown): void { this.stdout.emit("data", `${JSON.stringify(message)}\n`); }
}

const children = vi.hoisted(() => [] as unknown[]);
vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => { const child = new FakeChild(); children.push(child); return child; }),
}));

import { AgyStreamProcess } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-process.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";

const conversationId = "conversation-a";
const startInput = { capsulePath: "/tmp/capsule", agentName: "agent", workspacePath: "/tmp/workspace",
  model: "gemini-3.8-flash-low", autoExecuteTools: true, conversationId };

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
  beforeEach(() => { children.length = 0; vi.useFakeTimers(); });
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
    expect(run.child.kill).toHaveBeenCalledWith("SIGTERM");
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
