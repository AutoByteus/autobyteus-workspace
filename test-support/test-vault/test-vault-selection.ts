import { TEST_VAULT_SETTING_NAME } from '../../autobyteus-ts/src/secrets/test-vault-setting.js';

const CAPTURED = Symbol.for('autobyteus.test-vault.captured-selection');
type CapturedSelection = { value: string | undefined };
const store = globalThis as typeof globalThis & { [CAPTURED]?: CapturedSelection };

/**
 * Server test setup: moves the selector out of `process.env` before the test
 * file imports anything, so deterministic code never sees it. Live suites
 * reach it only through this module (`capturedTestVaultSetting`). Kept on a
 * process-global slot, so a second test file in the same worker process (whose
 * environment no longer has the variable) keeps the first capture.
 */
export const captureTestVaultSelection = (env: NodeJS.ProcessEnv = process.env): void => {
  if (Object.hasOwn(env, TEST_VAULT_SETTING_NAME)) {
    const value = env[TEST_VAULT_SETTING_NAME]?.trim();
    store[CAPTURED] = { value: value || undefined };
    delete env[TEST_VAULT_SETTING_NAME];
  }
};

/** The captured selector, for live opt-ins only (`initializeLiveServerVault`, `startBuiltTestServer`). */
export const capturedTestVaultSetting = (): string | undefined => store[CAPTURED]?.value;
