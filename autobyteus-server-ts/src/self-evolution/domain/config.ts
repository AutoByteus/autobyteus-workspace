import type {
  SelfEvolutionEffectiveConfig,
  SelfEvolutionEvolverStrategyName,
  SelfEvolutionTriggerStrategyName,
  SelfEvolutionConfigSource,
  SelfEvolutionConfigField,
} from "./models.js";

export const DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY: SelfEvolutionTriggerStrategyName = "manual_only";
export const DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY: SelfEvolutionEvolverStrategyName = "single_agent";

export const isSelfEvolutionTriggerStrategyName = (value: unknown): value is SelfEvolutionTriggerStrategyName =>
  value === "manual_only" || value === "scheduled" || value === "signal_based";

export const isSelfEvolutionEvolverStrategyName = (value: unknown): value is SelfEvolutionEvolverStrategyName =>
  value === "single_agent" || value === "agent_team";

const normalizeOptionalId = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isSelfEvolutionConfigSource = (value: unknown): value is SelfEvolutionConfigSource =>
  value === "default";

const isSelfEvolutionConfigField = (value: unknown): value is SelfEvolutionConfigField =>
  value === "enabled" || value === "triggerStrategy" || value === "evolverStrategy" || value === "evolverAgentDefinitionId";

export const buildDefaultSelfEvolutionEffectiveConfig = (
  resolvedAt: string,
): SelfEvolutionEffectiveConfig => ({
  enabled: false,
  triggerStrategy: DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY,
  evolverStrategy: DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY,
  evolverAgentDefinitionId: null,
  resolvedAt,
  sourceTrace: [
    {
      source: "default",
      fields: ["enabled", "triggerStrategy", "evolverStrategy", "evolverAgentDefinitionId"],
    },
  ],
});

export const normalizeSelfEvolutionEffectiveConfig = (
  value: unknown,
): SelfEvolutionEffectiveConfig | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.enabled !== "boolean" ||
    !isSelfEvolutionTriggerStrategyName(raw.triggerStrategy) ||
    !isSelfEvolutionEvolverStrategyName(raw.evolverStrategy)
  ) {
    return null;
  }
  return {
    enabled: raw.enabled,
    triggerStrategy: raw.triggerStrategy,
    evolverStrategy: raw.evolverStrategy,
    evolverAgentDefinitionId: normalizeOptionalId(raw.evolverAgentDefinitionId) ?? null,
    resolvedAt: typeof raw.resolvedAt === "string" && raw.resolvedAt.trim() ? raw.resolvedAt.trim() : new Date(0).toISOString(),
    sourceTrace: Array.isArray(raw.sourceTrace)
      ? raw.sourceTrace.flatMap((entry): SelfEvolutionEffectiveConfig["sourceTrace"] => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return [];
          }
          const candidate = entry as Record<string, unknown>;
          const source = isSelfEvolutionConfigSource(candidate.source) ? candidate.source : "default";
          const fields = Array.isArray(candidate.fields)
            ? candidate.fields.filter(isSelfEvolutionConfigField)
            : [];
          return fields.length > 0 ? [{ source, fields }] : [];
        })
      : [],
  };
};
