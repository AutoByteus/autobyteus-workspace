import type {
  SkillImprovementEffectiveConfig,
  SkillImprovementImproverStrategyName,
  SkillImprovementTriggerStrategyName,
  SkillImprovementConfigSource,
  SkillImprovementConfigField,
} from "./models.js";

export const DEFAULT_SKILL_IMPROVEMENT_TRIGGER_STRATEGY: SkillImprovementTriggerStrategyName = "manual_only";
export const DEFAULT_SKILL_IMPROVEMENT_IMPROVER_STRATEGY: SkillImprovementImproverStrategyName = "single_agent";

export const isSkillImprovementTriggerStrategyName = (value: unknown): value is SkillImprovementTriggerStrategyName =>
  value === "manual_only" || value === "scheduled" || value === "signal_based";

export const isSkillImprovementImproverStrategyName = (value: unknown): value is SkillImprovementImproverStrategyName =>
  value === "single_agent" || value === "agent_team";

const normalizeOptionalId = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isSkillImprovementConfigSource = (value: unknown): value is SkillImprovementConfigSource =>
  value === "default";

const isSkillImprovementConfigField = (value: unknown): value is SkillImprovementConfigField =>
  value === "enabled" || value === "triggerStrategy" || value === "improverStrategy" || value === "improverAgentDefinitionId";

export const buildDefaultSkillImprovementEffectiveConfig = (
  resolvedAt: string,
): SkillImprovementEffectiveConfig => ({
  enabled: false,
  triggerStrategy: DEFAULT_SKILL_IMPROVEMENT_TRIGGER_STRATEGY,
  improverStrategy: DEFAULT_SKILL_IMPROVEMENT_IMPROVER_STRATEGY,
  improverAgentDefinitionId: null,
  resolvedAt,
  sourceTrace: [
    {
      source: "default",
      fields: ["enabled", "triggerStrategy", "improverStrategy", "improverAgentDefinitionId"],
    },
  ],
});

export const normalizeSkillImprovementEffectiveConfig = (
  value: unknown,
): SkillImprovementEffectiveConfig | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.enabled !== "boolean" ||
    !isSkillImprovementTriggerStrategyName(raw.triggerStrategy) ||
    !isSkillImprovementImproverStrategyName(raw.improverStrategy)
  ) {
    return null;
  }
  return {
    enabled: raw.enabled,
    triggerStrategy: raw.triggerStrategy,
    improverStrategy: raw.improverStrategy,
    improverAgentDefinitionId: normalizeOptionalId(raw.improverAgentDefinitionId) ?? null,
    resolvedAt: typeof raw.resolvedAt === "string" && raw.resolvedAt.trim() ? raw.resolvedAt.trim() : new Date(0).toISOString(),
    sourceTrace: Array.isArray(raw.sourceTrace)
      ? raw.sourceTrace.flatMap((entry): SkillImprovementEffectiveConfig["sourceTrace"] => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return [];
          }
          const candidate = entry as Record<string, unknown>;
          const source = isSkillImprovementConfigSource(candidate.source) ? candidate.source : "default";
          const fields = Array.isArray(candidate.fields)
            ? candidate.fields.filter(isSkillImprovementConfigField)
            : [];
          return fields.length > 0 ? [{ source, fields }] : [];
        })
      : [],
  };
};
