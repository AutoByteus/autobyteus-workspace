/*
 * Test-vault policy for test setups and live tests (server-free).
 *
 * Runtime-touching pieces live in their own modules and are loaded only by
 * live opt-ins:
 * - `live-server-vault.ts`: in-process server live suites (vault runtime, Prisma);
 * - `test-vault-default-resolver.ts`: the autobyteus-ts default key source, which
 *   autobyteus-ts setup imports lazily, only with the selector and the live gate.
 */
export {
  CREDENTIAL_ENVIRONMENT_NAME,
  isCredentialEnvironmentName,
  stripCredentialEnvironment,
} from './credential-environment.js';
export {
  captureTestVaultSelection,
  capturedTestVaultSetting,
  TEST_VAULT_SETTING_NAME,
} from './test-vault-selection.js';
export {
  LIVE_PROVIDER_TESTS_GATE,
  LIVE_STRICT_GATE,
  liveProviderTest,
  liveUnavailableReason,
  type LiveProviderTest,
  type LiveTestBody,
} from './live-provider-test.js';
export {
  classifyProviderAccessError,
  type ProviderAccessRefusal,
} from './provider-access-classification.js';
