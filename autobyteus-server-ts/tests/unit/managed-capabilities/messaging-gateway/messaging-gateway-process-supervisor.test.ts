import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";
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

describe("MessagingGatewayProcessSupervisor.onExit", () => {
  it("marks supervisor-triggered shutdowns as expected exits", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "managed-gateway-supervisor-"),
    );
    const installDir = tempDir;
    const distDir = path.join(installDir, "dist");
    await fsp.mkdir(distDir, { recursive: true });
    await fsp.writeFile(
      path.join(distDir, "index.js"),
      `
const http = require("node:http");
const host = process.env.GATEWAY_HOST ?? "127.0.0.1";
const port = Number(process.env.GATEWAY_PORT ?? 0);
const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.statusCode = 200;
    response.end("ok");
    return;
  }
  response.statusCode = 404;
  response.end("not found");
});
server.listen(port, host);
const shutdown = () => server.close(() => process.exit(0));
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
`,
      "utf8",
    );

    const supervisor = new MessagingGatewayProcessSupervisor();
    const exitEventPromise = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
      expected: boolean;
    }>((resolve) => {
      supervisor.onExit(resolve);
    });

    try {
      await supervisor.start({
        installDir,
        version: "0.1.0",
        bindHost: "127.0.0.1",
        bindPort: 0,
        env: {},
        stdoutLogPath: path.join(tempDir, "stdout.log"),
        stderrLogPath: path.join(tempDir, "stderr.log"),
      });

      await supervisor.stop();
      const exitEvent = await exitEventPromise;
      expect(exitEvent.expected).toBe(true);
      expect(exitEvent.code).toBe(0);
    } finally {
      await supervisor.stop();
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });
});
