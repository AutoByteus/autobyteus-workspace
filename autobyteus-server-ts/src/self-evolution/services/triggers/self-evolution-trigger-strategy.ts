import type {
  SelfEvolutionEffectiveConfig,
  SelfEvolutionRequest,
  SelfEvolutionStrategyStatus,
  SelfEvolutionTriggerStrategyName,
} from "../../domain/models.js";

export interface SelfEvolutionTriggerStrategy<TInput> {
  name: SelfEvolutionTriggerStrategyName;
  status: SelfEvolutionStrategyStatus;
  createRequest(input: TInput, snapshot: SelfEvolutionEffectiveConfig): SelfEvolutionRequest;
}
