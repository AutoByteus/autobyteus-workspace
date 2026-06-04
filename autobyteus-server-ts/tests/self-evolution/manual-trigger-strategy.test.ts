import { describe, expect, it } from "vitest";
import { ManualTriggerStrategy } from "../../src/self-evolution/services/triggers/manual-trigger-strategy.js";
import { SelfEvolutionStrategyCatalogService } from "../../src/self-evolution/services/strategies/self-evolution-strategy-catalog.js";
import type { SelfEvolutionEffectiveConfig } from "../../src/self-evolution/domain/models.js";

const baseSnapshot = (
  overrides: Partial<SelfEvolutionEffectiveConfig> = {},
): SelfEvolutionEffectiveConfig => ({
  enabled: true,
  triggerStrategy: "manual_only",
  evolverStrategy: "single_agent",
  evolverAgentDefinitionId: null,
  resolvedAt: "2026-01-01T00:00:00.000Z",
  sourceTrace: [],
  ...overrides,
});

describe("ManualTriggerStrategy", () => {
  it("creates a canonical manual self-evolution request from a run snapshot", () => {
    const strategy = new ManualTriggerStrategy();
    const request = strategy.createRequest(
      {
        target: { kind: "agent_run", runId: "run-1" },
        requestedByUserId: "user-1",
        requestedFrom: "run_detail",
      },
      baseSnapshot(),
    );

    expect(request.evolutionRunId).toEqual(expect.any(String));
    expect(request.triggerStrategy).toBe("manual_only");
    expect(request.target).toEqual({ kind: "agent_run", runId: "run-1" });
    expect(request.effectiveConfig.triggerStrategy).toBe("manual_only");
    expect(request.requestedByUserId).toBe("user-1");
  });

  it("keeps scheduled and signal trigger descriptors non-executable in the MVP", () => {
    const catalog = new SelfEvolutionStrategyCatalogService();
    expect(catalog.isImplementedTrigger("manual_only")).toBe(true);
    expect(catalog.isImplementedTrigger("scheduled")).toBe(false);
    expect(catalog.isImplementedTrigger("signal_based")).toBe(false);
    expect(catalog.isImplementedEvolver("single_agent")).toBe(true);
    expect(catalog.isImplementedEvolver("agent_team")).toBe(false);

    expect(() => new ManualTriggerStrategy().createRequest(
      {
        target: { kind: "agent_run", runId: "run-1" },
        requestedFrom: "api",
      },
      baseSnapshot({ triggerStrategy: "scheduled" }),
    )).toThrow("not implemented");
  });
});
