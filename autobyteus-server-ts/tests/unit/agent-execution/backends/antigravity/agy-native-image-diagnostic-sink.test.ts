import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { recordAgyNativeImageDiagnostic } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-native-image-diagnostic-sink.js";

describe("private AGY native image diagnostics", () => {
  it("bounds records and restricts directory and file permissions", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-private-diagnostic-"));
    try {
      await recordAgyNativeImageDiagnostic(base, { runId: "run", turnId: "turn", invocationId: "invocation",
        providerState: "ERROR", providerError: "token=private".repeat(10_000), providerOutput: "/private/path" });
      const directory = path.join(base, "agy-provider-diagnostics");
      const file = path.join(directory, "native-image-failures.jsonl");
      expect((await fs.stat(directory)).mode & 0o777).toBe(0o700);
      expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
      const data = await fs.readFile(file, "utf8");
      expect(Buffer.byteLength(data)).toBeLessThan(32 * 1024);
      expect(data).toContain("invocation");
    } finally { await fs.rm(base, { recursive: true, force: true }); }
  });

  it("rejects a symlinked diagnostic directory", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-private-diagnostic-"));
    try {
      await fs.symlink(os.tmpdir(), path.join(base, "agy-provider-diagnostics"));
      await expect(recordAgyNativeImageDiagnostic(base, { runId: "run", turnId: "turn", invocationId: "invocation",
        providerState: "ERROR", providerError: null, providerOutput: null })).rejects.toThrow("AGY_DIAGNOSTIC_DIRECTORY_UNSAFE");
    } finally { await fs.rm(base, { recursive: true, force: true }); }
  });
});
