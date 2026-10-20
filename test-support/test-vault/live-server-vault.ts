import type { TestContext } from 'vitest';
import { ApplicationDatabaseLocation } from '../../autobyteus-server-ts/src/config/application-database-location.js';
import { appConfigProvider } from '../../autobyteus-server-ts/src/config/app-config-provider.js';
import { disableEnvironmentProviderApiKeySource } from '../../autobyteus-ts/src/secrets/provider-api-key-resolver.js';
import { TEST_VAULT_SETTING_NAME } from '../../autobyteus-ts/src/secrets/test-vault-setting.js';
import { secretId } from '../../autobyteus-ts/src/secrets/vault/secret-id.js';
import {
  getSecretVaultRuntime,
  resetSecretVaultRuntimeForTests,
} from '../../autobyteus-server-ts/src/secret-management/secret-vault-runtime.js';
import {
  selectSecretVaultSource,
  type SecretVaultSource,
} from '../../autobyteus-server-ts/src/secret-management/secret-vault-source.js';
import { TEST_VAULT_SETUP_COMMAND } from '../../autobyteus-ts/src/secrets/vault/test-vault-location.js';
import { LIVE_STRICT_GATE } from './live-provider-test.js';
import { capturedTestVaultSetting } from './test-vault-selection.js';

/*
 * The vault of an in-process server live suite. Only gated live suites (and
 * the real-provider E2E harness) call this; deterministic tests initialize the
 * runtime with the application source themselves.
 */

export type LiveServerVaultTarget = Readonly<{
  databaseLocation: ApplicationDatabaseLocation;
  appDataDir: string;
}>;

let selectedSource: SecretVaultSource | null = null;

/** The test run's own database, as the server test setup configures it. */
const testRunVaultTarget = (): LiveServerVaultTarget => {
  const configuredDatabaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!configuredDatabaseUrl) throw new Error('LIVE_RUNTIME_TEST_DATABASE_URL_REQUIRED');
  return {
    databaseLocation: ApplicationDatabaseLocation.fromConfiguredFileUrl(
      configuredDatabaseUrl,
      appConfigProvider.config.getAppRootDir(),
    ),
    appDataDir: appConfigProvider.config.getAppDataDir(),
  };
};

/**
 * (Re)initializes the in-process vault runtime the way server startup does:
 * the test vault when the run's `AUTOBYTEUS_TEST_VAULT` is set (read-only; a
 * missing or unusable vault throws), otherwise the run database's own vault.
 */
export const initializeLiveServerVault = async (
  target: LiveServerVaultTarget = testRunVaultTarget(),
): Promise<SecretVaultSource> => {
  // As at server startup: the server's vault is the only key source in this process.
  disableEnvironmentProviderApiKeySource();
  await resetSecretVaultRuntimeForTests();
  const source = selectSecretVaultSource({
    testVaultSetting: capturedTestVaultSetting(),
    appDataDir: target.appDataDir,
    databaseLocation: target.databaseLocation,
  });
  await getSecretVaultRuntime().initialize(source);
  selectedSource = source;
  return source;
};

export const closeLiveServerVault = async (): Promise<void> => {
  selectedSource = null;
  await resetSecretVaultRuntimeForTests();
};

const describeSource = (): string => selectedSource?.kind === 'test'
  ? `test vault ${selectedSource.directory}`
  : `run database; set ${TEST_VAULT_SETTING_NAME} to use the test vault`;

/**
 * Inside a live test: skips it with a reason when the selected vault does not
 * hold `id` (`AUTOBYTEUS_LIVE_STRICT=1` fails instead), so a missing key is
 * reported, never passed.
 */
export const requireLiveCapability = async (context: TestContext, id: string): Promise<void> => {
  const state = await getSecretVaultRuntime().requireService().getStatusForSecretId(secretId(id));
  if (state === 'CONFIGURED') return;
  const reason = `missing capability ${id} (${describeSource()}); add it with ${TEST_VAULT_SETUP_COMMAND}`;
  console.warn(`[live provider skip] ${reason}`);
  if (process.env[LIVE_STRICT_GATE] === '1') throw new Error(`LIVE_PROVIDER_UNAVAILABLE: ${reason}`);
  context.skip(reason);
};
