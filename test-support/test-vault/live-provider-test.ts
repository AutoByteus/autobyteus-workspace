import { describe, it, type TestContext } from 'vitest';
import { classifyProviderAccessError } from './provider-access-classification.js';
import { TEST_VAULT_SETTING_NAME } from '../../autobyteus-ts/src/secrets/test-vault-setting.js';

/*
 * Live provider test policy (gate, reasoned skip, strict mode). The default
 * autobyteus-ts suite loads this module through every live test file, so it
 * must stay free of server code: no vault, runtime or Prisma import.
 */

export const LIVE_PROVIDER_TESTS_GATE = 'RUN_LIVE_PROVIDER_TESTS';
export const LIVE_STRICT_GATE = 'AUTOBYTEUS_LIVE_STRICT';

export type LiveTestBody = (context: TestContext) => Promise<void> | void;

export type LiveProviderTest = Readonly<{
  /** True when the run opted in to paid provider calls (`RUN_LIVE_PROVIDER_TESTS=1`). */
  enabled: boolean;
  describe: typeof describe;
  /**
   * A live test. A missing credential or a classified provider refusal is
   * reported as a skip with its reason, never as a pass; with
   * `AUTOBYTEUS_LIVE_STRICT=1` it fails instead.
   */
  it(name: string, body: LiveTestBody, timeout?: number): void;
}>;

/*
 * Classification is by `kind` and `code`, never `instanceof`: server code and
 * tests may load different copies of autobyteus-ts (dist and src).
 */
const isMissingApiKeyError = (error: unknown): error is Error =>
  error instanceof Error && (error as { kind?: unknown }).kind === 'missing_api_key';

/** A test-vault or vault-format failure (missing or unusable vault, unknown provider): a real failure. */
const isVaultError = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string'
    && (code.startsWith('TEST_VAULT_') || ['PROVIDER_UNKNOWN', 'CORRUPT_VAULT', 'VAULT_UNAVAILABLE', 'VAULT_LOCKED', 'INCOMPATIBLE_FORMAT'].includes(code));
};

/** The reason a live test could not exercise its provider, or `null` for a real failure. */
export const liveUnavailableReason = (provider: string, error: unknown): string | null => {
  if (isMissingApiKeyError(error)) return error.message;
  if (isVaultError(error)) return null;
  const refusal = classifyProviderAccessError(error);
  return refusal ? `provider refused ${provider}: ${refusal}` : null;
};

const reportUnavailable = (
  context: TestContext,
  reason: string,
  strict: boolean,
  cause?: unknown,
): never => {
  console.warn(`[live provider skip] ${reason}`);
  if (strict) throw new Error(`LIVE_PROVIDER_UNAVAILABLE: ${reason}`, { cause });
  return context.skip(reason);
};

/**
 * Live tests for one provider. They run only with the gate; keys come from
 * the test vault that `AUTOBYTEUS_TEST_VAULT` selects (the test setup installs
 * it as the default key source).
 */
export const liveProviderTest = (
  provider: string,
  env: NodeJS.ProcessEnv = process.env,
): LiveProviderTest => {
  const enabled = env[LIVE_PROVIDER_TESTS_GATE] === '1';
  const strict = env[LIVE_STRICT_GATE] === '1';
  const selected = Boolean(env[TEST_VAULT_SETTING_NAME]?.trim());
  return Object.freeze({
    enabled,
    describe: enabled ? describe : describe.skip,
    it: (name: string, body: LiveTestBody, timeout?: number) => {
      (enabled ? it : it.skip)(name, async (context) => {
        if (!selected) {
          reportUnavailable(
            context,
            `no test vault selected for ${provider}: set ${TEST_VAULT_SETTING_NAME} (TESTING.md#test-vault)`,
            strict,
          );
        }
        try {
          await body(context);
        } catch (error) {
          const reason = liveUnavailableReason(provider, error);
          if (!reason) throw error;
          reportUnavailable(context, reason, strict, error);
        }
      }, timeout);
    },
  });
};
