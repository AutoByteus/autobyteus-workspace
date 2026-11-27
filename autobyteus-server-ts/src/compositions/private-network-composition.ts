import type http from "node:http";
import type { AddressInfo } from "node:net";
import type { PrivateNetworkContext } from "../extensions/server-parts/server-part-host.js";
import type { ExtensionManager } from "../extensions/services/extension-manager.js";
import { FoundNodes } from "../private-network/found-nodes.js";
import { NodeInfoResponder } from "../private-network/node-info-responder.js";
import { NodeVisibility } from "../private-network/node-visibility.js";
import { PrivateNetworkListener } from "../private-network/private-network-listener.js";
import { PrivateNetworkRole, PrivateNetworkUnavailableError, type PrivateNetworkRelay } from "../private-network/private-network-role.js";
import type { PairingPrivateNetwork } from "../remote-collaboration/pairing/peer-pairing.js";
import { readComputerName } from "../remote-access/services/computer-name.js";
import { getNodeIdentityService } from "../remote-access/services/node-identity-service.js";
import { getNodeNetworkService } from "../remote-access/services/node-network-service.js";
import { getServerSettingsService } from "../services/server-settings-service.js";

export type PrivateNetwork = Readonly<{
  listener: PrivateNetworkListener;
  visibility: NodeVisibility;
  info: NodeInfoResponder;
  /** The `private-network` role: the extension that is on and provides it, resolved at each call. */
  role: PrivateNetworkRole;
  /** The Nodes tab's Found lists (private and local network). */
  found: FoundNodes;
  httpServer(): http.Server;
  close(): Promise<void>;
}>;

let processPrivateNetwork: PrivateNetwork | null = null;

/**
 * What the extension that provides `private-network` receives as `ctx.privateNetwork`: where its program hands
 * connections over, and the node's port. Both `null` until the node composed its private network and listens.
 */
export const currentPrivateNetworkContext = (): PrivateNetworkContext => {
  const address = processPrivateNetwork?.httpServer().address();
  return Object.freeze({
    callerSocketPath: processPrivateNetwork?.listener.socketPath() ?? null,
    nodePort: address && typeof address === "object" ? (address as AddressInfo).port : null,
  });
};

/**
 * This node's network relay (role action `relay`), for the peer connector, which is composed before the private network
 * and reads it at use. Without a composed private network: "Private Network is not set up".
 */
export const processNetworkRelay = (): Promise<PrivateNetworkRelay> => processPrivateNetwork
  ? processPrivateNetwork.role.relay()
  : Promise.reject(new PrivateNetworkUnavailableError("PRIVATE_NETWORK_NOT_SET_UP", "Private Network is not set up on this node."));

/** This node's private network as pairing reads it (read at use: it is composed after remote collaboration). */
export const processPairingPrivateNetwork: PairingPrivateNetwork = Object.freeze({
  ownAddress: async () => processPrivateNetwork?.role.ownAddress() ?? null,
  machineAccount: async (machine: string) => {
    if (!processPrivateNetwork) return undefined;
    const found = await processPrivateNetwork.role.machine(machine);
    return found ? found.account : undefined;
  },
});

/** The process's private network, for the GraphQL resolvers (framework edge); it throws where none is composed. */
export const getProcessPrivateNetwork = (): PrivateNetwork => {
  if (!processPrivateNetwork) throw new Error("The private network is not available on this server.");
  return processPrivateNetwork;
};

/**
 * autobyteus-661 (design DS-2, § Ownership `src/private-network/`): the node's end of the private network and its
 * visibility. The caller socket opens with the server, so the Private Network extension's program can hand connections
 * over as soon as it starts; it closes with the server.
 */
export const composePrivateNetwork = async (input: Readonly<{
  dataDir: string;
  httpServer(): http.Server;
  extensions: Pick<ExtensionManager, "enabledProvider" | "callAction">;
  /** The node's peers (left out of Found) and its outbound client (asks a private address who answers there). */
  remoteCollaboration: Readonly<{ peers: ConstructorParameters<typeof FoundNodes>[0]["peers"]; client: ConstructorParameters<typeof FoundNodes>[0]["info"] }>;
}>): Promise<PrivateNetwork> => {
  const listener = new PrivateNetworkListener({ dataDir: input.dataDir, httpServer: input.httpServer });
  await listener.start();
  const visibility = new NodeVisibility({
    settings: getServerSettingsService(),
    localNetworkAllowed: async () => (await getNodeNetworkService().readAdmissionFacts()).localNetwork?.allowed === true,
  });
  const role = new PrivateNetworkRole({ extensions: input.extensions });
  const info = new NodeInfoResponder({ visibility, ownNodeId: () => getNodeIdentityService().getNodeId(), ownName: () => readComputerName() });
  const composed: PrivateNetwork = Object.freeze({
    listener, visibility, info, role, httpServer: input.httpServer,
    found: new FoundNodes({ role, info: input.remoteCollaboration.client, peers: input.remoteCollaboration.peers, ownNodeId: () => getNodeIdentityService().getNodeId() }),
    close: async () => {
      if (processPrivateNetwork === composed) processPrivateNetwork = null;
      await listener.close();
    },
  });
  processPrivateNetwork ??= composed;
  return composed;
};
