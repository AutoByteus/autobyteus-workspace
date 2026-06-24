import { buildDefaultSelfEvolutionEffectiveConfig } from "../domain/config.js";
import type { SelfEvolutionEffectiveConfig } from "../domain/models.js";
import { SelfEvolutionSettingsService } from "./self-evolution-settings-service.js";

export class SelfEvolutionEffectiveConfigResolver {
  constructor(private readonly deps: { settingsService?: SelfEvolutionSettingsService } = {}) {}

  resolveCurrentManualSelfEvolutionSettings(input: {
    enabled: boolean;
    resolvedAt?: Date;
  }): SelfEvolutionEffectiveConfig {
    const effective = buildDefaultSelfEvolutionEffectiveConfig((input.resolvedAt ?? new Date()).toISOString());
    effective.enabled = input.enabled;
    effective.triggerStrategy = this.settingsService.getDefaultTriggerStrategy();
    effective.evolverStrategy = this.settingsService.getDefaultEvolverStrategy();
    effective.evolverAgentDefinitionId = this.settingsService.getDefaultEvolverAgentDefinitionId();
    return effective;
  }

  private get settingsService(): SelfEvolutionSettingsService {
    return this.deps.settingsService ?? new SelfEvolutionSettingsService();
  }
}
