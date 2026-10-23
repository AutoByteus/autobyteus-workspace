/**
 * The port through which a migration removes a stored secret. The registry passes the live secret vault, so the vault
 * stays the only writer of secrets; the migration knows only this shape.
 */
export type SecretRemovalOwner = {
  removeForConsumer(consumer: {
    kind: 'llm';
    providerId: string;
    credentialSlot: 'apiKey';
  }): Promise<void>;
};
