import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type {
  PublishedArtifactPublisher,
} from "../../services/published-artifacts/published-artifact-publisher.js";
import { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import {
  AgentToolMcpSessionService,
  type AgentToolMcpSessionManager,
} from "./agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "./agent-tool-mcp-tool-executor.js";
import {
  type AgentToolMcpSessionExecutionCapabilities,
} from "./agent-tool-mcp-session.js";
import {
  type AgentToolsMcpRouteDependencies,
} from "./agent-tools-mcp-routes.js";
import { AgentToolsMcpMethodDispatcher } from "./agent-tools-mcp-method-dispatcher.js";
import { AgentToolsMcpResultMapper } from "./agent-tools-mcp-result-mapper.js";
import { AgentToolsMcpSchemaMapper } from "./agent-tools-mcp-schema-mapper.js";
import { ScopedAgentToolMcpSessionManager } from "./scoped-agent-tool-mcp-session-manager.js";
import {
  ConfiguredMcpAgentToolSourceResolver,
} from "./configured-mcp/configured-mcp-agent-tool-source-resolver.js";
import {
  buildDefaultAgentToolMcpAdapterProviders,
} from "./providers/default-agent-tool-mcp-adapter-providers.js";

export type ApplicationAgentToolsSessionManagerFactory = Pick<
  AgentToolsMcpRuntime,
  "createApplicationSessionManager"
>;

export class AgentToolsMcpRuntime {
  readonly routeDependencies: AgentToolsMcpRouteDependencies;
  readonly generalProcessSessionManager: AgentToolMcpSessionManager;
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private closed = false;

  constructor(input: {
    generalProcessPublisher: PublishedArtifactPublisher;
  }) {
    this.registry = new AgentToolMcpSessionRegistry();
    const schemaMapper = new AgentToolsMcpSchemaMapper();
    this.catalog = new AgentToolMcpCatalog({
      providers: buildDefaultAgentToolMcpAdapterProviders(),
      schemaMapper,
      registry: defaultToolRegistry,
      configuredMcpSourceResolver:
        new ConfiguredMcpAgentToolSourceResolver({
          registry: defaultToolRegistry,
        }),
    });
    const executor = new AgentToolMcpToolExecutor({
      catalog: this.catalog,
    });
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog: this.catalog,
      toolExecutor: executor,
      resultMapper: new AgentToolsMcpResultMapper(),
    });
    this.routeDependencies = Object.freeze({
      registry: this.registry,
      dispatcher,
    });
    this.generalProcessSessionManager = this.createSessionManager({
      publishedArtifactPublisher: input.generalProcessPublisher,
    });
  }

  createApplicationSessionManager(input: {
    executionCapabilities: AgentToolMcpSessionExecutionCapabilities;
    assertExecutionCapabilitiesReady: () => void;
  }): ScopedAgentToolMcpSessionManager {
    this.assertOpen();
    return new ScopedAgentToolMcpSessionManager(
      this.createSessionService(input.executionCapabilities),
      () => {
        this.assertOpen();
        input.assertExecutionCapabilitiesReady();
      },
    );
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.registry.clear();
  }

  private createSessionManager(
    executionCapabilities: AgentToolMcpSessionExecutionCapabilities,
  ): ScopedAgentToolMcpSessionManager {
    return new ScopedAgentToolMcpSessionManager(
      this.createSessionService(executionCapabilities),
      () => this.assertOpen(),
    );
  }

  private createSessionService(
    executionCapabilities: AgentToolMcpSessionExecutionCapabilities,
  ): AgentToolMcpSessionService {
    return new AgentToolMcpSessionService({
      registry: this.registry,
      catalog: this.catalog,
      executionCapabilities,
    });
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("Agent Tools MCP runtime is closed.");
    }
  }
}

export const createAgentToolsMcpRuntime = (input: {
  generalProcessPublisher: PublishedArtifactPublisher;
}): AgentToolsMcpRuntime =>
  new AgentToolsMcpRuntime(input);
