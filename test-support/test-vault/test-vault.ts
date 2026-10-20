/*
 * Test-vault policy for test setups and live tests (server-free).
 *
 * The runtime-touching piece, `live-server-vault.ts` (in-process server live
 * suites: vault runtime, Prisma), is a separate module loaded only by live
 * opt-ins. autobyteus-ts clients read the test vault themselves
 * (`AUTOBYTEUS_TEST_VAULT`, see autobyteus-ts `secrets/provider-api-key-resolver.ts`).
 */
export {
  CREDENTIAL_ENVIRONMENT_NAME,
  isCredentialEnvironmentName,
  stripCredentialEnvironment,
} from './credential-environment.js';
export {
  captureTestVaultSelection,
  capturedTestVaultSetting,
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
