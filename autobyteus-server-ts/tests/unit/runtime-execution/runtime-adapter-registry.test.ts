import { describe, expect, it } from "vitest";
import { RuntimeAdapterRegistry } from "../../../src/runtime-execution/runtime-adapter-registry.js";
import type { RuntimeAdapter } from "../../../src/runtime-execution/runtime-adapter-port.js";

const buildAdapter = (
  runtimeKind: "autobyteus" | "codex_app_server" | "claude_agent_sdk",
): RuntimeAdapter => ({
  runtimeKind,
  sendTurn: async () => ({ accepted: true }),
  approveTool: async () => ({ accepted: true }),
  interruptRun: async () => ({ accepted: false, code: "UNSUPPORTED" }),
});

describe("RuntimeAdapterRegistry", () => {
  it("resolves registered adapters by runtime kind", () => {
    const autobyteus = buildAdapter("autobyteus");
    const codex = buildAdapter("codex_app_server");
    const claude = buildAdapter("claude_agent_sdk");
    const registry = new RuntimeAdapterRegistry([autobyteus, codex, claude]);

    expect(registry.resolveAdapter("autobyteus")).toBe(autobyteus);
    expect(registry.resolveAdapter("codex_app_server")).toBe(codex);
    expect(registry.resolveAdapter("claude_agent_sdk")).toBe(claude);
  });

  it("throws when runtime adapter is missing", () => {
    const registry = new RuntimeAdapterRegistry([buildAdapter("autobyteus")]);
    expect(() => registry.resolveAdapter("codex_app_server")).toThrow(
      "Runtime adapter not found",
    );
  });
});
