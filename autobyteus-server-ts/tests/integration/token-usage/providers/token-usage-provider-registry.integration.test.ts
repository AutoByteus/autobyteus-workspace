import { describe, expect, it } from "vitest";
import { TokenUsageProviderRegistry } from "../../../../src/token-usage/providers/persistence-provider-registry.js";
import type { PersistenceProvider } from "../../../../src/token-usage/providers/persistence-provider.js";

class DummyTokenUsageProvider implements PersistenceProvider {
  async createTokenUsageRecord(): Promise<any> {
    return {};
  }

  async getTotalCostInPeriod(): Promise<any> {
    return 0;
  }

  async getUsageRecordsInPeriod(): Promise<any> {
    return [];
  }
}

describe("TokenUsageProviderRegistry", () => {
  it("includes default providers", () => {
    const registry = TokenUsageProviderRegistry.getInstance();
    const available = registry.getAvailableProviders();
    expect(available).toContain("postgresql");
    expect(available).toContain("sqlite");
  });

  it("registers new providers", async () => {
    const registry = TokenUsageProviderRegistry.getInstance();
    registry.registerProvider("dummy", DummyTokenUsageProvider as any);
    const available = registry.getAvailableProviders();
    expect(available).toContain("dummy");

    const loader = registry.getProviderLoader("dummy");
    expect(loader).toBeDefined();
    const provider = await loader!();
    expect(provider).toBeInstanceOf(DummyTokenUsageProvider);
  });

  it("gets provider classes", () => {
    const registry = TokenUsageProviderRegistry.getInstance();

    const postgresClass = registry.getProviderClass("postgresql");
    const sqliteClass = registry.getProviderClass("sqlite");

    expect(postgresClass).toBeDefined();
    expect(sqliteClass).toBeDefined();
    expect(typeof new postgresClass!().createTokenUsageRecord).toBe("function");
    expect(typeof new sqliteClass!().createTokenUsageRecord).toBe("function");
    expect(registry.getProviderClass("nonexistent")).toBeUndefined();
  });
});
