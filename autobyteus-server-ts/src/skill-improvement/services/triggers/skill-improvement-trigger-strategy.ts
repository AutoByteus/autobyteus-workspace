import type {
  SkillImprovementEffectiveConfig,
  SkillImprovementRequest,
  SkillImprovementStrategyStatus,
  SkillImprovementTriggerStrategyName,
} from "../../domain/models.js";

export interface SkillImprovementTriggerStrategy<TInput> {
  name: SkillImprovementTriggerStrategyName;
  status: SkillImprovementStrategyStatus;
  createRequest(input: TInput, snapshot: SkillImprovementEffectiveConfig): SkillImprovementRequest;
}
