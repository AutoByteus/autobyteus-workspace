import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { recordAgyProviderDiagnostic } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-provider-diagnostic-sink.js";

describe("private AGY provider diagnostics", () => {
  it("bounds records and restricts directory and file permissions", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-private-diagnostic-"));
    try {
      await recordAgyProviderDiagnostic(base, { kind: "tool", runId: "run", turnId: "turn", invocationId: "invocation",
        providerState: "ERROR", providerError: "token=private".repeat(10_000), providerOutput: "/private/path" });
      const directory = path.join(base, "agy-provider-diagnostics");
      const file = path.join(directory, "provider-failures.jsonl");
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
      await expect(recordAgyProviderDiagnostic(base, { kind: "tool", runId: "run", turnId: "turn", invocationId: "invocation",
        providerState: "ERROR", providerError: null, providerOutput: null })).rejects.toThrow("AGY_DIAGNOSTIC_DIRECTORY_UNSAFE");
    } finally { await fs.rm(base, { recursive: true, force: true }); }
  });

  it("stores a bounded turn failure without a tool invocation", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-private-diagnostic-"));
    try {
      await recordAgyProviderDiagnostic(base, { kind: "turn", runId: "run", turnId: "turn",
        safeReasonCode: "TERMINAL_STATUS_NOT_SUCCESS", providerStatus: "ERROR",
        providerError: "token=private-error", providerResponse: "token=private-response" });
      const data = await fs.readFile(path.join(base, "agy-provider-diagnostics", "provider-failures.jsonl"), "utf8");
      expect(data).toContain("TERMINAL_STATUS_NOT_SUCCESS");
      expect(data).toContain("token=private-error");
      expect(data).toContain("token=private-response");
    } finally { await fs.rm(base, { recursive: true, force: true }); }
  });
});
