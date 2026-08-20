import type { AppDataMigrationStatus } from "../../app-data-migrations/domain/app-data-migration-types.js";

export const TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID =
  "20260819_token_usage_run_records_v1";

export type TokenUsageMigrationCapabilityState =
  | Readonly<{ kind: "READY" }>
  | Readonly<{
      kind: "CURRENT_SCHEMA_DEGRADED";
      migrationStatus: AppDataMigrationStatus | "MISSING";
      logPath: string | null;
    }>
  | Readonly<{
      kind: "CRITICAL_CURRENT_SCHEMA_FAILURE";
      reason: string;
    }>;

let capabilityState: TokenUsageMigrationCapabilityState = {
  kind: "CRITICAL_CURRENT_SCHEMA_FAILURE",
  reason: "Token usage current-schema readiness has not been initialized.",
};

export class TokenUsageCapabilityUnavailableError extends Error {
  readonly code:
    | "TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED"
    | "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED"
    | "TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED";

  constructor(
    code: TokenUsageCapabilityUnavailableError["code"],
    readonly state: TokenUsageMigrationCapabilityState,
  ) {
    const guidance = state.kind === "CURRENT_SCHEMA_DEGRADED"
      ? `Migration status is ${state.migrationStatus}. Restart after installing a corrected version to retry migration${state.logPath ? `; see ${state.logPath}` : ""}.`
      : state.kind === "CRITICAL_CURRENT_SCHEMA_FAILURE"
        ? state.reason
        : "Token usage is ready.";
    super(`${code}: ${guidance}`);
    this.name = "TokenUsageCapabilityUnavailableError";
    this.code = code;
  }
}

export const configureTokenUsageMigrationReadiness = (
  state: TokenUsageMigrationCapabilityState,
): void => {
  capabilityState = Object.freeze({ ...state });
};

export const getTokenUsageMigrationCapabilityState = (): TokenUsageMigrationCapabilityState =>
  capabilityState;

export class TokenUsageMigrationReadiness {
  assertHistoricalReadReady(): void {
    if (capabilityState.kind !== "READY") {
      throw new TokenUsageCapabilityUnavailableError(
        "TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED",
        capabilityState,
      );
    }
  }

  assertExistingRunRestoreReady(): void {
    if (capabilityState.kind !== "READY") {
      throw new TokenUsageCapabilityUnavailableError(
        "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED",
        capabilityState,
      );
    }
  }

  assertCurrentSchemaReady(): void {
    if (capabilityState.kind === "CRITICAL_CURRENT_SCHEMA_FAILURE") {
      throw new TokenUsageCapabilityUnavailableError(
        "TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED",
        capabilityState,
      );
    }
  }
}
