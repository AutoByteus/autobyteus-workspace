// Default tests are credential-free: inherited credential variables are
// deleted before any test file loads. The test-vault selector stays only for a
// live run (RUN_LIVE_PROVIDER_TESTS=1): spending money is the gate's decision.
// With it, clients built without a resolver read the test vault themselves
// (autobyteus-ts `secrets/provider-api-key-resolver.ts`); no setup code is needed.
import { stripCredentialEnvironment } from '../../test-support/test-vault/credential-environment.js';
import { LIVE_PROVIDER_TESTS_GATE } from '../../test-support/test-vault/live-provider-test.js';
import { TEST_VAULT_SETTING_NAME } from '../src/secrets/test-vault-setting.js';

process.env.APP_ENV = 'test';
stripCredentialEnvironment();
if (process.env[LIVE_PROVIDER_TESTS_GATE] !== '1') delete process.env[TEST_VAULT_SETTING_NAME];
