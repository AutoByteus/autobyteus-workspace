import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersistenceProxy } from "../../../../src/token-usage/providers/persistence-proxy.js";
import { SqlPersistenceProvider } from "../../../../src/token-usage/providers/sql-persistence-provider.js";
import { TokenUsageProviderRegistry } from "../../../../src/token-usage/providers/persistence-provider-registry.js";
import type { PersistenceProvider } from "../../../../src/token-usage/providers/persistence-provider.js";
import type { TokenUsage } from "autobyteus-ts";

describe("TokenUsage PersistenceProxy", () => {
  const originalProvider = process.env.PERSISTENCE_PROVIDER;

  beforeEach(() => {
    delete process.env.PERSISTENCE_PROVIDER;
  });

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.PERSISTENCE_PROVIDER;
    } else {
      process.env.PERSISTENCE_PROVIDER = originalProvider;
    }
  });

  it("uses SqlPersistenceProvider by default", () => {
    const proxy = new PersistenceProxy();
    const provider = (proxy as any).provider;
    expect(provider).toBeInstanceOf(SqlPersistenceProvider);
  });

  it("throws for unsupported provider", () => {
    process.env.PERSISTENCE_PROVIDER = "unsupported";
    const proxy = new PersistenceProxy();
    expect(() => (proxy as any).provider).toThrow(/Unsupported token usage provider/i);
  });

  it("throws when provider initialization fails", () => {
    class BadProvider implements PersistenceProvider {
      constructor() {
        throw new Error("Initialization Failed");
      }
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

    const registry = TokenUsageProviderRegistry.getInstance();
    registry.registerProvider("bad", BadProvider);
    process.env.PERSISTENCE_PROVIDER = "bad";

    const proxy = new PersistenceProxy();
    expect(() => (proxy as any).provider).toThrow(/Initialization Failed/);
  });

  it("delegates createTokenUsageRecord", async () => {
    const proxy = new PersistenceProxy();
    const provider = (proxy as any).provider as SqlPersistenceProvider;
    const spy = vi
      .spyOn(provider, "createTokenUsageRecord")
      .mockResolvedValue({} as any);

    const result = await proxy.createTokenUsageRecord(
      "agent",
      "user",
      10,
      0.05,
      "test_model",
    );

    expect(spy).toHaveBeenCalledWith("agent", "user", 10, 0.05, "test_model");
    expect(result).toEqual({});
  });

  it("delegates createConversationTokenUsageRecords", async () => {
    const proxy = new PersistenceProxy();
    const provider = (proxy as any).provider as SqlPersistenceProvider;
    const spy = vi
      .spyOn(provider, "createTokenUsageRecord")
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any);

    const tokenUsage: TokenUsage = {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
      prompt_cost: 0.1,
      completion_cost: 0.2,
      total_cost: 0.3,
    };

    const [promptRecord, completionRecord] = await proxy.createConversationTokenUsageRecords(
      "agent",
      tokenUsage,
      "model",
    );

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith("agent", "user", 10, 0.1, "model");
    expect(spy).toHaveBeenCalledWith("agent", "assistant", 20, 0.2, "model");
    expect(promptRecord).toEqual({});
    expect(completionRecord).toEqual({});
  });

  it("delegates getUsageRecordsInPeriod", async () => {
    const proxy = new PersistenceProxy();
    const provider = (proxy as any).provider as SqlPersistenceProvider;
    const mockRecords = [{ llmModel: "some_model" }];
    const spy = vi
      .spyOn(provider, "getUsageRecordsInPeriod")
      .mockResolvedValue(mockRecords as any);

    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date();
    const result = await proxy.getUsageRecordsInPeriod(start, end, "some_model");

    expect(spy).toHaveBeenCalledWith(start, end, "some_model");
    expect(result).toHaveLength(1);
    expect(result[0]?.llmModel).toBe("some_model");
  });

  it("delegates getTotalCostInPeriod", async () => {
    const proxy = new PersistenceProxy();
    const provider = (proxy as any).provider as SqlPersistenceProvider;
    const spy = vi
      .spyOn(provider, "getTotalCostInPeriod")
      .mockResolvedValue(1.234);

    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date();
    const result = await proxy.getTotalCostInPeriod(start, end);

    expect(spy).toHaveBeenCalledWith(start, end);
    expect(result).toBe(1.234);
  });
});
