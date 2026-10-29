import { MissingApiKeyError } from './provider-api-key-error.js';
import type { SecretValue } from './secret-value.js';
import { TEST_VAULT_SETTING_NAME } from './test-vault-setting.js';

export type ProviderApiKeySlot =
  | 'apiKey'
  | 'geminiAiStudioApiKey'
  | 'geminiVertexExpressApiKey';

/** Storage-neutral point-of-use capability injected into provider clients. */
export interface ProviderApiKeyResolver {
  resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue>;
}

type ClosableProviderApiKeyResolver = ProviderApiKeyResolver & { close(): void };

/*
 * The environment default: for a client built without a resolver, the key comes
 * from the test vault that `AUTOBYTEUS_TEST_VAULT` names, read-only, the way an
 * ORM reads `DATABASE_URL`. The vault modules (and `node:sqlite`) load only
 * when the variable is set and a key is needed; each vault is opened once per
 * process. Applications that own a vault (the AutoByteus server) turn this off
 * with `disableEnvironmentProviderApiKeySource()` and always pass a resolver.
 */
let environmentSourceEnabled = true;
const environmentVaults = new Map<string, Promise<ClosableProviderApiKeyResolver>>();
let closeOnExitRegistered = false;

const closeEnvironmentVaults = (): void => {
  for (const opened of environmentVaults.values()) {
    void opened.then((resolver) => resolver.close(), () => undefined);
  }
  environmentVaults.clear();
};

const environmentVaultResolver = (directory: string): Promise<ClosableProviderApiKeyResolver> => {
  let opened = environmentVaults.get(directory);
  if (!opened) {
    opened = import('./vault/test-vault-provider-api-key-resolver.js')
      .then(({ openTestVaultProviderApiKeyResolver }) => openTestVaultProviderApiKeyResolver(directory));
    environmentVaults.set(directory, opened);
    // A vault that could not be opened is not cached: the next lookup tries again.
    opened.catch(() => environmentVaults.delete(directory));
    if (!closeOnExitRegistered) {
      closeOnExitRegistered = true;
      process.once('exit', closeEnvironmentVaults);
    }
  }
  return opened;
};

/**
 * A vault that could not be opened, reported for one provider: same name,
 * `code` and `instructionCode` (callers classify by code), message naming the
 * provider, the original as `cause`.
 */
const namingProvider = (error: unknown, providerId: string): unknown => {
  if (!(error instanceof Error)) return error;
  const named = new Error(`${error.message} (key for ${providerId})`, { cause: error });
  named.name = error.name;
  const { code, instructionCode } = error as { code?: unknown; instructionCode?: unknown };
  return Object.assign(named, { code, instructionCode });
};

/** Turns the environment default off for this process and closes any vault it opened. */
export const disableEnvironmentProviderApiKeySource = (): void => {
  environmentSourceEnabled = false;
  closeEnvironmentVaults();
};

const environmentProviderApiKeyResolver: ProviderApiKeyResolver = Object.freeze({
  async resolve(providerId: string, slot?: ProviderApiKeySlot): Promise<SecretValue> {
    const directory = environmentSourceEnabled ? process.env[TEST_VAULT_SETTING_NAME]?.trim() : undefined;
    if (!directory) throw new MissingApiKeyError(providerId);
    let resolver: ClosableProviderApiKeyResolver;
    try {
      resolver = await environmentVaultResolver(directory);
    } catch (error) {
      throw namingProvider(error, providerId);
    }
    return resolver.resolve(providerId, slot);
  },
});

/**
 * The resolver a client uses: the one it was given, else the environment
 * default (the test vault named by `AUTOBYTEUS_TEST_VAULT`, looked up when a
 * key is needed). With neither, resolution fails with `MissingApiKeyError`.
 */
export const resolveProviderApiKeyResolver = (
  explicit?: ProviderApiKeyResolver,
): ProviderApiKeyResolver => explicit ?? environmentProviderApiKeyResolver;
