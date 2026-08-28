import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { LoggingConfig } from "../../config/logging-config.js";
import { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import { AgentToolMcpToolExecutor } from "./agent-tool-mcp-tool-executor.js";
import { AgentToolsMcpMethodDispatcher } from "./agent-tools-mcp-method-dispatcher.js";
import { AgentToolsMcpResultMapper } from "./agent-tools-mcp-result-mapper.js";
import { AgentToolsMcpSchemaMapper } from "./agent-tools-mcp-schema-mapper.js";
import { AgentToolsMcpLocalAccessGate } from "./agent-tools-mcp-local-access.js";
import { AgentToolsMcpLocalServer } from "./agent-tools-mcp-local-server.js";
import { ConfiguredMcpAgentToolSourceResolver } from "./configured-mcp/configured-mcp-agent-tool-source-resolver.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "./providers/default-agent-tool-mcp-adapter-providers.js";
import type { AgentToolMcpSessionAuthorityFactory } from "./agent-tool-mcp-session-authority.js";
import { createAgentToolMcpSessionAuthorityFactory } from "./scoped-agent-tool-mcp-session-authority.js";

export interface AgentToolsMcpHost {
  readonly sessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  listen(): Promise<void>;
  close(): Promise<void>;
}

class DefaultAgentToolsMcpHost implements AgentToolsMcpHost {
  readonly sessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  private readonly registry = new AgentToolMcpSessionRegistry();
  private readonly localServer: AgentToolsMcpLocalServer;
  private closing = false;
  private closed = false;
  private closePromise: Promise<void> | null = null;

  constructor(loggingConfig: LoggingConfig) {
    const catalog = new AgentToolMcpCatalog({
      providers: buildDefaultAgentToolMcpAdapterProviders(),
      schemaMapper: new AgentToolsMcpSchemaMapper(),
      registry: defaultToolRegistry,
      configuredMcpSourceResolver: new ConfiguredMcpAgentToolSourceResolver({
        registry: defaultToolRegistry,
      }),
    });
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
      resultMapper: new AgentToolsMcpResultMapper(),
    });
    this.localServer = new AgentToolsMcpLocalServer({
      loggingConfig,
      routeDependencies: Object.freeze({
        registry: this.registry,
        dispatcher,
        localAccessGate: new AgentToolsMcpLocalAccessGate(),
      }),
    });
    this.sessionAuthorities = createAgentToolMcpSessionAuthorityFactory({
      registry: this.registry,
      catalog,
      getLocalBaseUrl: () => this.localServer.requireBaseUrl(),
      assertHostOpen: () => this.assertOpen(),
    });
  }

  listen(): Promise<void> {
    this.assertOpen();
    return this.localServer.listen();
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    this.closing = true;
    try {
      await this.localServer.close();
    } finally {
      this.registry.clear();
      this.closed = true;
      this.closing = false;
    }
  }

  private assertOpen(): void {
    if (this.closing || this.closed) {
      throw new Error("Agent Tools MCP host is closed.");
    }
  }
}

export const createAgentToolsMcpHost = (input: Readonly<{
  loggingConfig: LoggingConfig;
}>): AgentToolsMcpHost => {
  if (!input?.loggingConfig) {
    throw new Error("Agent Tools MCP host logging configuration is required.");
  }
  return new DefaultAgentToolsMcpHost(input.loggingConfig);
};
