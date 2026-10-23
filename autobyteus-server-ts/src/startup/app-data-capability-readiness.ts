import type { AppDataCapabilityReadiness } from "../app-data-migrations/domain/app-data-migration-types.js";
import { configureCustomLlmProviderAvailability } from "../llm-management/llm-providers/stores/custom-llm-provider-availability.js";
import { configureTokenUsageCapability } from "../token-usage/providers/token-usage-capability.js";

/**
 * The one owner that applies app-data capability readiness to the features a pending migration holds back. Both startup
 * hosts mark every capability pending before the migration runner runs, then apply its answer; a manual migration
 * retry applies the fresh answer.
 */
export const markCapabilitiesPending = (): void => {
  configureTokenUsageCapability({ kind: "HISTORY_MIGRATION_PENDING" });
  configureCustomLlmProviderAvailability(false);
};

export const applyCapabilityReadiness = (readiness: AppDataCapabilityReadiness): void => {
  configureTokenUsageCapability(
    readiness.token_usage_history ? { kind: "READY" } : { kind: "HISTORY_MIGRATION_PENDING" },
  );
  configureCustomLlmProviderAvailability(readiness.custom_llm_providers);
};
