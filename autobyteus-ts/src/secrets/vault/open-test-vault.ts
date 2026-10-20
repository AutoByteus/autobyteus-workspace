import fs from "node:fs";
import type { ProviderApiKeySlot } from "../provider-api-key-resolver.js";
import type { SecretValue } from "../secret-value.js";
import { providerSecretId } from "./provider-secret-id.js";
import { ReadOnlySecretVaultStore } from "./read-only-secret-vault-store.js";
import { readSecretEntry } from "./read-secret-entry.js";
import type { SecretVaultMetadataRecord } from "./secret-vault-records.js";
import { SecretVaultError } from "./secret-vault-types.js";
import {
  currentPathPolicyEnvironment,
  resolveTestVaultLocation,
  TEST_VAULT_SETUP_COMMAND,
  type PathPolicyEnvironment,
  type TestVaultLocation,
} from "./test-vault-location.js";
import { verifyEstablishedVault } from "./verify-established-vault.js";

/** An opened, verified (READY) test vault. `close` zeroizes the root key and closes the file. */
export type VerifiedTestVault = Readonly<{
  location: TestVaultLocation;
  store: ReadOnlySecretVaultStore;
  rootKey: Buffer;
  metadata: SecretVaultMetadataRecord;
  close(): void;
}>;

const exists = (candidate: string): boolean => {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch {
    return false;
  }
};

const unavailable = (
  location: TestVaultLocation,
  healthInstruction: string,
  cause?: unknown,
): SecretVaultError => new SecretVaultError("TEST_VAULT_UNAVAILABLE", false, "TEST_VAULT_UNAVAILABLE", {
  cause,
  detail: `test vault ${location.directory} cannot be used (${healthInstruction})`,
});

/**
 * Opens the test vault in `directory` read-only and verifies it, without any
 * write. Throws `SecretVaultError` and opens nothing when the location is
 * invalid (`TEST_VAULT_LOCATION_INVALID`) or forbidden
 * (`TEST_VAULT_LOCATION_FORBIDDEN`), when the database or key file is missing
 * (`TEST_VAULT_NOT_FOUND`), or when verification is not READY
 * (`TEST_VAULT_UNAVAILABLE`).
 */
export const openVerifiedTestVault = async (
  directory: string,
  policy: PathPolicyEnvironment = currentPathPolicyEnvironment(),
): Promise<VerifiedTestVault> => {
  const location = resolveTestVaultLocation(directory, policy);
  if (!exists(location.databasePath) || !exists(location.rootKeyPath)) {
    throw new SecretVaultError("TEST_VAULT_NOT_FOUND", false, "TEST_VAULT_NOT_FOUND", {
      detail: `no test vault in ${location.directory}; run ${TEST_VAULT_SETUP_COMMAND}`,
    });
  }
  let store: ReadOnlySecretVaultStore;
  try {
    store = ReadOnlySecretVaultStore.open(location.databasePath);
  } catch (cause) {
    throw unavailable(
      location,
      cause instanceof SecretVaultError ? cause.instructionCode : "SECRET_VAULT_UNAVAILABLE",
      cause,
    );
  }
  const verified = await verifyEstablishedVault(store, location);
  if (verified.health.state !== "READY" || !verified.rootKey || !verified.metadata) {
    store.close();
    throw unavailable(
      location,
      "instructionCode" in verified.health ? verified.health.instructionCode : "SECRET_VAULT_UNAVAILABLE",
    );
  }
  const { rootKey, metadata } = verified;
  return Object.freeze({
    location,
    store,
    rootKey,
    metadata,
    close: () => {
      rootKey.fill(0);
      store.close();
    },
  });
};

/** Reads provider keys from a verified test vault, by provider and slot. */
export type TestVaultReader = Readonly<{
  location: TestVaultLocation;
  readProviderApiKey(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue>;
  close(): void;
}>;

export const openTestVaultReader = async (directory: string): Promise<TestVaultReader> => {
  const vault = await openVerifiedTestVault(directory);
  return Object.freeze({
    location: vault.location,
    readProviderApiKey: (providerId: string, slot: ProviderApiKeySlot = "apiKey") =>
      readSecretEntry(vault.store, vault.rootKey, vault.metadata, providerSecretId(providerId, slot)),
    close: vault.close,
  });
};
