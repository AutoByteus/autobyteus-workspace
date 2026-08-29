import type { AddressInfo } from "node:net";
import fastify, { type FastifyInstance } from "fastify";
import type { LoggingConfig } from "../../config/logging-config.js";
import { SERVER_ROUTE_PARAM_MAX_LENGTH } from "../../api/fastify-runtime-config.js";
import { getFastifyLoggerOptions } from "../../logging/runtime-logger-bootstrap.js";
import { registerHttpAccessLogPolicy } from "../../logging/http-access-log-policy.js";
import {
  registerAgentToolsMcpRoutes,
  type AgentToolsMcpRouteDependencies,
} from "./agent-tools-mcp-routes.js";

type AgentToolsMcpLocalServerState =
  | "created"
  | "starting"
  | "listening"
  | "closing"
  | "closed";

export class AgentToolsMcpLocalServer {
  private readonly app: FastifyInstance;
  private state: AgentToolsMcpLocalServerState = "created";
  private baseUrl: string | null = null;
  private listenPromise: Promise<void> | null = null;
  private closePromise: Promise<void> | null = null;

  constructor(input: Readonly<{
    loggingConfig: LoggingConfig;
    routeDependencies: AgentToolsMcpRouteDependencies;
  }>) {
    this.app = fastify({
      logger: getFastifyLoggerOptions(input.loggingConfig),
      disableRequestLogging: true,
      maxParamLength: SERVER_ROUTE_PARAM_MAX_LENGTH,
    });
    registerHttpAccessLogPolicy(this.app, {
      mode: input.loggingConfig.httpAccessLogMode,
      includeNoisyRoutes: input.loggingConfig.includeNoisyHttpAccessRoutes,
    });
    this.routeDependencies = input.routeDependencies;
  }

  private readonly routeDependencies: AgentToolsMcpRouteDependencies;

  listen(): Promise<void> {
    if (this.state !== "created") {
      throw new Error(
        `Agent Tools MCP local server cannot listen from '${this.state}' state.`,
      );
    }
    this.state = "starting";
    this.listenPromise = this.listenInternal();
    return this.listenPromise;
  }

  requireBaseUrl(): string {
    if (this.state !== "listening" || !this.baseUrl) {
      throw new Error("Agent Tools MCP local server is not ready.");
    }
    return this.baseUrl;
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async listenInternal(): Promise<void> {
    try {
      await registerAgentToolsMcpRoutes(this.app, this.routeDependencies);
      await this.app.listen({ host: "127.0.0.1", port: 0 });
      const address = this.app.server.address();
      if (!isValidLoopbackAddress(address)) {
        throw new Error("Agent Tools MCP local server returned an invalid listen address.");
      }
      this.baseUrl = `http://127.0.0.1:${address.port}`;
      this.state = "listening";
    } catch (error) {
      this.state = "closing";
      this.baseUrl = null;
      try {
        await this.app.close();
      } catch (closeError) {
        this.state = "closed";
        throw new AggregateError(
          [error, closeError],
          "Agent Tools MCP local server startup and cleanup failed.",
        );
      }
      this.state = "closed";
      throw error;
    }
  }

  private async closeInternal(): Promise<void> {
    if (this.isClosed()) return;
    if (this.state === "starting") {
      await this.listenPromise?.catch(() => undefined);
    }
    if (this.isClosed()) return;
    this.state = "closing";
    this.baseUrl = null;
    try {
      await this.app.close();
    } finally {
      this.state = "closed";
    }
  }

  private isClosed(): boolean {
    return this.state === "closed";
  }
}

const isValidLoopbackAddress = (
  address: string | AddressInfo | null,
): address is AddressInfo => Boolean(
  address
  && typeof address !== "string"
  && Number.isInteger(address.port)
  && address.port > 0
  && address.address === "127.0.0.1",
);
