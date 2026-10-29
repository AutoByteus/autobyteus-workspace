/**
 * The token-usage capability (`token_usage_history`). History reads and existing-run restore wait until the released
 * token-usage ledger has been consolidated: a restored run would otherwise write a fresh record that the consolidation
 * then conflicts with. The startup owner (`startup/app-data-capability-readiness.ts`) sets the state from the migration
 * runner's capability answer; a current-schema failure at startup is critical.
 */
export type TokenUsageCapabilityState =
  | Readonly<{ kind: "READY" }>
  | Readonly<{ kind: "HISTORY_MIGRATION_PENDING" }>
  | Readonly<{
      kind: "CRITICAL_CURRENT_SCHEMA_FAILURE";
      reason: string;
    }>;

let capabilityState: TokenUsageCapabilityState = {
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
    readonly state: TokenUsageCapabilityState,
  ) {
    const guidance = state.kind === "HISTORY_MIGRATION_PENDING"
      ? "The token-usage history migration has not succeeded yet. Settings → Migrations shows its status and log."
      : state.kind === "CRITICAL_CURRENT_SCHEMA_FAILURE"
        ? state.reason
        : "Token usage is ready.";
    super(`${code}: ${guidance}`);
    this.name = "TokenUsageCapabilityUnavailableError";
    this.code = code;
  }
}

export const configureTokenUsageCapability = (state: TokenUsageCapabilityState): void => {
  capabilityState = Object.freeze({ ...state });
};

export const getTokenUsageCapabilityState = (): TokenUsageCapabilityState => capabilityState;

export class TokenUsageCapability {
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
