import type {
  SelfEvolutionConfigOverride,
  SelfEvolutionEffectiveConfig,
  SelfEvolutionEvolverStrategyName,
  SelfEvolutionTriggerStrategyName,
  SelfEvolutionConfigSource,
} from "./models.js";

export const DEFAULT_SELF_EVOLUTION_TRIGGER_STRATEGY: SelfEvolutionTriggerStrategyName = "manual_only";
export const DEFAULT_SELF_EVOLUTION_EVOLVER_STRATEGY: SelfEvolutionEvolverStrategyName = "single_agent";

export const isSelfEvolutionTriggerStrategyName = (value: unknown): value is SelfEvolutionTriggerStrategyName =>
  value === "manual_only" || value === "scheduled" || value === "signal_based";

export const isSelfEvolutionEvolverStrategyName = (value: unknown): value is SelfEvolutionEvolverStrategyName =>
  value === "single_agent" || value === "agent_team";

const hasOwn = (value: Record<string, unknown>, key: keyof SelfEvolutionConfigOverride): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeOptionalId = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isSelfEvolutionConfigSource = (value: unknown): value is SelfEvolutionConfigSource =>
  value === "default" ||
  value === "agent_run_launch" ||
  value === "team_run_launch" ||
  value === "team_member_run_launch";

export const normalizeSelfEvolutionConfigOverride = (
  value: unknown,
): SelfEvolutionConfigOverride | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const normalized: SelfEvolutionConfigOverride = {};
  if (hasOwn(raw, "enabled") && typeof raw.enabled === "boolean") {
    normalized.enabled = raw.enabled;
  }
  if (hasOwn(raw, "triggerStrategy") && isSelfEvolutionTriggerStrategyName(raw.triggerStrategy)) {
    normalized.triggerStrategy = raw.triggerStrategy;
  }
  if (hasOwn(raw, "evolverStrategy") && isSelfEvolutionEvolverStrategyName(raw.evolverStrategy)) {
    normalized.evolverStrategy = raw.evolverStrategy;
  }
  if (hasOwn(raw, "evolverAgentDefinitionId")) {
    const id = normalizeOptionalId(raw.evolverAgentDefinitionId);
    if (id !== undefined) {
      normalized.evolverAgentDefinitionId = id;
    }
  }

  return getSelfEvolutionOverrideFields(normalized).length > 0 ? normalized : null;
};

export const getSelfEvolutionOverrideFields = (
  override: SelfEvolutionConfigOverride | null | undefined,
): Array<keyof SelfEvolutionConfigOverride> => {
  if (!override) {
    return [];
  }
  return (["enabled", "triggerStrategy", "evolverStrategy", "evolverAgentDefinitionId"] as const)
    .filter((field) => override[field] !== undefined);
};

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
            ? candidate.fields.filter((field): field is keyof SelfEvolutionConfigOverride =>
                field === "enabled" || field === "triggerStrategy" || field === "evolverStrategy" || field === "evolverAgentDefinitionId")
            : [];
          return fields.length > 0 ? [{ source, fields }] : [];
        })
      : [],
  };
};
