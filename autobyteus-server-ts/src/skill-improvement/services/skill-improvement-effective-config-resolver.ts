import { buildDefaultSkillImprovementEffectiveConfig } from "../domain/config.js";
import type { SkillImprovementEffectiveConfig } from "../domain/models.js";
import { SkillImprovementSettingsService } from "./skill-improvement-settings-service.js";

export class SkillImprovementEffectiveConfigResolver {
  constructor(private readonly deps: { settingsService?: SkillImprovementSettingsService } = {}) {}

  resolveCurrentManualSkillImprovementSettings(input: {
    enabled: boolean;
    resolvedAt?: Date;
  }): SkillImprovementEffectiveConfig {
    const effective = buildDefaultSkillImprovementEffectiveConfig((input.resolvedAt ?? new Date()).toISOString());
    effective.enabled = input.enabled;
    effective.triggerStrategy = this.settingsService.getDefaultTriggerStrategy();
    effective.improverStrategy = this.settingsService.getDefaultImproverStrategy();
    effective.improverAgentDefinitionId = this.settingsService.getDefaultImproverAgentDefinitionId();
    return effective;
  }

  private get settingsService(): SkillImprovementSettingsService {
    return this.deps.settingsService ?? new SkillImprovementSettingsService();
  }
}
