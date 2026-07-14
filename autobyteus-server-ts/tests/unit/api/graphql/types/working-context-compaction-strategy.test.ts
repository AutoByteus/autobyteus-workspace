import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkingContextCompactionStrategyRegistry } from "autobyteus-ts/memory/compaction/default-working-context-compaction-strategy-registry.js";

const mockServerSettingsService = vi.hoisted(() => ({
  getEffectiveWorkingContextCompactionStrategyId: vi.fn(),
}));

vi.mock("../../../../../src/services/server-settings-service.js", () => ({
  getServerSettingsService: () => mockServerSettingsService,
}));

import { WorkingContextCompactionStrategyResolver } from "../../../../../src/api/graphql/types/working-context-compaction-strategy.js";

describe("WorkingContextCompactionStrategyResolver", () => {
  beforeEach(() => {
    mockServerSettingsService.getEffectiveWorkingContextCompactionStrategyId.mockReset();
  });

  it("projects the production registry as tight id/name catalog entries", () => {
    const resolver = new WorkingContextCompactionStrategyResolver();

    expect(resolver.getWorkingContextCompactionStrategies()).toEqual([
      { id: "structured-json", name: "Structured JSON" },
    ]);
  });

  it("projects a test-only registration without a catalog-specific branch", () => {
    defaultWorkingContextCompactionStrategyRegistry.register({
      id: "test-second",
      name: "Test Second",
      create: () => ({
        id: "test-second",
        name: "Test Second",
        compact: async (workingContext) => workingContext.copy(),
      }),
    });
    const resolver = new WorkingContextCompactionStrategyResolver();

    expect(resolver.getWorkingContextCompactionStrategies()).toEqual([
      { id: "structured-json", name: "Structured JSON" },
      { id: "test-second", name: "Test Second" },
    ]);
  });

  it("delegates effective selection to ServerSettingsService", () => {
    mockServerSettingsService.getEffectiveWorkingContextCompactionStrategyId
      .mockReturnValue("removed-strategy");
    const resolver = new WorkingContextCompactionStrategyResolver();

    expect(resolver.getEffectiveWorkingContextCompactionStrategyId()).toBe("removed-strategy");
    expect(
      mockServerSettingsService.getEffectiveWorkingContextCompactionStrategyId,
    ).toHaveBeenCalledOnce();
  });
});
