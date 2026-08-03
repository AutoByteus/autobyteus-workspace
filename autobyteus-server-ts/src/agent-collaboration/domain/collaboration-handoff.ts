import { CollaborationContractError } from "./collaboration-contract-error.js";

export type CollaborationHandoff = Readonly<{
  from: string;
  to: string;
  rules: readonly string[];
}>;

export const cloneCollaborationHandoff = (
  handoff: CollaborationHandoff,
): CollaborationHandoff => Object.freeze({
  from: handoff.from,
  to: handoff.to,
  rules: Object.freeze([...handoff.rules]),
});

export const cloneCollaborationHandoffs = (
  handoffs: readonly CollaborationHandoff[],
): CollaborationHandoff[] => handoffs.map(cloneCollaborationHandoff);

const invalidHandoff = (message: string): never => {
  throw new CollaborationContractError("COLLABORATION_HANDOFF_RULE_INVALID", message);
};

export const normalizeCollaborationHandoffs = (
  value: unknown,
  fieldName = "handoffs",
): CollaborationHandoff[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return invalidHandoff(`${fieldName} must be an array.`);
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return invalidHandoff(`${fieldName}[${index}] must be an object.`);
    }
    const candidate = entry as Record<string, unknown>;
    const from = typeof candidate.from === "string" ? candidate.from : "";
    const to = typeof candidate.to === "string" ? candidate.to : "";
    if (!from || !to) {
      return invalidHandoff(`${fieldName}[${index}] must include non-empty from and to strings.`);
    }
    if (!Array.isArray(candidate.rules) || candidate.rules.length === 0) {
      return invalidHandoff(`${fieldName}[${index}].rules must be a non-empty array.`);
    }
    const rules = candidate.rules.map((rule, ruleIndex) => {
      if (typeof rule !== "string" || !rule || rule !== rule.trim()) {
        return invalidHandoff(
          `${fieldName}[${index}].rules[${ruleIndex}] must be a non-empty trimmed string.`,
        );
      }
      return rule;
    });
    return cloneCollaborationHandoff({ from, to, rules });
  });
};
