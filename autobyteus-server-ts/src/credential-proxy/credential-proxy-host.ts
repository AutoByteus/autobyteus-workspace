import { AgentToolsMcpLocalAccessGate } from "../agent-tools/mcp/agent-tools-mcp-local-access.js";
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
import {
  DefaultProviderRelayAccess,
  ProviderCallObservers,
  type ProviderRelayAccess,
} from "./provider-relays/provider-relay-access.js";
import { ProviderRelays } from "./provider-relays/provider-relays.js";
import { ProviderRelayPeerForwarder } from "./provider-relays/provider-relay-peer-forwarder.js";
import {
  relayedNodeSettings,
  relayLoginTokensEnabled,
  type RelayedNodeSettings,
} from "./provider-relays/provider-relay-settings.js";
import { ProviderRelayPeerHandler } from "./provider-relay-peer/provider-relay-peer-handler.js";
import { ProviderRelayActivityLog } from "./provider-relay-peer/provider-relay-activity-log.js";
import { RelayLoginTokenReader } from "./provider-relay-peer/relay-login-token-reader.js";
import { readRelayOffer } from "./provider-relay-peer/relay-offer.js";
import type { PeerRelayClient } from "../remote-collaboration/channel/peer-relay-client.js";
import { appConfigProvider } from "../config/app-config-provider.js";
import { RunPassRegistry } from "./run-pass-registry.js";
import { RegistryRunPassRevocation, type RunPassRevocation } from "./run-pass-revocation.js";

/**
 * The credential proxy as the studio server composes it: the integration access and the provider relay access for
 * backends, the end of a run's pass for the run managers, and the listener lifecycle.
 */
export interface CredentialProxyHost {
  readonly runAccess: IntegrationRunAccess;
  readonly providerRelayAccess: ProviderRelayAccess;
  /** The relay node's side of relayed calls from peers (C4), behind `/rest/remote/provider-relays`. */
  readonly providerRelayPeerHandler: ProviderRelayPeerHandler;
  /** C1's relay lists this node offers a node it starts now (a sandbox, DEC-109). */
  relayOffer(): Promise<Readonly<Record<string, string>>>;
  readonly runPasses: RunPassRevocation;
  listen(): Promise<void>;
  close(): Promise<void>;
}

type AgentDefinitionLookup = Readonly<{ getAgentDefinitionById(id: string): Promise<AgentDefinition | null> }>;

/** The access rule is built from the composition's agent definitions, or given whole (tests). */
type AccessInput =
  | Readonly<{ agentDefinitions: AgentDefinitionLookup; access?: undefined }>
  | Readonly<{ access: Pick<IntegrationAccessRule, "grantsForAgent" | "allowsCall">; agentDefinitions?: undefined }>;

export const createCredentialProxyHost = (input: AccessInput & Readonly<{
  integrationsDir?: string;
  definitions?: DeliveryDefinitions;
  management?: () => SecretManagementService;
  fetchImpl?: typeof fetch;
  catalog?: Pick<IntegrationCatalog, "entries" | "isSourceRegistered" | "describe"> & SkillSourceChangeObserver;
  relays?: ProviderRelays;
  /** Told before a source changes, so a removed source takes its integrations' connections with it (DEC-015). */
  skillSources?: Pick<SkillSourceService, "setSourceChangeObserver"> | null;
  /** C1 of this node; read from the settings by default. */
  relayed?: RelayedNodeSettings | null;
  /** The remote collaboration's relay client, read on use (it is composed later, FU-011); needed on a relayed node. */
  peerRelayClient: () => Pick<PeerRelayClient, "relay">;
  /** Where the relay node keeps its activity log (C5); the app data folder by default. */
  appDataDir?: string;
  logins?: Pick<RelayLoginTokenReader, "readGrokLogin">;
  loginTokensEnabled?: () => boolean;
}>): CredentialProxyHost => {
  const integrationsDir = input.integrationsDir ?? integrationsDirectory();
  const definitions = input.definitions ?? new DeliveryDefinitions();
  const catalog = input.catalog ?? getIntegrationCatalog();
  const access = input.access ?? new IntegrationAccessRule({
    catalog, definitions, agentDefinitions: input.agentDefinitions, skills: SkillService.getInstance(),
  });
  const skillSources = input.skillSources === undefined ? SkillSourceService.getInstance() : input.skillSources;
  skillSources?.setSourceChangeObserver(catalog);
  const passes = new RunPassRegistry();
  const relays = input.relays ?? new ProviderRelays();
  const observers = new ProviderCallObservers();
  const management = input.management ?? (() => getSecretVaultRuntime().requireService());
  const relayed = input.relayed === undefined ? relayedNodeSettings() : input.relayed;
  const forwarder = new CredentialProxyForwarder(input.fetchImpl);
  const peerForwarder = relayed
    ? new ProviderRelayPeerForwarder({ relayNodeId: relayed.relayPeerNodeId, client: input.peerRelayClient })
    : null;
  const server = new CredentialProxyLocalServer((self) => {
    const gate = new AgentToolsMcpLocalAccessGate();
    const proxyBaseUrl = () => self.requireBaseUrl();
    return Object.freeze({
      integrations: Object.freeze({
        gate, passes, definitions, access, catalog, management, forwarder, proxyBaseUrl,
        activity: new IntegrationActivityLog(integrationsDir),
      }),
      relays: Object.freeze({ gate, passes, relays, observers, management, forwarder, proxyBaseUrl, peerForwarder }),
    });
  });
  const proxyBaseUrl = () => server.requireBaseUrl();
  const runAccess = new DefaultIntegrationRunAccess({ access, definitions, passes, catalog, proxyBaseUrl });
  const providerRelayAccess = new DefaultProviderRelayAccess({ relayed, relays, passes, observers, management, proxyBaseUrl });
  const logins = input.logins ?? new RelayLoginTokenReader();
  const loginTokensEnabled = input.loginTokensEnabled ?? relayLoginTokensEnabled;
  const providerRelayPeerHandler = new ProviderRelayPeerHandler({
    relays,
    forwarder,
    management,
    logins,
    activity: new ProviderRelayActivityLog(input.appDataDir ?? appConfigProvider.config.getAppDataDir()),
    loginTokensEnabled,
  });
  return Object.freeze({
    runAccess,
    providerRelayAccess,
    providerRelayPeerHandler,
    relayOffer: () => readRelayOffer({ relays, management, logins, loginTokensEnabled }),
    runPasses: new RegistryRunPassRevocation(passes),
    listen: () => server.listen(),
    close: async () => {
      skillSources?.setSourceChangeObserver(null);
      await server.close();
    },
  });
};
