import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessagingGatewayProcessSupervisor } from "../../../../src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.js";

class FakeChildProcess extends EventEmitter {
  killed = false;
  killCalls: NodeJS.Signals[] = [];

  constructor(
    private readonly options: {
      closeOnSigterm?: boolean;
    } = {},
  ) {
    super();
  }

  kill(signal: NodeJS.Signals): boolean {
    this.killCalls.push(signal);
    this.killed = true;
    if (signal === "SIGTERM" && this.options.closeOnSigterm) {
      queueMicrotask(() => {
        this.emit("close", 0, null);
      });
    }
    if (signal === "SIGKILL") {
      queueMicrotask(() => {
        this.emit("close", null, "SIGKILL");
      });
    }
    return true;
  }
}

describe("MessagingGatewayProcessSupervisor.stop", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("escalates to SIGKILL when the child stays open after SIGTERM", async () => {
    vi.useFakeTimers();

    const supervisor = new MessagingGatewayProcessSupervisor();
    const child = new FakeChildProcess();
    (supervisor as unknown as { process: FakeChildProcess | null }).process = child;

    const stopPromise = supervisor.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    await stopPromise;

    expect(child.killCalls).toEqual(["SIGTERM", "SIGKILL"]);
  });

  it("does not send SIGKILL when SIGTERM closes the child cleanly", async () => {
    vi.useFakeTimers();

    const supervisor = new MessagingGatewayProcessSupervisor();
    const child = new FakeChildProcess({ closeOnSigterm: true });
    (supervisor as unknown as { process: FakeChildProcess | null }).process = child;

    const stopPromise = supervisor.stop();
    await vi.runAllTimersAsync();
    await stopPromise;

    expect(child.killCalls).toEqual(["SIGTERM"]);
  });
});
