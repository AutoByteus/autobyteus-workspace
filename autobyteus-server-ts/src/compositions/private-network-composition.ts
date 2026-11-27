import type http from "node:http";
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
  close(): Promise<void>;
}>;

let processPrivateNetwork: PrivateNetwork | null = null;

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
    listener, visibility, info,
    close: async () => {
      if (processPrivateNetwork === composed) processPrivateNetwork = null;
      await listener.close();
    },
  });
  processPrivateNetwork ??= composed;
  return composed;
};
