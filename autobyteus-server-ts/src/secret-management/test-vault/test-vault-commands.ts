import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ApplicationDatabaseLocation } from "../../config/application-database-location.js";
import { providerCredentialCatalog } from "../catalog/provider-credential-catalog.js";
import type { SecretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import {
  LocalEnvironmentSecretImportService,
  type LocalImportDecisionPort,
} from "../provisioning/local-environment-secret-import-service.js";
import {
  LocalEnvironmentSecretImportError,
  type LocalEnvironmentSecretImportResult,
} from "../provisioning/local-environment-secret-import.js";
import { LocalEnvironmentSourceReader } from "../provisioning/local-environment-source-reader.js";
import { openReadOnlyTestVault } from "./read-only-test-vault.js";
import {
  currentPathPolicyEnvironment,
  defaultTestVaultDirectory,
  parseTestVaultSetting,
  resolveTestVaultLocation,
  type PathPolicyEnvironment,
  type TestVaultLocation,
} from "autobyteus-ts/secrets/vault/test-vault-location.js";

export type TestVaultSetupResult = Readonly<{
  location: TestVaultLocation;
  import: LocalEnvironmentSecretImportResult;
}>;

export type TestVaultStatus = Readonly<{
  location: TestVaultLocation;
  state: "READY" | "NOT_FOUND" | "UNAVAILABLE";
  configured: SecretId[];
  missing: SecretId[];
  /** Value-free reason when the state is not READY. */
  reason?: string;
}>;

export type TestVaultRemoveResult = Readonly<{
  location: TestVaultLocation;
  removed: string[];
}>;

export type TestVaultCommandContext = Readonly<{
  /** The `AUTOBYTEUS_TEST_VAULT` value of the invoking shell, if any. */
  setting: string | undefined;
  policy?: PathPolicyEnvironment;
}>;

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

const sidecarPaths = (location: TestVaultLocation): string[] => [
  `${location.databasePath}-wal`,
  `${location.databasePath}-shm`,
  `${location.databasePath}-journal`,
];

/**
 * The only writer of the test vault: `pnpm test-vault setup|status|remove`.
 * The vault lives in the selector's directory, or `~/.autobyteus-test/vault`
 * when the selector is unset; a location in the user's app data is refused
 * before any file is touched.
 */
export class TestVaultCommands {
  constructor(
    // The test vault also accepts the test-only aliases (for example the live-check GitHub token).
    private readonly importer = new LocalEnvironmentSecretImportService(
      new LocalEnvironmentSourceReader(undefined, undefined, "testVault"),
    ),
  ) {}

  location(context: TestVaultCommandContext): TestVaultLocation {
    const policy = context.policy ?? currentPathPolicyEnvironment();
    const setting = context.setting?.trim();
    const directory = setting
      ? parseTestVaultSetting(setting, policy.homeDir)
      : defaultTestVaultDirectory(policy.homeDir);
    return resolveTestVaultLocation(directory, policy);
  }

  /**
   * Creates or updates the vault from an owner-private secrets file, through
   * the normal importer (same source validation and value-free output).
   * Configured secrets are skipped unless `replace` is set.
   */
  async setup(
    input: Readonly<{ sourcePath: string; replace: boolean }>,
    context: TestVaultCommandContext,
  ): Promise<TestVaultSetupResult> {
    const location = this.location(context);
    await fsp.mkdir(location.directory, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    if (process.platform !== "win32") await fsp.chmod(location.directory, PRIVATE_DIRECTORY_MODE);
    const result = await this.importer.execute(
      Object.freeze({
        sourcePath: input.sourcePath,
        targetLocation: ApplicationDatabaseLocation.fromAbsoluteFileUrl(
          pathToFileURL(location.databasePath).href,
        ),
        dryRun: false,
        overwrite: input.replace,
      }),
      testVaultTargetDecision(location),
    );
    await restrictToOwner([location.databasePath, location.rootKeyPath, ...sidecarPaths(location)]);
    return { location, import: result };
  }

  /** Location and value-free configured/missing secret IDs. Never writes. */
  async status(context: TestVaultCommandContext): Promise<TestVaultStatus> {
    const location = this.location(context);
    let vault: Awaited<ReturnType<typeof openReadOnlyTestVault>>;
    try {
      vault = await openReadOnlyTestVault(location.directory, context.policy);
    } catch (error) {
      if (error instanceof SecretVaultError && error.code === "TEST_VAULT_NOT_FOUND") {
        return { location, state: "NOT_FOUND", configured: [], missing: [], reason: error.message };
      }
      if (error instanceof SecretVaultError && error.code === "TEST_VAULT_UNAVAILABLE") {
        return { location, state: "UNAVAILABLE", configured: [], missing: [], reason: error.message };
      }
      throw error;
    }
    try {
      const configured: SecretId[] = [];
      const missing: SecretId[] = [];
      for (const id of providerCredentialCatalog.listFixedSecretIds()) {
        (await vault.service.getStatusForSecretId(id) === "CONFIGURED" ? configured : missing).push(id);
      }
      return { location, state: "READY", configured, missing };
    } finally {
      vault.close();
    }
  }

  /** Deletes exactly the vault database, its key and the SQLite sidecars. */
  async remove(context: TestVaultCommandContext): Promise<TestVaultRemoveResult> {
    const location = this.location(context);
    const removed: string[] = [];
    for (const candidate of [location.databasePath, location.rootKeyPath, ...sidecarPaths(location)]) {
      if (!fs.existsSync(candidate)) continue;
      await fsp.rm(candidate, { force: true });
      removed.push(candidate);
    }
    return { location, removed };
  }
}

/** Setup confirms only its own, already validated test-vault database. */
const testVaultTargetDecision = (location: TestVaultLocation): LocalImportDecisionPort => ({
  confirm: async (targetLocation) => {
    if (path.resolve(targetLocation.databasePath) !== location.databasePath) {
      throw new LocalEnvironmentSecretImportError("IMPORT_CANCELLED");
    }
  },
});

const restrictToOwner = async (paths: string[]): Promise<void> => {
  if (process.platform === "win32") return;
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) await fsp.chmod(candidate, PRIVATE_FILE_MODE);
  }
};
