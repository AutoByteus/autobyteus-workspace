import type { AddressInfo } from "node:net";
import fastify, { type FastifyInstance } from "fastify";
import { installClientConnectionClose } from "../shutdown/client-connection-close.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../api/fastify-runtime-config.js";
import { registerCredentialProxyRoutes, type CredentialProxyRouteDependencies } from "./credential-proxy-routes.js";
import {
  registerProviderRelayRoutes,
  type ProviderRelayRouteDependencies,
} from "./provider-relays/provider-relay-proxy-routes.js";

/** The dependencies of the listener's two route families: integrations (`/r/…`) and provider relays (`/relay/…`). */
export type CredentialProxyLocalServerRoutes = Readonly<{
  integrations: CredentialProxyRouteDependencies;
  relays: ProviderRelayRouteDependencies;
}>;

type LocalServerState = "created" | "starting" | "listening" | "closing" | "closed";

/**
 * The credential proxy's loopback listener (`127.0.0.1:<random port>`), so it can't be exposed when remote access is
 * on. Its URLs and headers carry run passes, so it logs nothing itself: no Fastify logger (whose error logging includes
 * the URL) and no HTTP access-log policy (AR-004). The activity log is the integrations' record.
 */
export class CredentialProxyLocalServer {
  private readonly app: FastifyInstance;
  private state: LocalServerState = "created";
  private baseUrl: string | null = null;
  private closePromise: Promise<void> | null = null;

  constructor(private readonly routeDependencies: (server: CredentialProxyLocalServer) => CredentialProxyLocalServerRoutes) {
    this.app = fastify({ logger: false, routerOptions: { maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH } });
    installClientConnectionClose(this.app); // its only preClose hook
  }

  async listen(): Promise<void> {
    if (this.state !== "created") throw new Error(`Credential proxy cannot listen from '${this.state}' state.`);
    this.state = "starting";
    try {
      const routes = this.routeDependencies(this);
      await registerCredentialProxyRoutes(this.app, routes.integrations);
      await registerProviderRelayRoutes(this.app, routes.relays);
      await this.app.listen({ host: "127.0.0.1", port: 0 });
      const address = this.app.server.address() as AddressInfo | null;
      if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
        throw new Error("Credential proxy returned an invalid listen address.");
      }
      this.baseUrl = `http://127.0.0.1:${address.port}`;
      this.state = "listening";
    } catch (error) {
      this.state = "closed";
      await this.app.close().catch(() => undefined);
      throw error;
    }
  }

  requireBaseUrl(): string {
    if (this.state !== "listening" || !this.baseUrl) throw new Error("Credential proxy is not ready.");
    return this.baseUrl;
  }

  close(): Promise<void> {
    this.closePromise ??= (async () => {
      this.state = "closing";
      this.baseUrl = null;
      await this.app.close();
      this.state = "closed";
    })();
    return this.closePromise;
  }
}
