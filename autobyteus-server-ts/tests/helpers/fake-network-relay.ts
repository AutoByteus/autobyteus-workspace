import http from "node:http";
import net from "node:net";
import { networkRelayAuthorization } from "../../src/remote-collaboration/channel/peer-connector.js";

/**
 * A stand-in for the AutoByteus Network program's local relay (autobyteus-661 design DS-6/DS-7): an HTTP CONNECT proxy
 * on 127.0.0.1 that takes only its credential and opens each tunnel to what `route` names for the asked authority (the
 * tailnet's machines): a local port, or another node's caller socket, into which it first writes the caller line the
 * program on that machine would write (DS-2). It records every authority asked.
 */
export type FakeNetworkRelay = Readonly<{
  port: number;
  credential: string;
  /** The `host:port` of every CONNECT, accepted or not, in order. */
  asked: string[];
  /** CONNECTs refused for a wrong or missing credential. */
  refusedCredentials(): number;
  close(): Promise<void>;
}>;

export const startFakeNetworkRelay = async (input: Readonly<{
  credential?: string;
  /**
   * What answers for `authority`: a local port, or a node's caller socket with the caller the network proves there
   * (the asking machine); `null`: no machine there (the tunnel fails with 502).
   */
  route(authority: string): number | Readonly<{ callerSocket: string; caller: Readonly<{ machine: string; account: string | null; ip: string }> }> | null;
}>): Promise<FakeNetworkRelay> => {
  const credential = input.credential ?? "relay-credential-for-tests";
  const asked: string[] = [];
  const open = new Set<net.Socket>();
  let refused = 0;
  const server = http.createServer((_request, response) => { response.statusCode = 405; response.end(); });
  server.on("connect", (request: http.IncomingMessage, client: net.Socket, head: Buffer) => {
    open.add(client);
    client.on("close", () => open.delete(client));
    client.on("error", () => undefined);
    asked.push(request.url ?? "");
    if (request.headers["proxy-authorization"] !== networkRelayAuthorization(credential)) {
      refused += 1;
      client.end("HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"autobyteus\"\r\n\r\n");
      return;
    }
    const to = input.route(request.url ?? "");
    if (to === null) { client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n"); return; }
    const opened = () => {
      if (typeof to !== "number") upstream.write(`AUTOBYTEUS-CALLER ${JSON.stringify(to.caller)}\n`);
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    };
    const upstream = typeof to === "number" ? net.connect(to, "127.0.0.1", opened) : net.connect(to.callerSocket, opened);
    open.add(upstream);
    upstream.on("close", () => { open.delete(upstream); client.destroy(); });
    upstream.on("error", () => client.destroy());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return Object.freeze({
    port: (server.address() as net.AddressInfo).port,
    credential,
    asked,
    refusedCredentials: () => refused,
    close: async () => {
      for (const socket of open) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  });
};
