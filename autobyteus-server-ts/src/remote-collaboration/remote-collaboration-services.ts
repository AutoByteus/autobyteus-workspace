import { NodeCatalogPort } from "../agent-collaboration/collaborators/node-catalog-port.js";
import type { ServerSettingsService } from "../services/server-settings-service.js";
import { PeerClient } from "./channel/peer-client.js";
import { PeerGateway, type AvailableAgentsHandler, type DelegatedRunHandler, type RemoteMessageHandler } from "./channel/peer-gateway.js";
import { RemoteNodeDiscovery } from "./discovery/remote-node-discovery.js";
import { PeerAddressResolver } from "./settings/peer-address-resolver.js";
import { PeerDirectory } from "./settings/peer-directory.js";
import { PeerStore } from "./settings/peer-store.js";
import { RemoteCollaborationCapability } from "./settings/remote-collaboration-capability.js";
import type { AppDataDirSource } from "./settings/settings-file-schema.js";
import { runsInContainer as processRunsInContainer } from "../server-addressing/runs-in-container.js";

/**
 * One node's remote collaboration (DS-004, DS-005): the switch, the peers, the outbound client, the inbound
 * gateway, and the catalog port through which peers' targets are resolved (a run started for a peer: the temp
 * workspace, auto-approve on).
 */
export type RemoteCollaborationServices = Readonly<{
  capability: RemoteCollaborationCapability;
  peers: PeerDirectory;
  /** one-nodes-tab DS-005: the address that works for this node to reach another node, by its node ID. */
  addresses: PeerAddressResolver;
  catalogPort: NodeCatalogPort;
  client: PeerClient;
  gateway: PeerGateway;
  /** autobyteus-261: the peers with their status, and a peer's offer (the `RemoteDiscoveryChannel`). */
  discovery: RemoteNodeDiscovery;
}>;

/**
 * Builds the subsystem around the process's run services. The inbound handlers are given as factories over the
 * services, because receiving a delegation needs the catalog port and receiving a message needs the peers.
 */
export const composeRemoteCollaboration = (input: Readonly<{
  config: AppDataDirSource;
  settings: Pick<ServerSettingsService, "getBooleanSetting" | "setBooleanSetting">;
  ownNodeId(): Promise<string>;
  /** This node's temp workspace: where every run a peer starts works (REQ-205). */
  tempWorkspaceDir: string;
  /** Whether this server runs in a container (the loopback hint); the process check by default. */
  runsInContainer?(): boolean;
  handlers(services: Omit<RemoteCollaborationServices, "gateway" | "discovery" | "addresses">): Readonly<{
    delegatedRuns: DelegatedRunHandler; messages: RemoteMessageHandler; availableAgents: AvailableAgentsHandler;
  }>;
}>): RemoteCollaborationServices => {
  const capability = new RemoteCollaborationCapability(input.settings);
  const store = new PeerStore(input.config);
  let peers: PeerDirectory;
  const client = new PeerClient({
    peers: { findByName: (name) => peers.findByName(name), findByNodeId: (nodeId) => peers.findByNodeId(nodeId) },
    capability,
    ownNodeId: input.ownNodeId,
  });
  const runsInContainer = input.runsInContainer ?? processRunsInContainer;
  peers = new PeerDirectory({ store, probe: client, capability, ownNodeId: input.ownNodeId, runsInContainer });
  const services = { capability, peers, catalogPort: new NodeCatalogPort(input.tempWorkspaceDir), client };
  const handlers = input.handlers(services);
  const gateway = new PeerGateway({ ownNodeId: input.ownNodeId, capability, peers, ...handlers });
  const discovery = new RemoteNodeDiscovery({ capability, peers, client });
  const addresses = new PeerAddressResolver({ probe: client, capability, ownNodeId: input.ownNodeId, runsInContainer });
  return Object.freeze({ ...services, gateway, discovery, addresses });
};

let processServices: RemoteCollaborationServices | null = null;

export const bindProcessRemoteCollaboration = (services: RemoteCollaborationServices): void => {
  if (!services) throw new Error("Process remote collaboration services are required.");
  if (processServices) throw new Error("The process remote collaboration services are already initialized.");
  processServices = services;
};

export const releaseProcessRemoteCollaboration = (services: RemoteCollaborationServices): void => {
  if (processServices === services) processServices = null;
};

/** The process's remote collaboration (API edge); `null` where it is not composed. */
export const findProcessRemoteCollaboration = (): RemoteCollaborationServices | null => processServices;

export const getProcessRemoteCollaboration = (): RemoteCollaborationServices => {
  if (!processServices) throw new Error("Remote collaboration is not available on this server.");
  return processServices;
};
