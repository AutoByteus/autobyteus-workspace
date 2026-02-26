import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenUsage } from "autobyteus-ts";
import { PersistenceProxy } from "../../../../src/token-usage/providers/persistence-proxy.js";
import { SqlPersistenceProvider } from "../../../../src/token-usage/providers/sql-persistence-provider.js";
import { TokenUsageProviderRegistry } from "../../../../src/token-usage/providers/persistence-provider-registry.js";

describe("TokenUsage PersistenceProxy", () => {
  const originalProvider = process.env.PERSISTENCE_PROVIDER;

  beforeEach(() => {
    process.env.PERSISTENCE_PROVIDER = "sqlite";
  });

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.PERSISTENCE_PROVIDER;
    } else {
      process.env.PERSISTENCE_PROVIDER = originalProvider;
    }
  });

  it("uses SqlPersistenceProvider by default", async () => {
    const proxy = new PersistenceProxy();
    const provider = await (proxy as any).getProvider();
    expect(provider).toBeInstanceOf(SqlPersistenceProvider);
  });

  it("throws for unsupported provider", async () => {
    process.env.PERSISTENCE_PROVIDER = "unsupported";
    const proxy = new PersistenceProxy();
    await expect(proxy.getTotalCostInPeriod(new Date(), new Date())).rejects.toThrow(
      /PERSISTENCE_PROVIDER must be one of/i,
    );
  });

  it("throws when provider initialization fails", async () => {
    const registry = TokenUsageProviderRegistry.getInstance();
    const originalLoader = registry.getProviderLoader("sqlite");
    registry.registerProviderLoader("sqlite", async () => {
      throw new Error("Initialization Failed");
    });

    try {
      const proxy = new PersistenceProxy();
      await expect(
        proxy.createTokenUsageRecord("agent", "user", 1, 0.01, "test_model"),
      ).rejects.toThrow(/Initialization Failed/);
    } finally {
      if (originalLoader) {
        registry.registerProviderLoader("sqlite", originalLoader);
      }
    }
  });

  it("delegates createTokenUsageRecord", async () => {
    const provider = {
      createTokenUsageRecord: vi.fn().mockResolvedValue({}),
      getTotalCostInPeriod: vi.fn().mockResolvedValue(0),
      getUsageRecordsInPeriod: vi.fn().mockResolvedValue([]),
    };

    const registry = TokenUsageProviderRegistry.getInstance();
    const originalLoader = registry.getProviderLoader("sqlite");
    registry.registerProviderLoader("sqlite", async () => provider as any);

    try {
      const proxy = new PersistenceProxy();
      const result = await proxy.createTokenUsageRecord("agent", "user", 10, 0.05, "test_model");

      expect(provider.createTokenUsageRecord).toHaveBeenCalledWith(
        "agent",
        "user",
        10,
        0.05,
        "test_model",
      );
      expect(result).toEqual({});
    } finally {
      if (originalLoader) {
        registry.registerProviderLoader("sqlite", originalLoader);
      }
    }
  });

  it("delegates createConversationTokenUsageRecords", async () => {
    const provider = {
      createTokenUsageRecord: vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({}),
      getTotalCostInPeriod: vi.fn().mockResolvedValue(0),
      getUsageRecordsInPeriod: vi.fn().mockResolvedValue([]),
    };

    const registry = TokenUsageProviderRegistry.getInstance();
    const originalLoader = registry.getProviderLoader("sqlite");
    registry.registerProviderLoader("sqlite", async () => provider as any);

    try {
      const proxy = new PersistenceProxy();

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

      expect(provider.createTokenUsageRecord).toHaveBeenCalledTimes(2);
      expect(provider.createTokenUsageRecord).toHaveBeenCalledWith(
        "agent",
        "user",
        10,
        0.1,
        "model",
      );
      expect(provider.createTokenUsageRecord).toHaveBeenCalledWith(
        "agent",
        "assistant",
        20,
        0.2,
        "model",
      );
      expect(promptRecord).toEqual({});
      expect(completionRecord).toEqual({});
    } finally {
      if (originalLoader) {
        registry.registerProviderLoader("sqlite", originalLoader);
      }
    }
  });

  it("delegates getUsageRecordsInPeriod", async () => {
    const mockRecords = [{ llmModel: "some_model" }];
    const provider = {
      createTokenUsageRecord: vi.fn().mockResolvedValue({}),
      getTotalCostInPeriod: vi.fn().mockResolvedValue(0),
      getUsageRecordsInPeriod: vi.fn().mockResolvedValue(mockRecords),
    };

    const registry = TokenUsageProviderRegistry.getInstance();
    const originalLoader = registry.getProviderLoader("sqlite");
    registry.registerProviderLoader("sqlite", async () => provider as any);

    try {
      const proxy = new PersistenceProxy();
      const start = new Date(Date.now() - 60 * 60 * 1000);
      const end = new Date();
      const result = await proxy.getUsageRecordsInPeriod(start, end, "some_model");

      expect(provider.getUsageRecordsInPeriod).toHaveBeenCalledWith(start, end, "some_model");
      expect(result).toHaveLength(1);
      expect(result[0]?.llmModel).toBe("some_model");
    } finally {
      if (originalLoader) {
        registry.registerProviderLoader("sqlite", originalLoader);
      }
    }
  });

  it("delegates getTotalCostInPeriod", async () => {
    const provider = {
      createTokenUsageRecord: vi.fn().mockResolvedValue({}),
      getTotalCostInPeriod: vi.fn().mockResolvedValue(1.234),
      getUsageRecordsInPeriod: vi.fn().mockResolvedValue([]),
    };

    const registry = TokenUsageProviderRegistry.getInstance();
    const originalLoader = registry.getProviderLoader("sqlite");
    registry.registerProviderLoader("sqlite", async () => provider as any);

    try {
      const proxy = new PersistenceProxy();
      const start = new Date(Date.now() - 60 * 60 * 1000);
      const end = new Date();
      const result = await proxy.getTotalCostInPeriod(start, end);

      expect(provider.getTotalCostInPeriod).toHaveBeenCalledWith(start, end);
      expect(result).toBe(1.234);
    } finally {
      if (originalLoader) {
        registry.registerProviderLoader("sqlite", originalLoader);
      }
    }
  });
});
