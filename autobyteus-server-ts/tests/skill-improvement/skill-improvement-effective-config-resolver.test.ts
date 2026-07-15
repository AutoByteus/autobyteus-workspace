import { describe, expect, it } from "vitest";
import { SkillImprovementEffectiveConfigResolver } from "../../src/skill-improvement/services/skill-improvement-effective-config-resolver.js";

const resolver = new SkillImprovementEffectiveConfigResolver({
  settingsService: {
    getDefaultTriggerStrategy: () => "manual_only",
    getDefaultImproverStrategy: () => "single_agent",
    getDefaultImproverAgentDefinitionId: () => "retrospective-skill-improver",
  } as any,
});

describe("SkillImprovementEffectiveConfigResolver", () => {
  it("resolves manual Skill Improvement settings from current global capability/settings", () => {
    const effective = resolver.resolveCurrentManualSkillImprovementSettings({
      enabled: true,
      resolvedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(effective).toMatchObject({
      enabled: true,
      triggerStrategy: "manual_only",
      improverStrategy: "single_agent",
      improverAgentDefinitionId: "retrospective-skill-improver",
      resolvedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(effective.sourceTrace).toEqual([
      {
        source: "default",
        fields: ["enabled", "triggerStrategy", "improverStrategy", "improverAgentDefinitionId"],
      },
    ]);
  });
});
