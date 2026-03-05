import { describe, expect, it, vi } from "vitest";
import { RunProjectionProviderRegistry } from "../../../../src/run-history/projection/run-projection-provider-registry.js";
import type { RunProjectionProvider } from "../../../../src/run-history/projection/run-projection-provider-port.js";

const createProvider = (
  providerId: string,
  runtimeKind?: "autobyteus" | "codex_app_server" | "claude_agent_sdk",
): RunProjectionProvider => ({
  providerId,
  runtimeKind,
  buildProjection: vi.fn(async () => null),
});

describe("RunProjectionProviderRegistry", () => {
  it("resolves codex provider when runtime kind is codex_app_server", () => {
    const fallback = createProvider("fallback-local", "autobyteus");
    const codex = createProvider("codex-provider", "codex_app_server");
    const registry = new RunProjectionProviderRegistry(fallback, [codex]);

    const resolved = registry.resolveProvider("codex_app_server");
    expect(resolved.providerId).toBe("codex-provider");
  });

  it("falls back to local provider for unknown runtime kinds", () => {
    const fallback = createProvider("fallback-local", "autobyteus");
    const registry = new RunProjectionProviderRegistry(fallback, []);

    const resolved = registry.resolveProvider("unknown_runtime_kind");
    expect(resolved.providerId).toBe("fallback-local");
    expect(registry.resolveFallbackProvider().providerId).toBe("fallback-local");
  });
});
