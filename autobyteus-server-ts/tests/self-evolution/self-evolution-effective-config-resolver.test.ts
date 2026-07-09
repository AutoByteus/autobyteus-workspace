import { describe, expect, it } from "vitest";
import { SelfEvolutionEffectiveConfigResolver } from "../../src/self-evolution/services/self-evolution-effective-config-resolver.js";

const resolver = new SelfEvolutionEffectiveConfigResolver({
  settingsService: {
    getDefaultTriggerStrategy: () => "manual_only",
    getDefaultEvolverStrategy: () => "single_agent",
    getDefaultEvolverAgentDefinitionId: () => "retrospective-skill-improver",
  } as any,
});

describe("SelfEvolutionEffectiveConfigResolver", () => {
  it("resolves manual self-evolution settings from current global capability/settings", () => {
    const effective = resolver.resolveCurrentManualSelfEvolutionSettings({
      enabled: true,
      resolvedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(effective).toMatchObject({
      enabled: true,
      triggerStrategy: "manual_only",
      evolverStrategy: "single_agent",
      evolverAgentDefinitionId: "retrospective-skill-improver",
      resolvedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(effective.sourceTrace).toEqual([
      {
        source: "default",
        fields: ["enabled", "triggerStrategy", "evolverStrategy", "evolverAgentDefinitionId"],
      },
    ]);
  });
});
