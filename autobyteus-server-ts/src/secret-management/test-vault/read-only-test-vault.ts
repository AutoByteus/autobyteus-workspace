import { openVerifiedTestVault } from "autobyteus-ts/secrets/vault/open-test-vault.js";
import { READY_SECRET_VAULT_HEALTH } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import {
  currentPathPolicyEnvironment,
  type PathPolicyEnvironment,
  type TestVaultLocation,
} from "autobyteus-ts/secrets/vault/test-vault-location.js";
import { SecretManagementService } from "../services/secret-management-service.js";

/*
 * The server's read-only entry to the test vault (runtime test source,
 * `pnpm test-vault status`): the autobyteus-ts verified opener (location policy,
 * read-only store, verification) with the server's `SecretManagementService`
 * on top, so product lookups keep their authorization and events. It must
 * never load Prisma, the vault runtime, migrations or the importer.
 */

export type ReadOnlyTestVault = Readonly<{
  location: TestVaultLocation;
  service: SecretManagementService;
  /** Zeroizes the root key and closes the database file. */
  close(): void;
}>;

/**
 * Opens the test vault in `directory` read-only and verifies it; throws
 * `SecretVaultError` with the `TEST_VAULT_*` codes of `openVerifiedTestVault`.
 */
export const openReadOnlyTestVault = async (
  directory: string,
  policy: PathPolicyEnvironment = currentPathPolicyEnvironment(),
): Promise<ReadOnlyTestVault> => {
  const vault = await openVerifiedTestVault(directory, policy);
  const service = new SecretManagementService(
    vault.store,
    vault.rootKey,
    vault.metadata,
    READY_SECRET_VAULT_HEALTH,
  );
  return Object.freeze({
    location: vault.location,
    service,
    close: () => {
      service.close();
      vault.close();
    },
  });
};
