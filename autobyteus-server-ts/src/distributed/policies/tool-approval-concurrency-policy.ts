const normalizeInvocationId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("invocationId must be a non-empty string.");
  }
  return normalized;
};

const normalizeVersion = (value: number): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("invocationVersion must be a positive integer.");
  }
  return value;
};

const normalizeTeamRunId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("teamRunId must be a non-empty string.");
  }
  return normalized;
};

const buildInvocationKey = (teamRunId: string, invocationId: string): string =>
  `${normalizeTeamRunId(teamRunId)}::${normalizeInvocationId(invocationId)}`;

export class MissingInvocationVersionError extends Error {
  constructor(invocationId: string) {
    super(`No pending invocation state found for '${invocationId}'.`);
    this.name = "MissingInvocationVersionError";
  }
}

export class StaleInvocationVersionError extends Error {
  constructor(invocationId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Stale invocation version for '${invocationId}': expected ${expectedVersion}, got ${actualVersion}.`,
    );
    this.name = "StaleInvocationVersionError";
  }
}

export class ToolApprovalConcurrencyPolicy {
  private readonly latestVersionByInvocationKey = new Map<string, number>();

  registerPendingInvocation(teamRunId: string, invocationId: string, invocationVersion: number): void {
    const key = buildInvocationKey(teamRunId, invocationId);
    const normalizedVersion = normalizeVersion(invocationVersion);
    const existing = this.latestVersionByInvocationKey.get(key);
    if (existing === undefined || normalizedVersion > existing) {
      this.latestVersionByInvocationKey.set(key, normalizedVersion);
    }
  }

  validateInvocationVersion(teamRunId: string, invocationId: string, invocationVersion: number): void {
    const key = buildInvocationKey(teamRunId, invocationId);
    const normalizedVersion = normalizeVersion(invocationVersion);
    const expectedVersion = this.latestVersionByInvocationKey.get(key);
    if (expectedVersion === undefined) {
      throw new MissingInvocationVersionError(key);
    }
    if (normalizedVersion !== expectedVersion) {
      throw new StaleInvocationVersionError(
        key,
        expectedVersion,
        normalizedVersion,
      );
    }
  }

  completeInvocation(teamRunId: string, invocationId: string): void {
    this.latestVersionByInvocationKey.delete(buildInvocationKey(teamRunId, invocationId));
  }
}
