import type { RuntimeUsageLimit } from "../runtime-management/agent-runtimes/usage-limits/usage-limits-reading.js";

export type LimitCoveredModel = Readonly<{ id: string; name: string }>;

const words = (text: string): string[] => text.toLowerCase().split(/[\s()]+/).filter(Boolean);

/**
 * How specifically a display name belongs to a family: the family's word count when its words appear in the name in
 * order, starting with the name's first word ("Gemini Flash" ⊂ "Gemini 3.8 Flash (High)"); 0 when it does not belong.
 */
export const familyMatchStrength = (displayName: string, family: string): number => {
  const name = words(displayName);
  const familyWords = words(family);
  if (!familyWords.length || name[0] !== familyWords[0]) return 0;
  let matched = 0;
  for (const word of name) {
    if (word === familyWords[matched]) matched += 1;
    if (matched === familyWords.length) return matched;
  }
  return 0;
};

const strengthFor = (limit: RuntimeUsageLimit, model: LimitCoveredModel): number =>
  limit.appliesTo.kind === "modelFamilies"
    ? Math.max(0, ...limit.appliesTo.families.map((family) => familyMatchStrength(model.name, family)))
    : 0;

/**
 * The model ids each limit covers. A model in several families' groups belongs to the most specific one. A limit
 * that covers none of the models covers all of them (DEC-003: it may hide a usable model, never shows a blocked one as
 * usable).
 */
export const resolveLimitCoverage = (
  limits: readonly RuntimeUsageLimit[],
  models: readonly LimitCoveredModel[],
): Map<RuntimeUsageLimit, ReadonlySet<string>> => {
  const strongest = new Map(models.map((model) => [model.id, Math.max(0, ...limits.map((limit) => strengthFor(limit, model)))]));
  const allIds = new Set(models.map((model) => model.id));
  const coverage = new Map<RuntimeUsageLimit, ReadonlySet<string>>();
  for (const limit of limits) {
    const scope = limit.appliesTo;
    const covered = scope.kind === "runtime"
      ? allIds
      : scope.kind === "models"
        ? new Set(scope.modelIds.filter((id) => allIds.has(id)))
        : new Set(models.filter((model) => {
          const strength = strengthFor(limit, model);
          return strength > 0 && strength === strongest.get(model.id);
        }).map((model) => model.id));
    coverage.set(limit, covered.size ? covered : allIds);
  }
  return coverage;
};
