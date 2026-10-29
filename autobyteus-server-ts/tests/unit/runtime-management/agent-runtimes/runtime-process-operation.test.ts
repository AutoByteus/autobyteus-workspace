import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { RuntimeProcessOperation, stripAnsi } from "../../../../src/runtime-management/agent-runtimes/runtime-process-operation.js";

/** A real child process (`node -e`) stands in for a vendor updater or login. */
const node = (script: string) => [process.execPath, "-e", script];

describe("RuntimeProcessOperation", () => {
  it("collects the output without ANSI codes and tracks the latest line, including `\\r` progress", async () => {
    const operation = new RuntimeProcessOperation(node(
      "process.stdout.write('\\u001b[32mChecking for updates\\u001b[0m\\n'); process.stdout.write('Downloading 10%\\rDownloading 90%'); process.stderr.write('\\n');",
    ));
    const result = await operation.finished;
    expect(result).toEqual({
      exitCode: 0, cancelled: false, timedOut: false,
      output: "Checking for updates\nDownloading 10%\rDownloading 90%",
    });
    expect(operation.latestLine()).toBe("Downloading 90%");
  });

  it("keeps only the last 4 KB of output", async () => {
    const operation = new RuntimeProcessOperation(node("process.stdout.write('a'.repeat(5000) + 'END'); process.exitCode = 4;"));
    const result = await operation.finished;
    expect(result.exitCode).toBe(4);
    expect(result.output.length).toBe(4096);
    expect(result.output.endsWith("END")).toBe(true);
  });

  it("ends a running process on cancel, with SIGKILL when it ignores SIGTERM", async () => {
    const operation = new RuntimeProcessOperation(node(
      "process.on('SIGTERM', () => {}); console.log('waiting'); setInterval(() => {}, 1000);",
    ));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const started = Date.now();
    operation.cancel();
    const result = await operation.finished;
    expect(result).toMatchObject({ cancelled: true, timedOut: false, exitCode: null });
    expect(Date.now() - started).toBeGreaterThanOrEqual(2_500);
  }, 10_000);

  it("ends a process that waits forever at its time-out", async () => {
    const operation = new RuntimeProcessOperation(node("setInterval(() => {}, 1000);"), { timeoutMs: 200 });
    await expect(operation.finished).resolves.toMatchObject({ timedOut: true, cancelled: false });
  });

  it("reports a missing command as a failed exit", async () => {
    const operation = new RuntimeProcessOperation([path.join(tmpdir(), "no-such-runtime-cli"), "update"]);
    const result = await operation.finished;
    expect(result.exitCode).toBeNull();
    expect(result.output).toContain("ENOENT");
  });

  it("strips colour and control codes but keeps line breaks", () => {
    expect(stripAnsi("\u001b[1;31mError\u001b[0m:\tbad\r\nnext\u0007")).toBe("Error:\tbad\r\nnext");
  });
});
