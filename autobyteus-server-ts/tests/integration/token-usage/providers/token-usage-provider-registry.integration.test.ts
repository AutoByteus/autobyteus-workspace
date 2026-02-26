import { describe, expect, it } from "vitest";
import { TokenUsageProviderRegistry } from "../../../../src/token-usage/providers/persistence-provider-registry.js";
import { SqlPersistenceProvider } from "../../../../src/token-usage/providers/sql-persistence-provider.js";

class DummyTokenUsageProvider {}

describe("TokenUsageProviderRegistry", () => {
  it("includes default providers", () => {
    const registry = TokenUsageProviderRegistry.getInstance();
    const available = registry.getAvailableProviders();
    expect(available).toContain("postgresql");
    expect(available).toContain("sqlite");
  });

  it("registers new providers", () => {
    const registry = TokenUsageProviderRegistry.getInstance();
    registry.registerProvider("dummy", DummyTokenUsageProvider as any);
    const available = registry.getAvailableProviders();
    expect(available).toContain("dummy");
    expect(registry.getProviderClass("dummy")).toBe(DummyTokenUsageProvider);
  });

  it("gets provider classes", () => {
    const registry = TokenUsageProviderRegistry.getInstance();
    expect(registry.getProviderClass("postgresql")).toBe(SqlPersistenceProvider);
    expect(registry.getProviderClass("sqlite")).toBe(SqlPersistenceProvider);
    expect(registry.getProviderClass("nonexistent")).toBeUndefined();
  });
});
