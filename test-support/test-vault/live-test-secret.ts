import type { TestContext } from 'vitest';
import type { SecretValue } from '../../autobyteus-ts/src/secrets/secret-value.js';
import { TEST_VAULT_SETTING_NAME } from '../../autobyteus-ts/src/secrets/test-vault-setting.js';
import { openVerifiedTestVault } from '../../autobyteus-ts/src/secrets/vault/open-test-vault.js';
import { readSecretEntry } from '../../autobyteus-ts/src/secrets/vault/read-secret-entry.js';
import { secretId } from '../../autobyteus-ts/src/secrets/vault/secret-id.js';
import { SecretVaultError } from '../../autobyteus-ts/src/secrets/vault/secret-vault-types.js';
import { TEST_VAULT_SETUP_COMMAND } from '../../autobyteus-ts/src/secrets/vault/test-vault-location.js';
import { LIVE_STRICT_GATE } from './live-provider-test.js';
import { capturedTestVaultSetting } from './test-vault-selection.js';

/**
 * Inside a live test: reads one secret the test itself hands to the system under test (for example the GitHub test
 * token, sent once as a new MCP secret through GraphQL into a server that keeps its own vault). It opens the run's
 * test vault read-only (`AUTOBYTEUS_TEST_VAULT`, captured by the test setup), reads the entry and closes the vault.
 *
 * When no test vault is selected, the vault cannot be opened, or it does not hold `id`, the test is skipped with the
 * reason (`AUTOBYTEUS_LIVE_STRICT=1` fails instead), so a missing secret is reported, never passed. The value stays a
 * `SecretValue` (never printed); reveal it only where it is sent.
 */
export const readLiveTestSecret = async (context: TestContext, id: string): Promise<SecretValue> => {
  const unavailable = (detail: string): never => {
    const reason = `missing capability ${id} (${detail}); add it with ${TEST_VAULT_SETUP_COMMAND}`;
    console.warn(`[live test skip] ${reason}`);
    if (process.env[LIVE_STRICT_GATE] === '1') throw new Error(`LIVE_TEST_SECRET_UNAVAILABLE: ${reason}`);
    context.skip(reason);
    throw new Error(reason); // context.skip throws; this keeps the type `never`.
  };

  const setting = capturedTestVaultSetting();
  if (!setting) return unavailable(`no test vault selected; set ${TEST_VAULT_SETTING_NAME}`);
  let vault: Awaited<ReturnType<typeof openVerifiedTestVault>>;
  try {
    vault = await openVerifiedTestVault(setting);
  } catch (error) {
    if (error instanceof SecretVaultError) return unavailable(`test vault unusable: ${error.instructionCode}`);
    throw error;
  }
  try {
    return await readSecretEntry(vault.store, vault.rootKey, vault.metadata, secretId(id));
  } catch (error) {
    if (error instanceof SecretVaultError && error.code === 'NOT_FOUND') return unavailable(`test vault ${vault.location.directory}`);
    throw error;
  } finally {
    vault.close();
  }
};
