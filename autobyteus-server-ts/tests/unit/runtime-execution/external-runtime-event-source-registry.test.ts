import { describe, expect, it, vi } from "vitest";
import type { ExternalRuntimeEventSource } from "../../../src/runtime-execution/external-runtime-event-source-port.js";
import { ExternalRuntimeEventSourceRegistry } from "../../../src/runtime-execution/external-runtime-event-source-registry.js";

const buildSource = (
  runtimeKind: "codex_app_server" | "claude_agent_sdk",
): ExternalRuntimeEventSource => ({
  runtimeKind,
  subscribeToRunEvents: vi.fn().mockReturnValue(() => {}),
  hasRunSession: vi.fn().mockReturnValue(false),
});

describe("ExternalRuntimeEventSourceRegistry", () => {
  it("resolves codex and claude event sources by runtime kind", () => {
    const codex = buildSource("codex_app_server");
    const claude = buildSource("claude_agent_sdk");
    const registry = new ExternalRuntimeEventSourceRegistry([codex, claude]);

    expect(registry.resolveSource("codex_app_server")).toBe(codex);
    expect(registry.resolveSource("claude_agent_sdk")).toBe(claude);
  });

  it("treats autobyteus as non-external runtime", () => {
    const registry = new ExternalRuntimeEventSourceRegistry([buildSource("claude_agent_sdk")]);

    expect(registry.tryResolveSource("autobyteus")).toBeNull();
    expect(() => registry.resolveSource("autobyteus")).toThrow(
      "Runtime 'autobyteus' does not provide external runtime events.",
    );
    expect(registry.hasActiveRunSession("autobyteus", "run-1")).toBe(true);
  });

  it("returns false when no external source can be resolved", () => {
    const registry = new ExternalRuntimeEventSourceRegistry([buildSource("claude_agent_sdk")]);
    expect(registry.hasActiveRunSession("codex_app_server", "run-1")).toBe(false);
  });
});
