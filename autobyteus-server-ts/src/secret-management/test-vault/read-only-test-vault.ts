import fs from "node:fs";
import { SecretVaultBootstrap } from "../bootstrap/secret-vault-bootstrap.js";
import { SecretVaultError } from "../domain/secret-vault-types.js";
import { ReadOnlySecretVaultStore } from "../persistence/read-only-secret-vault-store.js";
import { SecretManagementService } from "../services/secret-management-service.js";
import {
  currentPathPolicyEnvironment,
  resolveTestVaultLocation,
  TEST_VAULT_SETUP_COMMAND,
  type PathPolicyEnvironment,
  type TestVaultLocation,
} from "./test-vault-location.js";

/*
 * The read-only entry to the test vault. It is loaded by the server runtime,
 * by `pnpm test-vault status` and by test setups that have no server database
 * (autobyteus-ts), so it must never load Prisma, the vault runtime, migrations
 * or the importer.
 */

export type ReadOnlyTestVault = Readonly<{
  location: TestVaultLocation;
  service: SecretManagementService;
  /** Zeroizes the root key and closes the database file. */
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

/**
 * Opens the test vault in `directory` read-only and verifies it.
 *
 * Throws `SecretVaultError` and opens nothing when the location is invalid
 * (`TEST_VAULT_LOCATION_INVALID`) or forbidden (`TEST_VAULT_LOCATION_FORBIDDEN`),
 * when the database or key file is missing (`TEST_VAULT_NOT_FOUND`), or when
 * verification is not READY (`TEST_VAULT_UNAVAILABLE`).
 */
export const openReadOnlyTestVault = async (
  directory: string,
  policy: PathPolicyEnvironment = currentPathPolicyEnvironment(),
): Promise<ReadOnlyTestVault> => {
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
    throw unavailable(location, cause instanceof SecretVaultError ? cause.instructionCode : "SECRET_VAULT_UNAVAILABLE", cause);
  }
  const verified = await SecretVaultBootstrap.verifyEstablished(store, location.databaseLocation);
  if (verified.health.state !== "READY") {
    store.close();
    throw unavailable(location, verified.health.instructionCode);
  }
  const service = new SecretManagementService(
    store,
    verified.rootKey,
    verified.metadata,
    verified.health,
  );
  return Object.freeze({
    location,
    service,
    close: () => {
      service.close();
      store.close();
    },
  });
};

const unavailable = (
  location: TestVaultLocation,
  healthInstruction: string,
  cause?: unknown,
): SecretVaultError => new SecretVaultError("TEST_VAULT_UNAVAILABLE", false, "TEST_VAULT_UNAVAILABLE", {
  cause,
  detail: `test vault ${location.directory} cannot be used (${healthInstruction})`,
});
