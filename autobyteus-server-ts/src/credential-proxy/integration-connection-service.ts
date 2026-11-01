import path from "node:path";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import type { SecretManagementService } from "../secret-management/services/secret-management-service.js";
import type { IntegrationId } from "../secret-management/domain/secret-id.js";
import { IntegrationConnectionStore, type IntegrationConnectionRecord } from "./integration-connection-store.js";
import { DeliveryDefinitions, type DeliveryDefinition } from "./delivery-definitions.js";

/** One integration's connection on this node. Never carries the token. */
export type IntegrationConnectionStatus = Readonly<{
  connected: boolean;
  login: string | null;
  connectedAt: string | null;
}>;

export type IntegrationConnectionErrorCode =
  | "TOKEN_REJECTED"
  | "TOKEN_CHECK_FAILED"
  | "INTEGRATION_NOT_CONNECTED"
  | "INTEGRATION_NOT_DELIVERABLE"
  | "VAULT_UNAVAILABLE";

const MESSAGES: Readonly<Record<IntegrationConnectionErrorCode, string>> = Object.freeze({
  TOKEN_REJECTED: "The service rejected the token.",
  TOKEN_CHECK_FAILED: "The token could not be checked with the service. Try again.",
  INTEGRATION_NOT_CONNECTED: "This integration is not connected on this node.",
  INTEGRATION_NOT_DELIVERABLE: "This version of AutoByteus can't connect this integration.",
  VAULT_UNAVAILABLE: "The secret vault is unavailable.",
});

/** A connection failure with a code; never carries the token. */
export class IntegrationConnectionError extends Error {
  constructor(readonly code: IntegrationConnectionErrorCode) {
    super(`${code}: ${MESSAGES[code]}`);
    this.name = "IntegrationConnectionError";
  }
}

const NOT_CONNECTED: IntegrationConnectionStatus = Object.freeze({ connected: false, login: null, connectedAt: null });

/**
 * Connect, test and disconnect, per integration (DS-003). The only writer of an integration's vault entry and of
 * `connections.json`. A token is checked with the service (its delivery definition's `verifyToken`) before it is
 * stored. Only an integration this app can deliver (one with a delivery definition) can be connected.
 */
export class IntegrationConnectionService {
  constructor(private readonly deps: Readonly<{
    store: IntegrationConnectionStore;
    definitions: DeliveryDefinitions;
    management: () => SecretManagementService;
    fetchImpl?: typeof fetch;
  }>) {}

  /** The connection state; an integration without a delivery definition, or without a stored token, is not connected. */
  async status(integrationId: string): Promise<IntegrationConnectionStatus> {
    const definition = this.deps.definitions.get(integrationId);
    if (!definition) return NOT_CONNECTED;
    const record = this.deps.store.read(integrationId);
    return this.toStatus(record, record.login !== null && (await this.tokenStored(definition.id)));
  }

  /** Checks the token with the service, then stores it and the login. A rejected token stores nothing. */
  async connect(integrationId: string, token: SecretValue): Promise<IntegrationConnectionStatus> {
    const definition = this.requireDefinition(integrationId);
    const login = await this.checkToken(definition, token);
    try {
      await this.deps.management().saveForConsumer({ consumer: { kind: "integration", integrationId: definition.id }, value: token });
    } catch (error) {
      throw this.vaultError(error);
    }
    const record = await this.deps.store.update(definition.id, () => ({ login, connectedAt: new Date().toISOString() }));
    return this.toStatus(record, true);
  }

  /** Checks the stored token again and refreshes the login. */
  async test(integrationId: string): Promise<IntegrationConnectionStatus> {
    const definition = this.requireDefinition(integrationId);
    let token: SecretValue;
    try {
      token = await this.deps.management().resolveForUse({ kind: "integration", integrationId: definition.id });
    } catch (error) {
      if (error instanceof SecretVaultError && error.code === "NOT_FOUND") throw new IntegrationConnectionError("INTEGRATION_NOT_CONNECTED");
      throw this.vaultError(error);
    }
    const login = await this.checkToken(definition, token);
    const record = await this.deps.store.update(definition.id, (current) => ({ ...current, login }));
    return this.toStatus(record, true);
  }

  /** Removes the token and the login (idempotent). */
  async disconnect(integrationId: string): Promise<IntegrationConnectionStatus> {
    const definition = this.requireDefinition(integrationId);
    try {
      await this.deps.management().removeForConsumer({ kind: "integration", integrationId: definition.id });
    } catch (error) {
      throw this.vaultError(error);
    }
    const record = await this.deps.store.update(definition.id, () => ({ login: null, connectedAt: null }));
    return this.toStatus(record, false);
  }

  private requireDefinition(integrationId: string): DeliveryDefinition {
    const definition = this.deps.definitions.get(integrationId);
    if (!definition) throw new IntegrationConnectionError("INTEGRATION_NOT_DELIVERABLE");
    return definition;
  }

  private async checkToken(definition: DeliveryDefinition, token: SecretValue): Promise<string> {
    const check = await definition.verifyToken(token, this.deps.fetchImpl ?? fetch);
    if (check.status === "rejected") throw new IntegrationConnectionError("TOKEN_REJECTED");
    if (check.status !== "accepted") throw new IntegrationConnectionError("TOKEN_CHECK_FAILED");
    return check.login;
  }

  private async tokenStored(integrationId: IntegrationId): Promise<boolean> {
    try {
      return (await this.deps.management().getStatusForConsumer({ kind: "integration", integrationId })) === "CONFIGURED";
    } catch {
      return false;
    }
  }

  private vaultError(error: unknown): Error {
    return error instanceof SecretVaultError ? new IntegrationConnectionError("VAULT_UNAVAILABLE") : error as Error;
  }

  private toStatus(record: IntegrationConnectionRecord, connected: boolean): IntegrationConnectionStatus {
    return Object.freeze({
      connected,
      login: connected ? record.login : null,
      connectedAt: connected ? record.connectedAt : null,
    });
  }
}

/** `<appDataDir>/integrations`: the connections file and the activity log. */
export const integrationsDirectory = (appDataDir: string = appConfigProvider.config.getAppDataDir()): string =>
  path.join(appDataDir, "integrations");

let service: IntegrationConnectionService | null = null;

/** The node's connection service, over its own app data dir and vault runtime (looked up per call). */
export const getIntegrationConnectionService = (): IntegrationConnectionService => {
  service ??= new IntegrationConnectionService({
    store: new IntegrationConnectionStore(integrationsDirectory()),
    definitions: new DeliveryDefinitions(),
    management: () => getSecretVaultRuntime().requireService(),
  });
  return service;
};
