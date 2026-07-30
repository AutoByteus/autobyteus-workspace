import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type {
  PublishedArtifactPublicationPort,
} from "../../services/published-artifacts/published-artifact-publication-port.js";
import { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import {
  AgentToolMcpSessionService,
  type AgentToolMcpSessionAuthority,
} from "./agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "./agent-tool-mcp-tool-executor.js";
import {
  type AgentToolMcpSessionExecutionAuthorities,
} from "./agent-tool-mcp-session.js";
import {
  type AgentToolsMcpRouteDependencies,
} from "./agent-tools-mcp-routes.js";
import { AgentToolsMcpMethodDispatcher } from "./agent-tools-mcp-method-dispatcher.js";
import { AgentToolsMcpResultMapper } from "./agent-tools-mcp-result-mapper.js";
import { AgentToolsMcpSchemaMapper } from "./agent-tools-mcp-schema-mapper.js";
import { ApplicationAgentToolsSessionAuthority } from "./application-agent-tools-session-authority.js";
import {
  ConfiguredMcpAgentToolSourceResolver,
} from "./configured-mcp/configured-mcp-agent-tool-source-resolver.js";
import {
  buildDefaultAgentToolMcpAdapterProviders,
} from "./providers/default-agent-tool-mcp-adapter-providers.js";

export type ApplicationAgentToolsSessionAuthorityFactory = Pick<
  AgentToolsMcpProcessAuthority,
  "createApplicationSessionAuthority"
>;

export class AgentToolsMcpProcessAuthority {
  readonly routeDependencies: AgentToolsMcpRouteDependencies;
  readonly generalProcessSessionAuthority: AgentToolMcpSessionAuthority;
  private readonly registry: AgentToolMcpSessionRegistry;
  private readonly catalog: AgentToolMcpCatalog;
  private closed = false;

  constructor(input: {
    generalProcessPublication: PublishedArtifactPublicationPort;
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
    this.generalProcessSessionAuthority = this.createSessionAuthority({
      publishedArtifactPublication: input.generalProcessPublication,
    });
  }

  createApplicationSessionAuthority(input: {
    executionAuthorities: AgentToolMcpSessionExecutionAuthorities;
    assertExecutionAuthoritiesReady: () => void;
  }): ApplicationAgentToolsSessionAuthority {
    this.assertOpen();
    return new ApplicationAgentToolsSessionAuthority(
      this.createSessionService(input.executionAuthorities),
      () => {
        this.assertOpen();
        input.assertExecutionAuthoritiesReady();
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

  private createSessionAuthority(
    executionAuthorities: AgentToolMcpSessionExecutionAuthorities,
  ): ApplicationAgentToolsSessionAuthority {
    return new ApplicationAgentToolsSessionAuthority(
      this.createSessionService(executionAuthorities),
      () => this.assertOpen(),
    );
  }

  private createSessionService(
    executionAuthorities: AgentToolMcpSessionExecutionAuthorities,
  ): AgentToolMcpSessionService {
    return new AgentToolMcpSessionService({
      registry: this.registry,
      catalog: this.catalog,
      executionAuthorities,
    });
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("Agent Tools MCP process authority is closed.");
    }
  }
}

export const createAgentToolsMcpProcessAuthority = (input: {
  generalProcessPublication: PublishedArtifactPublicationPort;
}): AgentToolsMcpProcessAuthority =>
  new AgentToolsMcpProcessAuthority(input);
