import type { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { SecretDefinitionId } from '../../domain/secret-binding.js';
import { defaultSecretCatalog, type SecretCatalog } from '../../catalog/secret-catalog.js';
import { SecretStorageError } from '../../domain/secret-storage-types.js';
import { LocalWritableSecretStorageBackend } from './local-secret-storage-backend.js';

export type LocalProvisioningStatus = {
  definitionId: SecretDefinitionId;
  storageState: 'CONFIGURED';
};

export class LocalSecretStoreProvisioningService {
  constructor(
    private readonly target: LocalWritableSecretStorageBackend,
    private readonly catalog: SecretCatalog = defaultSecretCatalog,
  ) {}

  async provisionExact(
    definitionId: SecretDefinitionId,
    value: SecretValue,
  ): Promise<LocalProvisioningStatus> {
    if (!this.catalog.isKnownDefinition(definitionId)) {
      throw new SecretStorageError('ACCESS_DENIED', false, 'SECRET_DEFINITION_NOT_PROVISIONABLE');
    }
    await this.target.save(definitionId, value);
    await this.target.checkpoint();
    await this.target.close();
    return { definitionId, storageState: 'CONFIGURED' };
  }
}
