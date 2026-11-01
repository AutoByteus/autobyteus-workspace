import { AgentToolsMcpLocalAccessGate } from "../agent-tools/mcp/agent-tools-mcp-local-access.js";
import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import type { SecretManagementService } from "../secret-management/services/secret-management-service.js";
import type { AgentDefinition } from "../agent-definition/domain/models.js";
import type { SkillSourceChangeObserver } from "../skills/domain/skill-source.js";
import { SkillService } from "../skills/services/skill-service.js";
import { SkillSourceService } from "../skills/services/skill-source-service.js";
import { CredentialProxyForwarder } from "./credential-proxy-forwarder.js";
import { CredentialProxyLocalServer } from "./credential-proxy-local-server.js";
import { DeliveryDefinitions } from "./delivery-definitions.js";
import { IntegrationAccessRule } from "./integration-access-rule.js";
import { IntegrationActivityLog } from "./integration-activity-log.js";
import { getIntegrationCatalog, type IntegrationCatalog } from "./integration-catalog.js";
import { integrationsDirectory } from "./integration-connection-service.js";
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
  definitions?: DeliveryDefinitions;
  management?: () => SecretManagementService;
  fetchImpl?: typeof fetch;
  catalog?: Pick<IntegrationCatalog, "entries" | "isSourceRegistered" | "describe"> & SkillSourceChangeObserver;
  agentDefinitions?: Readonly<{ getAgentDefinitionById(id: string): Promise<AgentDefinition | null> }>;
  access?: Pick<IntegrationAccessRule, "grantsForAgent" | "allowsCall">;
  /** Told before a source changes, so a removed source takes its integrations' connections with it (DEC-015). */
  skillSources?: Pick<SkillSourceService, "setSourceChangeObserver"> | null;
}> = {}): CredentialProxyHost => {
  const integrationsDir = input.integrationsDir ?? integrationsDirectory();
  const definitions = input.definitions ?? new DeliveryDefinitions();
  const catalog = input.catalog ?? getIntegrationCatalog();
  const access = input.access ?? new IntegrationAccessRule({
    catalog, definitions, agentDefinitions: input.agentDefinitions ?? AgentDefinitionService.getInstance(),
    skills: SkillService.getInstance(),
  });
  const skillSources = input.skillSources === undefined ? SkillSourceService.getInstance() : input.skillSources;
  skillSources?.setSourceChangeObserver(catalog);
  const passes = new RunPassRegistry();
  const management = input.management ?? (() => getSecretVaultRuntime().requireService());
  const server = new CredentialProxyLocalServer((self) => Object.freeze({
    gate: new AgentToolsMcpLocalAccessGate(),
    passes,
    definitions,
    access,
    catalog,
    management,
    forwarder: new CredentialProxyForwarder(input.fetchImpl),
    activity: new IntegrationActivityLog(integrationsDir),
    proxyBaseUrl: () => self.requireBaseUrl(),
  }));
  const runAccess = new DefaultIntegrationRunAccess({
    access, definitions, passes, proxyBaseUrl: () => server.requireBaseUrl(),
  });
  return Object.freeze({
    runAccess,
    listen: () => server.listen(),
    close: async () => {
      skillSources?.setSourceChangeObserver(null);
      await server.close();
    },
  });
};
