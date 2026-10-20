import { MissingApiKeyError } from "../provider-api-key-error.js";
import type { ProviderApiKeyResolver, ProviderApiKeySlot } from "../provider-api-key-resolver.js";
import type { SecretValue } from "../secret-value.js";
import { openTestVaultReader, type TestVaultReader } from "./open-test-vault.js";
import { providerSecretId } from "./provider-secret-id.js";
import { SecretVaultError } from "./secret-vault-types.js";
import { TEST_VAULT_SETUP_COMMAND } from "./test-vault-location.js";

/** A key the test vault does not hold, named by its secret ID and the vault directory. */
export class TestVaultMissingCapabilityError extends MissingApiKeyError {
  constructor(providerId: string, secretId: string, directory: string) {
    super(providerId);
    this.message = `missing capability ${secretId} for ${providerId} (test vault ${directory}); `
      + `add it with ${TEST_VAULT_SETUP_COMMAND}`;
  }
}

/**
 * Resolves provider keys from the read-only test vault. A provider without a
 * vault entry name fails with `SECRET_PROVIDER_UNKNOWN` (naming provider and
 * slot); a key the vault does not hold fails with `TestVaultMissingCapabilityError`.
 */
export class TestVaultProviderApiKeyResolver implements ProviderApiKeyResolver {
  constructor(private readonly reader: TestVaultReader) {}

  async resolve(providerId: string, slot: ProviderApiKeySlot = "apiKey"): Promise<SecretValue> {
    const id = providerSecretId(providerId, slot);
    try {
      return await this.reader.readProviderApiKey(providerId, slot);
    } catch (error) {
      if (error instanceof SecretVaultError && error.code === "NOT_FOUND") {
        throw new TestVaultMissingCapabilityError(providerId, String(id), this.reader.location.directory);
      }
      throw error;
    }
  }

  close(): void {
    this.reader.close();
  }
}

export const openTestVaultProviderApiKeyResolver = async (
  directory: string,
): Promise<TestVaultProviderApiKeyResolver> =>
  new TestVaultProviderApiKeyResolver(await openTestVaultReader(directory));
