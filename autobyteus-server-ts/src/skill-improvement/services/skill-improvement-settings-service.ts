import {
  DEFAULT_SKILL_IMPROVEMENT_IMPROVER_STRATEGY,
  DEFAULT_SKILL_IMPROVEMENT_TRIGGER_STRATEGY,
} from "../domain/config.js";
import {
  AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
} from "../domain/settings.js";
import type { SkillImprovementImproverStrategyName, SkillImprovementTriggerStrategyName } from "../domain/models.js";
import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";

type SkillImprovementSettingsAccess = Pick<
  ServerSettingsService,
  "getSkillImprovementDefaultImproverAgentDefinitionId" | "getSettingValue"
>;

export class SkillImprovementSettingsService {
  constructor(private readonly settings: SkillImprovementSettingsAccess = getServerSettingsService()) {}

  getDefaultImproverAgentDefinitionId(): string | null {
    return this.settings.getSkillImprovementDefaultImproverAgentDefinitionId()
      ?? this.settings.getSettingValue(AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID);
  }

  getDefaultTriggerStrategy(): SkillImprovementTriggerStrategyName {
    return DEFAULT_SKILL_IMPROVEMENT_TRIGGER_STRATEGY;
  }

  getDefaultImproverStrategy(): SkillImprovementImproverStrategyName {
    return DEFAULT_SKILL_IMPROVEMENT_IMPROVER_STRATEGY;
  }
}
