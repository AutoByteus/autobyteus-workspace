import path from "node:path";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import type { SecretManagementService } from "../secret-management/services/secret-management-service.js";
import type { IntegrationId } from "../secret-management/domain/secret-id.js";
import { IntegrationConnectionStore, type IntegrationConnectionRecord } from "./integration-connection-store.js";
import { IntegrationDefinitions } from "./integration-definitions.js";

export type IntegrationConnectionStatus = Readonly<{
  connected: boolean;
  login: string | null;
  connectedAt: string | null;
  agentDefinitionIds: readonly string[];
}>;

export type IntegrationConnectionErrorCode =
  | "TOKEN_REJECTED"
  | "TOKEN_CHECK_FAILED"
  | "INTEGRATION_NOT_CONNECTED"
  | "VAULT_UNAVAILABLE";

const MESSAGES: Readonly<Record<IntegrationConnectionErrorCode, string>> = Object.freeze({
  TOKEN_REJECTED: "GitHub rejected the token.",
  TOKEN_CHECK_FAILED: "The token could not be checked with GitHub. Try again.",
  INTEGRATION_NOT_CONNECTED: "GitHub is not connected on this node.",
  VAULT_UNAVAILABLE: "The secret vault is unavailable.",
});

/** A connection failure with a code; never carries the token. */
export class IntegrationConnectionError extends Error {
  constructor(readonly code: IntegrationConnectionErrorCode) {
    super(`${code}: ${MESSAGES[code]}`);
    this.name = "IntegrationConnectionError";
  }
}

const GITHUB: IntegrationId = "github";

/**
 * Connect, test, disconnect and agent access for an integration (DS-001). The only writer of the integration's vault
 * entry and of `connections.json`. A token is checked with GitHub (`GET /user`, `Bearer`) before it is stored.
 */
export class IntegrationConnectionService {
  constructor(private readonly deps: Readonly<{
    store: IntegrationConnectionStore;
    definitions: IntegrationDefinitions;
    management: () => SecretManagementService;
    fetchImpl?: typeof fetch;
  }>) {}

  async status(): Promise<IntegrationConnectionStatus> {
    const record = this.deps.store.read(GITHUB);
    return this.toStatus(record, record.login !== null && (await this.tokenStored()));
  }

  /** Checks the token with GitHub, then stores it and the login. A rejected token stores nothing. */
  async connect(token: SecretValue): Promise<IntegrationConnectionStatus> {
    const login = await this.checkToken(token);
    try {
      await this.deps.management().saveForConsumer({ consumer: { kind: "integration", integrationId: GITHUB }, value: token });
    } catch (error) {
      throw this.vaultError(error);
    }
    const record = await this.deps.store.update(GITHUB, (current) => ({
      ...current, login, connectedAt: new Date().toISOString(),
    }));
    return this.toStatus(record, true);
  }

  /** Checks the stored token again and refreshes the login. */
  async test(): Promise<IntegrationConnectionStatus> {
    let token: SecretValue;
    try {
      token = await this.deps.management().resolveForUse({ kind: "integration", integrationId: GITHUB });
    } catch (error) {
      if (error instanceof SecretVaultError && error.code === "NOT_FOUND") throw new IntegrationConnectionError("INTEGRATION_NOT_CONNECTED");
      throw this.vaultError(error);
    }
    const login = await this.checkToken(token);
    const record = await this.deps.store.update(GITHUB, (current) => ({ ...current, login }));
    return this.toStatus(record, true);
  }

  /** Removes the token; the agent ticks stay, so reconnecting keeps them. */
  async disconnect(): Promise<IntegrationConnectionStatus> {
    try {
      await this.deps.management().removeForConsumer({ kind: "integration", integrationId: GITHUB });
    } catch (error) {
      throw this.vaultError(error);
    }
    const record = await this.deps.store.update(GITHUB, (current) => ({ ...current, login: null, connectedAt: null }));
    return this.toStatus(record, false);
  }

  /** The agents allowed to use GitHub. Unticking applies to the next call; ticking to the agent's next run. */
  async setAgentAccess(agentDefinitionIds: readonly string[]): Promise<IntegrationConnectionStatus> {
    const ids = [...new Set(agentDefinitionIds.map((id) => id.trim()).filter(Boolean))];
    const record = await this.deps.store.update(GITHUB, (current) => ({ ...current, agentDefinitionIds: ids }));
    return this.toStatus(record, record.login !== null && (await this.tokenStored()));
  }

  private async checkToken(token: SecretValue): Promise<string> {
    const route = this.deps.definitions.route(GITHUB, "api");
    if (!route) throw new Error("The GitHub definition has no 'api' route.");
    let response: Response;
    try {
      response = await (this.deps.fetchImpl ?? fetch)(new URL("/user", route.origin), {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token.revealToTrustedConsumer()}`,
          "user-agent": "AutoByteus",
        },
        redirect: "manual",
      });
    } catch {
      throw new IntegrationConnectionError("TOKEN_CHECK_FAILED");
    }
    if (response.status === 401) throw new IntegrationConnectionError("TOKEN_REJECTED");
    if (!response.ok) throw new IntegrationConnectionError("TOKEN_CHECK_FAILED");
    const login = ((await response.json().catch(() => null)) as { login?: unknown } | null)?.login;
    if (typeof login !== "string" || !login) throw new IntegrationConnectionError("TOKEN_CHECK_FAILED");
    return login;
  }

  private async tokenStored(): Promise<boolean> {
    try {
      return (await this.deps.management().getStatusForConsumer({ kind: "integration", integrationId: GITHUB })) === "CONFIGURED";
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
      agentDefinitionIds: record.agentDefinitionIds,
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
    definitions: new IntegrationDefinitions(),
    management: () => getSecretVaultRuntime().requireService(),
  });
  return service;
};
