import { NodeCatalogPort } from "../agent-collaboration/collaborators/node-catalog-port.js";
import { RemoteCollaborationSettingsError } from "./domain/remote-collaboration-settings-error.js";
import { NodeIdentityNotMigratedError } from "../remote-access/services/node-identity-service.js";
import type { ServerSettingsService } from "../services/server-settings-service.js";
import { PeerClient } from "./channel/peer-client.js";
import { PeerRelayClient } from "./channel/peer-relay-client.js";
import type { ReceivedFilesHandler } from "./channel/peer-gateway.js";
import {
  PeerGateway,
  type AvailableAgentsHandler,
  type DelegatedRunHandler,
  type DelegatedRunStatesHandler,
  type PeerRunMembersHandler,
  type RemoteMessageHandler,
  type RemoteRunViewHandler,
  type RunningAgentsHandler,
} from "./channel/peer-gateway.js";
import { PeerNodeDiscovery } from "./discovery/peer-node-discovery.js";
import { PeerAddressResolver } from "./settings/peer-address-resolver.js";
import { PeerDirectory } from "./settings/peer-directory.js";
import { PeerStore } from "./settings/peer-store.js";
import { PeerPairingService } from "./settings/peer-pairing-service.js";
import { PeerRequestSignatureVerifier } from "./channel/peer-request-signature.js";
import { getServerAddressCandidateService } from "../server-addressing/server-address-candidate-service.js";
import { readComputerName } from "../remote-access/services/computer-name.js";
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
  /** autobyteus-261: the peers with their status, and a peer's offer (the `PeerDiscoveryChannel`). */
  discovery: PeerNodeDiscovery;
  /** autobyteus-437: peer invites and the pairing exchange (DS-004). */
  pairing: PeerPairingService;
  /** autobyteus-437: the peer credential kind of the node's request gate (DS-005). */
  peerRequestVerifier: PeerRequestSignatureVerifier;
  /** autobyteus-581: a relayed node's provider calls to its relay node (C4). */
  peerRelays: PeerRelayClient;
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
  /** autobyteus-587: the node's received files, which a peer uploads into before its message or work packet. */
  receivedFiles: ReceivedFilesHandler;
  handlers(services: Omit<RemoteCollaborationServices, "gateway" | "discovery" | "addresses" | "pairing" | "peerRequestVerifier" | "peerRelays">): Readonly<{
    delegatedRuns: DelegatedRunHandler; messages: RemoteMessageHandler; availableAgents: AvailableAgentsHandler;
    runningAgents: RunningAgentsHandler; runViews: RemoteRunViewHandler; delegatedRunStates: DelegatedRunStatesHandler;
    peerRunMembers: PeerRunMembersHandler;
  }>;
}>): RemoteCollaborationServices => {
  const capability = new RemoteCollaborationCapability(input.settings);
  const store = new PeerStore(input.config);
  let peers: PeerDirectory;
  const client = new PeerClient({
    peers: {
      findByName: (name) => peers.findByName(name),
      findByNodeId: (nodeId) => peers.findByNodeId(nodeId),
      peerSecret: (nodeId) => peers.peerSecret(nodeId),
    },
    capability,
    ownNodeId: input.ownNodeId,
  });
  const runsInContainer = input.runsInContainer ?? processRunsInContainer;
  // autobyteus-290: a settings change while this node's identity is held back is refused with that reason.
  const ownNodeIdForSettings = async (): Promise<string> => {
    try {
      return await input.ownNodeId();
    } catch (error) {
      if (error instanceof NodeIdentityNotMigratedError) throw new RemoteCollaborationSettingsError("NODE_IDENTITY_NOT_MIGRATED", error.message);
      throw error;
    }
  };
  peers = new PeerDirectory({ store, probe: client, capability, ownNodeId: ownNodeIdForSettings, runsInContainer });
  const services = { capability, peers, catalogPort: new NodeCatalogPort(input.tempWorkspaceDir), client };
  const handlers = input.handlers(services);
  const gateway = new PeerGateway({ ownNodeId: input.ownNodeId, capability, peers, ...handlers, receivedFiles: input.receivedFiles });
  const discovery = new PeerNodeDiscovery({ capability, peers, client });
  const addresses = new PeerAddressResolver({ probe: client, capability, ownNodeId: ownNodeIdForSettings, runsInContainer });
  const pairing = new PeerPairingService({
    capability,
    peers,
    addresses,
    transport: client,
    ownNodeId: ownNodeIdForSettings,
    ownAddressCandidates: () => getServerAddressCandidateService().listCandidates().map((candidate) => candidate.baseUrl),
    ownName: () => readComputerName(),
  });
  const peerRequestVerifier = new PeerRequestSignatureVerifier({
    ownNodeId: input.ownNodeId,
    peerSecret: (nodeId) => peers.peerSecret(nodeId),
  });
  const peerRelays = new PeerRelayClient({ capability, peers, ownNodeId: input.ownNodeId });
  return Object.freeze({ ...services, gateway, discovery, addresses, pairing, peerRequestVerifier, peerRelays });
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

/** The process's remote collaboration, for the GraphQL resolvers (framework edge, FU-500-02); it throws where none is composed. */
export const getProcessRemoteCollaboration = (): RemoteCollaborationServices => {
  if (!processServices) throw new Error("Remote collaboration is not available on this server.");
  return processServices;
};
