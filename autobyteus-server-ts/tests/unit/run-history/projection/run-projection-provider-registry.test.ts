import { describe, expect, it, vi } from "vitest";
import type { RunProjectionProvider } from "../../../../src/run-history/projection/run-projection-types.js";

vi.mock(
  "../../../../src/run-history/projection/providers/autobyteus-run-view-projection-provider.js",
  () => ({
    getAutoByteusRunViewProjectionProvider: vi.fn(() => ({
      runtimeKind: "autobyteus",
      buildProjection: vi.fn(async () => null),
    })),
  }),
);

vi.mock(
  "../../../../src/run-history/projection/providers/codex-run-view-projection-provider.js",
  () => ({
    getCodexRunViewProjectionProvider: vi.fn(() => ({
      runtimeKind: "codex_app_server",
      buildProjection: vi.fn(async () => null),
    })),
  }),
);

vi.mock(
  "../../../../src/run-history/projection/providers/claude-run-view-projection-provider.js",
  () => ({
    getClaudeRunViewProjectionProvider: vi.fn(() => ({
      runtimeKind: "claude_agent_sdk",
      buildProjection: vi.fn(async () => null),
    })),
  }),
);

import { RunProjectionProviderRegistry } from "../../../../src/run-history/projection/run-projection-provider-registry.js";

const createProvider = (
  runtimeKind?: "autobyteus" | "codex_app_server" | "claude_agent_sdk",
): RunProjectionProvider => ({
  runtimeKind,
  buildProjection: vi.fn(async () => null),
});

describe("RunProjectionProviderRegistry", () => {
  it("resolves codex provider when runtime kind is codex_app_server", () => {
    const fallback = createProvider("autobyteus");
    const codex = createProvider("codex_app_server");
    const registry = new RunProjectionProviderRegistry(fallback, [codex]);

    const resolved = registry.resolveProvider("codex_app_server");
    expect(resolved).toBe(codex);
  });

  it("falls back to local provider for unknown runtime kinds", () => {
    const fallback = createProvider("autobyteus");
    const registry = new RunProjectionProviderRegistry(fallback, []);

    const resolved = registry.resolveProvider("unknown_runtime_kind");
    expect(resolved).toBe(fallback);
    expect(registry.resolveFallbackProvider()).toBe(fallback);
  });
});
