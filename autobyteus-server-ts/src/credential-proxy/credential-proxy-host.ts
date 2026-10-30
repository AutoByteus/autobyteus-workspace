import { AgentToolsMcpLocalAccessGate } from "../agent-tools/mcp/agent-tools-mcp-local-access.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import type { SecretManagementService } from "../secret-management/services/secret-management-service.js";
import { CredentialProxyForwarder } from "./credential-proxy-forwarder.js";
import { CredentialProxyLocalServer } from "./credential-proxy-local-server.js";
import { IntegrationActivityLog } from "./integration-activity-log.js";
import { IntegrationConnectionStore } from "./integration-connection-store.js";
import { integrationsDirectory } from "./integration-connection-service.js";
import { IntegrationDefinitions } from "./integration-definitions.js";
import { DefaultIntegrationRunAccess, type IntegrationRunAccess } from "./integration-run-access.js";
import { RunPassRegistry } from "./run-pass-registry.js";

/** The credential proxy as the studio server composes it: the run access for backends, and the listener lifecycle. */
export interface CredentialProxyHost {
  readonly runAccess: IntegrationRunAccess;
  listen(): Promise<void>;
  close(): Promise<void>;
}

export const createCredentialProxyHost = (input: Readonly<{
  integrationsDir?: string;
  definitions?: IntegrationDefinitions;
  management?: () => SecretManagementService;
  fetchImpl?: typeof fetch;
}> = {}): CredentialProxyHost => {
  const integrationsDir = input.integrationsDir ?? integrationsDirectory();
  const store = new IntegrationConnectionStore(integrationsDir);
  const definitions = input.definitions ?? new IntegrationDefinitions();
  const passes = new RunPassRegistry();
  const management = input.management ?? (() => getSecretVaultRuntime().requireService());
  const server = new CredentialProxyLocalServer((self) => Object.freeze({
    gate: new AgentToolsMcpLocalAccessGate(),
    passes,
    store,
    definitions,
    management,
    forwarder: new CredentialProxyForwarder(input.fetchImpl),
    activity: new IntegrationActivityLog(integrationsDir),
    proxyBaseUrl: () => self.requireBaseUrl(),
  }));
  const runAccess = new DefaultIntegrationRunAccess({
    store, definitions, passes, proxyBaseUrl: () => server.requireBaseUrl(),
  });
  return Object.freeze({
    runAccess,
    listen: () => server.listen(),
    close: () => server.close(),
  });
};
