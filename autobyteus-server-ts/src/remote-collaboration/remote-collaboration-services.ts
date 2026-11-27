import { NodeCatalogPort } from "../agent-collaboration/collaborators/node-catalog-port.js";
import { RemoteCollaborationSettingsError } from "./domain/remote-collaboration-settings-error.js";
import { NodeIdentityNotMigratedError } from "../remote-access/services/node-identity-service.js";
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
import { NodeKeyPeerVerifier } from "./channel/node-key-peer-verifier.js";
import { PeerConnector, type NetworkRelay } from "./channel/peer-connector.js";
import { PeerPairingClient } from "./channel/peer-pairing-client.js";
import { PeerRequestSigner } from "./channel/peer-request-signer.js";
import { PeerNodeDiscovery } from "./discovery/peer-node-discovery.js";
import { NodeKey } from "./pairing/node-key.js";
import { PeerPairing, type PairingPrivateNetwork } from "./pairing/peer-pairing.js";
import { PeerDirectory } from "./settings/peer-directory.js";
import { PeerStore } from "./settings/peer-store.js";
import { getServerAddressCandidateService } from "../server-addressing/server-address-candidate-service.js";
import { readComputerName } from "../remote-access/services/computer-name.js";
import type { AppDataDirSource } from "./settings/settings-file-schema.js";
import { runsInContainer as processRunsInContainer } from "../server-addressing/runs-in-container.js";

/**
 * One node's remote collaboration (DS-004, DS-005; autobyteus-661): the peers, the outbound client, the inbound
 * gateway, pairing, and the catalog port through which peers' targets are resolved (a run started for a peer: the
 * temp workspace, auto-approve on). A node collaborates exactly with the nodes it is paired with (D-4: no switch).
 */
export type RemoteCollaborationServices = Readonly<{
  peers: PeerDirectory;
  catalogPort: NodeCatalogPort;
  client: PeerClient;
  gateway: PeerGateway;
  /** autobyteus-261: the peers with their status, and a peer's offer (the `PeerDiscoveryChannel`). */
  discovery: PeerNodeDiscovery;
  /** autobyteus-661: grants, pair requests, Accept / Reject / Cancel, Unpair (contract §2, §3). */
  pairing: PeerPairing;
  /** autobyteus-661: the peer credential kind of the node's request gate (contract §5). */
  peerRequestVerifier: NodeKeyPeerVerifier;
  /** autobyteus-581: a relayed node's provider calls to its relay node (C4). */
  peerRelays: PeerRelayClient;
  /** Closes the connections to peers this node holds open (through the network relay); the server closes. */
  closeConnections(): Promise<void>;
}>;

/**
 * Where another node may reach this node, in order (contract §2 `addresses`): its configured and current addresses, the
 * Docker host alias when it listens on loopback, then its interface addresses. The other node keeps the first that
 * answers as this node.
 */
const ownAddresses = (): readonly string[] => getServerAddressCandidateService().listCandidates().map((candidate) => candidate.baseUrl);

/**
 * Builds the subsystem around the process's run services. The inbound handlers are given as factories over the
 * services, because receiving a delegation needs the catalog port and receiving a message needs the peers.
 */
export const composeRemoteCollaboration = (input: Readonly<{
  config: AppDataDirSource;
  ownNodeId(): Promise<string>;
  /** This node's temp workspace: where every run a peer starts works (REQ-205). */
  tempWorkspaceDir: string;
  /** Whether this server runs in a container (the loopback hint); the process check by default. */
  runsInContainer?(): boolean;
  /** autobyteus-587: the node's received files, which a peer uploads into before its message or work packet. */
  receivedFiles: ReceivedFilesHandler;
  /** autobyteus-661: this node's network relay (the Private Network role's `relay`), through which private-network peers are reached. */
  networkRelay?(): Promise<NetworkRelay>;
  /** autobyteus-661 DS-3: this node's private network as pairing reads it (read at use). */
  privateNetwork?: PairingPrivateNetwork;
  handlers(services: Omit<RemoteCollaborationServices, "gateway" | "discovery" | "pairing" | "peerRequestVerifier" | "peerRelays" | "closeConnections">): Readonly<{
    delegatedRuns: DelegatedRunHandler; messages: RemoteMessageHandler; availableAgents: AvailableAgentsHandler;
    runningAgents: RunningAgentsHandler; runViews: RemoteRunViewHandler; delegatedRunStates: DelegatedRunStatesHandler;
    peerRunMembers: PeerRunMembersHandler;
  }>;
}>): RemoteCollaborationServices => {
  const nodeKey = new NodeKey(input.config);
  const signer = new PeerRequestSigner({ key: nodeKey });
  const connector = new PeerConnector(input.networkRelay ? { networkRelay: input.networkRelay } : {});
  let peers: PeerDirectory;
  const client = new PeerClient({
    peers: {
      findByName: (name) => peers.findByName(name),
      findByNodeId: (nodeId) => peers.findByNodeId(nodeId),
    },
    signer,
    connector,
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
  peers = new PeerDirectory({ store: new PeerStore(input.config), probe: client, ownNodeId: ownNodeIdForSettings, runsInContainer });
  const services = { peers, catalogPort: new NodeCatalogPort(input.tempWorkspaceDir), client };
  const handlers = input.handlers(services);
  const gateway = new PeerGateway({ ownNodeId: input.ownNodeId, peers, ...handlers, receivedFiles: input.receivedFiles });
  const discovery = new PeerNodeDiscovery({ peers, client });
  const pairing = new PeerPairing({
    peers,
    client: new PeerPairingClient({ signer, connector }),
    probe: client,
    nodeKey,
    ownNodeId: ownNodeIdForSettings,
    ownName: () => readComputerName(),
    ownAddresses,
    ...(input.privateNetwork ? { privateNetwork: input.privateNetwork } : {}),
  });
  const peerRequestVerifier = new NodeKeyPeerVerifier({ ownNodeId: input.ownNodeId, peerKey: (nodeId) => peers.peerKey(nodeId) });
  const peerRelays = new PeerRelayClient({ peers, signer, connector, ownNodeId: input.ownNodeId });
  return Object.freeze({ ...services, gateway, discovery, pairing, peerRequestVerifier, peerRelays, closeConnections: () => connector.close() });
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
