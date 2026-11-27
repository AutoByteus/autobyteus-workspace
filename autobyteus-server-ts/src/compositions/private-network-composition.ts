import type http from "node:http";
import { PrivateNetworkListener } from "../private-network/private-network-listener.js";

export type PrivateNetwork = Readonly<{
  listener: PrivateNetworkListener;
  close(): Promise<void>;
}>;

/**
 * autobyteus-661 (design DS-2): the node's end of the private network. The caller socket opens with the server, so the
 * Private Network extension's program can hand connections over as soon as it starts; it closes with the server.
 */
export const composePrivateNetwork = async (input: Readonly<{ dataDir: string; httpServer(): http.Server }>): Promise<PrivateNetwork> => {
  const listener = new PrivateNetworkListener({ dataDir: input.dataDir, httpServer: input.httpServer });
  await listener.start();
  return Object.freeze({ listener, close: () => listener.close() });
};
