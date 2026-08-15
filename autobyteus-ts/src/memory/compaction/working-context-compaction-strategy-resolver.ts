import type { CompactionRuntimeSettingsResolver } from './compaction-runtime-settings.js';
import type {
  WorkingContextCompactionStrategy,
  WorkingContextCompactionStrategyConstructionContext,
  WorkingContextCompactionStrategyExecutionContext,
} from './working-context-compaction-strategy.js';
import type { WorkingContextCompactionStrategyRegistry } from './working-context-compaction-strategy-registry.js';

export type WorkingContextCompactionStrategyResolverOptions = {
  registry: WorkingContextCompactionStrategyRegistry;
  settingsResolver: CompactionRuntimeSettingsResolver;
  constructionContext: WorkingContextCompactionStrategyConstructionContext;
};

export class WorkingContextCompactionStrategyResolver {
  constructor(private readonly options: WorkingContextCompactionStrategyResolverOptions) {}

  resolve(executionContext: WorkingContextCompactionStrategyExecutionContext): WorkingContextCompactionStrategy {
    const strategyId = this.options.settingsResolver.resolve().strategyId;
    const registration = this.options.registry.get(strategyId);
    if (!registration) {
      throw new Error(`Unknown working-context compaction strategy '${strategyId}'.`);
    }
    const strategy = registration.create(this.options.constructionContext, executionContext);
    if (!strategy || strategy.id !== registration.id || strategy.name !== registration.name) {
      throw new Error(
        `Working-context compaction strategy '${strategyId}' returned an invalid identity; ` +
        `expected '${registration.id}' / '${registration.name}'.`,
      );
    }
    return strategy;
  }
}
