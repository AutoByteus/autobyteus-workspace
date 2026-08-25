export const RUN_MODEL_CONFIG_UPDATE_OUTCOMES = [
  "UPDATED",
  "UNCHANGED",
  "RUN_ACTIVE",
  "RUN_ARCHIVED",
  "NOT_FOUND",
  "STALE_REVISION",
  "MODEL_UNAVAILABLE",
  "SCHEMA_UNAVAILABLE",
  "VALIDATION_FAILED",
  "PERSISTENCE_FAILED",
  "PERSISTENCE_INDETERMINATE",
  "INTERNAL_ERROR",
] as const;

export type RunModelConfigUpdateOutcome = typeof RUN_MODEL_CONFIG_UPDATE_OUTCOMES[number];

export type RunModelConfigFieldError = Readonly<{
  path: string;
  message: string;
}>;

export type RunModelConfigEditability = Readonly<{
  editable: boolean;
  reason: string | null;
  configurationRevision: string;
}>;

export type RunModelConfigUpdateResult<TCanonical> = Readonly<{
  success: boolean;
  outcome: RunModelConfigUpdateOutcome;
  message: string;
  isActive: boolean;
  editability: RunModelConfigEditability;
  canonical: TCanonical;
  fieldErrors: readonly RunModelConfigFieldError[];
}>;

export const runModelConfigEditability = (input: {
  isActive: boolean;
  archived: boolean;
  available?: boolean;
  configurationRevision: string;
}): RunModelConfigEditability => Object.freeze({
  editable: input.available !== false && !input.isActive && !input.archived,
  reason: input.available === false
    ? "NOT_FOUND"
    : input.archived
    ? "RUN_ARCHIVED"
    : input.isActive
      ? "RUN_ACTIVE"
      : null,
  configurationRevision: input.configurationRevision,
});
