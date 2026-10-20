import path from "node:path";
import {
  comparablePath,
  currentPathPolicyEnvironment,
  parseTestVaultSetting,
  type PathPolicyEnvironment,
} from "autobyteus-ts/secrets/vault/test-vault-location.js";
import type { ApplicationDatabaseLocation } from "../config/application-database-location.js";

export const TEST_VAULT_IGNORED_ON_REAL_APP_DATA = "TEST_VAULT_IGNORED_ON_REAL_APP_DATA";

/** True when `dataDir` is the real desktop app's server data folder, `~/.autobyteus/server-data`. */
export const isRealAppServerDataDir = (
  dataDir: string,
  policy: Pick<PathPolicyEnvironment, "platform" | "homeDir"> = currentPathPolicyEnvironment(),
): boolean => comparablePath(dataDir, policy.platform)
  === comparablePath(path.join(policy.homeDir, ".autobyteus", "server-data"), policy.platform);

/**
 * Where a server's key lookups read from, chosen once at startup:
 * - `application`: the vault inside the server's own database (the default);
 * - `test`: the read-only test vault in `directory`, selected by `AUTOBYTEUS_TEST_VAULT`.
 */
export type SecretVaultSource =
  | {
      kind: "application";
      location: ApplicationDatabaseLocation;
      notice?: typeof TEST_VAULT_IGNORED_ON_REAL_APP_DATA;
    }
  | { kind: "test"; directory: string };

export type SecretVaultSourceInput = Readonly<{
  /** The `AUTOBYTEUS_TEST_VAULT` value, if any. */
  testVaultSetting: string | undefined;
  appDataDir: string;
  databaseLocation: ApplicationDatabaseLocation;
}>;

/**
 * The only place that decides a server's vault source. An unset (or blank)
 * selector gives the application vault, as does a server running on the real
 * desktop app data (`~/.autobyteus/server-data`), which ignores the selector
 * with a notice. Otherwise the selector names the test vault; whether it can
 * be opened is decided when the runtime opens it.
 */
export const selectSecretVaultSource = (
  input: SecretVaultSourceInput,
  policy: Pick<PathPolicyEnvironment, "platform" | "homeDir"> = currentPathPolicyEnvironment(),
): SecretVaultSource => {
  const setting = input.testVaultSetting?.trim();
  if (!setting) return { kind: "application", location: input.databaseLocation };
  if (isRealAppServerDataDir(input.appDataDir, policy)) {
    return {
      kind: "application",
      location: input.databaseLocation,
      notice: TEST_VAULT_IGNORED_ON_REAL_APP_DATA,
    };
  }
  return { kind: "test", directory: setting };
};

/**
 * The selected test vault's directory, which agent file tools must not reach
 * (the server's own vault files are denied the same way). Empty for the
 * application source, and for an invalid selector, which fails startup when
 * the runtime opens it.
 */
export const selectedTestVaultPaths = (
  source: SecretVaultSource,
  homeDir?: string,
): string[] => {
  if (source.kind !== "test") return [];
  try {
    return [parseTestVaultSetting(source.directory, homeDir)];
  } catch {
    return [];
  }
};
