// Default tests are credential-free: inherited credential variables are
// deleted before any test file loads. Only a live run (the test-vault
// selector plus RUN_LIVE_PROVIDER_TESTS=1) installs the test vault as the
// default key source; its server-side reader is loaded lazily, so the default
// suite never loads server vault code.
import { stripCredentialEnvironment } from '../../test-support/test-vault/credential-environment.js';
import { LIVE_PROVIDER_TESTS_GATE } from '../../test-support/test-vault/live-provider-test.js';
import { TEST_VAULT_SETTING_NAME } from '../../test-support/test-vault/test-vault-selection.js';

process.env.APP_ENV = 'test';
stripCredentialEnvironment();

const testVaultSetting = process.env[TEST_VAULT_SETTING_NAME]?.trim();
if (testVaultSetting && process.env[LIVE_PROVIDER_TESTS_GATE] === '1') {
  const { installTestVaultDefaultResolver } = await import(
    '../../test-support/test-vault/test-vault-default-resolver.js'
  );
  await installTestVaultDefaultResolver(testVaultSetting);
}
