import type http from "node:http";
import type { AddressInfo } from "node:net";
import type { PrivateNetworkContext } from "../extensions/server-parts/server-part-host.js";
import { NodeInfoResponder } from "../private-network/node-info-responder.js";
import { NodeVisibility } from "../private-network/node-visibility.js";
import { PrivateNetworkListener } from "../private-network/private-network-listener.js";
import { readComputerName } from "../remote-access/services/computer-name.js";
import { getNodeIdentityService } from "../remote-access/services/node-identity-service.js";
import { getNodeNetworkService } from "../remote-access/services/node-network-service.js";
import { getServerSettingsService } from "../services/server-settings-service.js";

export type PrivateNetwork = Readonly<{
  listener: PrivateNetworkListener;
  visibility: NodeVisibility;
  info: NodeInfoResponder;
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
export const composePrivateNetwork = async (input: Readonly<{ dataDir: string; httpServer(): http.Server }>): Promise<PrivateNetwork> => {
  const listener = new PrivateNetworkListener({ dataDir: input.dataDir, httpServer: input.httpServer });
  await listener.start();
  const visibility = new NodeVisibility({
    settings: getServerSettingsService(),
    localNetworkAllowed: async () => (await getNodeNetworkService().readAdmissionFacts()).localNetwork?.allowed === true,
  });
  const info = new NodeInfoResponder({ visibility, ownNodeId: () => getNodeIdentityService().getNodeId(), ownName: () => readComputerName() });
  const composed: PrivateNetwork = Object.freeze({
    listener, visibility, info, httpServer: input.httpServer,
    close: async () => {
      if (processPrivateNetwork === composed) processPrivateNetwork = null;
      await listener.close();
    },
  });
  processPrivateNetwork ??= composed;
  return composed;
};
