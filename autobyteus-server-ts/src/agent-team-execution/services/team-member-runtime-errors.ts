export interface TeamRuntimeRoutingErrorShape {
  code: string;
  message: string;
}

export class TeamRuntimeRoutingError extends Error {
  readonly code: string;

  constructor(input: TeamRuntimeRoutingErrorShape) {
    super(input.message);
    this.code = input.code;
    this.name = "TeamRuntimeRoutingError";
  }
}

export const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new TeamRuntimeRoutingError({
      code: "INVALID_INPUT",
      message: `${fieldName} is required.`,
    });
  }
  return normalized;
};

export const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
