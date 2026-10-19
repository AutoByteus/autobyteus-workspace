import { MissingApiKeyError } from '../../autobyteus-ts/src/secrets/provider-api-key-error.js';
import {
  setDefaultProviderApiKeyResolver,
  type ProviderApiKeyResolver,
  type ProviderApiKeySlot,
} from '../../autobyteus-ts/src/secrets/provider-api-key-resolver.js';
import { providerCredentialCatalog } from '../../autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.js';
import { SecretManagementProviderApiKeyResolver } from '../../autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.js';
import { openReadOnlyTestVault } from '../../autobyteus-server-ts/src/secret-management/test-vault/read-only-test-vault.js';
import { TEST_VAULT_SETUP_COMMAND } from '../../autobyteus-server-ts/src/secret-management/test-vault/test-vault-location.js';

/*
 * The autobyteus-ts default key source for live runs. autobyteus-ts test setup
 * imports this module lazily, only with the selector and the live gate set.
 * It opens the test vault read-only through the Prisma-free entry; it must
 * never load the vault runtime, Prisma, migrations or the importer.
 */

/** A missing key, named by its secret ID and the vault it was looked up in. */
export class TestVaultMissingCapabilityError extends MissingApiKeyError {
  constructor(providerId: string, secretId: string, directory: string) {
    super(providerId);
    this.message = `missing capability ${secretId} for ${providerId} (test vault ${directory}); `
      + `add it with ${TEST_VAULT_SETUP_COMMAND}`;
  }
}

/** By its `kind`: the server resolver may throw a `MissingApiKeyError` from another module copy (dist). */
const isMissingApiKeyError = (error: unknown): boolean =>
  error instanceof Error && (error as { kind?: unknown }).kind === 'missing_api_key';

const secretIdFor = (providerId: string, slot: ProviderApiKeySlot): string => {
  try {
    return String(providerCredentialCatalog.resolve({ kind: 'llm', providerId, credentialSlot: slot }));
  } catch {
    return `${providerId}:${slot}`;
  }
};

/**
 * Opens the test vault in `directory` and installs it as the process default
 * resolver, so `new XLLM(model, config)` and `LLMFactory.createLLM(id)` use it
 * without a resolver argument. Throws when the vault cannot be opened.
 */
export const installTestVaultDefaultResolver = async (directory: string): Promise<void> => {
  const vault = await openReadOnlyTestVault(directory);
  const resolver = new SecretManagementProviderApiKeyResolver({ kind: 'llm' }, () => vault.service);
  const defaultResolver: ProviderApiKeyResolver = {
    async resolve(providerId, slot = 'apiKey') {
      try {
        return await resolver.resolve(providerId, slot);
      } catch (error) {
        if (isMissingApiKeyError(error)) {
          throw new TestVaultMissingCapabilityError(
            providerId,
            secretIdFor(providerId, slot),
            vault.location.directory,
          );
        }
        throw error;
      }
    },
  };
  setDefaultProviderApiKeyResolver(defaultResolver);
};
