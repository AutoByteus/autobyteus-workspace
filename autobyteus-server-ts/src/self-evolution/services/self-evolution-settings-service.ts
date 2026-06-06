import {
  DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY,
  DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY,
} from "../domain/config.js";
import {
  AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID,
} from "../domain/settings.js";
import type { SelfEvolutionEvolverStrategyName, SelfEvolutionTriggerStrategyName } from "../domain/models.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

type SelfEvolutionSettingsAccess = Pick<
  ServerSettingsService,
  "getSelfEvolutionDefaultEvolverAgentDefinitionId" | "getSettingValue"
>;

export class SelfEvolutionSettingsService {
  constructor(private readonly settings: SelfEvolutionSettingsAccess = getServerSettingsService()) {}

  getDefaultEvolverAgentDefinitionId(): string | null {
    return this.settings.getSelfEvolutionDefaultEvolverAgentDefinitionId()
      ?? this.settings.getSettingValue(AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID);
  }

  getDefaultTriggerStrategy(): SelfEvolutionTriggerStrategyName {
    return DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY;
  }

  getDefaultEvolverStrategy(): SelfEvolutionEvolverStrategyName {
    return DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY;
  }
}
