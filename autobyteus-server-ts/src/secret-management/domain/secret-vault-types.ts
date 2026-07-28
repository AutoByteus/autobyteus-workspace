export type SecretStorageState = "MISSING" | "CONFIGURED";

export type SecretVaultHealth =
  | { state: "READY" }
  | { state: "LOCKED"; instructionCode: "SECRET_VAULT_LOCKED" }
  | { state: "UNAVAILABLE"; instructionCode: "SECRET_VAULT_UNAVAILABLE" }
  | { state: "CORRUPT"; instructionCode: "SECRET_VAULT_CORRUPT" }
  | { state: "INCOMPATIBLE"; instructionCode: "SECRET_VAULT_INCOMPATIBLE" };

export type SecretVaultErrorCode =
  | "NOT_FOUND"
  | "ACCESS_DENIED"
  | "VAULT_UNAVAILABLE"
  | "VAULT_LOCKED"
  | "INCOMPATIBLE_FORMAT"
  | "CORRUPT_VAULT"
  | "CORRUPT_STORED_VALUE";

export class SecretVaultError extends Error {
  constructor(
    readonly code: SecretVaultErrorCode,
    readonly retryable: boolean,
    readonly instructionCode: string,
    options?: { cause?: unknown },
  ) {
    super(instructionCode, options);
    this.name = "SecretVaultError";
  }

  toJSON(): { code: SecretVaultErrorCode; retryable: boolean; instructionCode: string } {
    return { code: this.code, retryable: this.retryable, instructionCode: this.instructionCode };
  }
}

export const READY_SECRET_VAULT_HEALTH: SecretVaultHealth = Object.freeze({ state: "READY" });

export const vaultHealthFromError = (error: unknown): SecretVaultHealth => {
  if (!(error instanceof SecretVaultError)) {
    return { state: "UNAVAILABLE", instructionCode: "SECRET_VAULT_UNAVAILABLE" };
  }
  switch (error.code) {
    case "VAULT_LOCKED":
      return { state: "LOCKED", instructionCode: "SECRET_VAULT_LOCKED" };
    case "INCOMPATIBLE_FORMAT":
      return { state: "INCOMPATIBLE", instructionCode: "SECRET_VAULT_INCOMPATIBLE" };
    case "CORRUPT_VAULT":
    case "CORRUPT_STORED_VALUE":
      return { state: "CORRUPT", instructionCode: "SECRET_VAULT_CORRUPT" };
    default:
      return { state: "UNAVAILABLE", instructionCode: "SECRET_VAULT_UNAVAILABLE" };
  }
};
