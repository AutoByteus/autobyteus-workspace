import { describe, expect, it } from "vitest";
import { RuntimeAdapterRegistry } from "../../../src/runtime-execution/runtime-adapter-registry.js";
import type { RuntimeAdapter } from "../../../src/runtime-execution/runtime-adapter-port.js";

const buildAdapter = (runtimeKind: "autobyteus" | "codex_app_server"): RuntimeAdapter => ({
  runtimeKind,
  sendTurn: async () => ({ accepted: true }),
  approveTool: async () => ({ accepted: true }),
  interruptRun: async () => ({ accepted: false, code: "UNSUPPORTED" }),
});

describe("RuntimeAdapterRegistry", () => {
  it("resolves registered adapters by runtime kind", () => {
    const autobyteus = buildAdapter("autobyteus");
    const codex = buildAdapter("codex_app_server");
    const registry = new RuntimeAdapterRegistry([autobyteus, codex]);

    expect(registry.resolveAdapter("autobyteus")).toBe(autobyteus);
    expect(registry.resolveAdapter("codex_app_server")).toBe(codex);
  });

  it("throws when runtime adapter is missing", () => {
    const registry = new RuntimeAdapterRegistry([buildAdapter("autobyteus")]);
    expect(() => registry.resolveAdapter("codex_app_server")).toThrow(
      "Runtime adapter not found",
    );
  });
});
