import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { AgentToolMcpCatalog } from "./agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "./agent-tool-mcp-session-registry.js";
import { AgentToolMcpToolExecutor } from "./agent-tool-mcp-tool-executor.js";
import type { AgentToolsMcpRouteDependencies } from "./agent-tools-mcp-routes.js";
import { AgentToolsMcpMethodDispatcher } from "./agent-tools-mcp-method-dispatcher.js";
import { AgentToolsMcpResultMapper } from "./agent-tools-mcp-result-mapper.js";
import { AgentToolsMcpSchemaMapper } from "./agent-tools-mcp-schema-mapper.js";
import { ConfiguredMcpAgentToolSourceResolver } from "./configured-mcp/configured-mcp-agent-tool-source-resolver.js";
import { buildDefaultAgentToolMcpAdapterProviders } from "./providers/default-agent-tool-mcp-adapter-providers.js";
import type { AgentToolMcpSessionAuthorityFactory } from "./agent-tool-mcp-session-authority.js";
import { createAgentToolMcpSessionAuthorityFactory } from "./scoped-agent-tool-mcp-session-authority.js";

export interface AgentToolsMcpHost {
  readonly routeDependencies: AgentToolsMcpRouteDependencies;
  readonly sessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  readonly staticAdapterToolNames: ReadonlySet<string>;
  close(): void;
}

const createReadonlySetSnapshot = <T>(values: Iterable<T>): ReadonlySet<T> => {
  const source = new Set(values);
  let snapshot: ReadonlySet<T>;
  snapshot = Object.freeze({
    get size(): number { return source.size; },
    has: (value: T): boolean => source.has(value),
    entries: (): SetIterator<[T, T]> => source.entries(),
    keys: (): SetIterator<T> => source.keys(),
    values: (): SetIterator<T> => source.values(),
    [Symbol.iterator]: (): SetIterator<T> => source[Symbol.iterator](),
    forEach: (
      callback: (value: T, value2: T, set: ReadonlySet<T>) => void,
      thisArg?: unknown,
    ): void => source.forEach((value) => callback.call(thisArg, value, value, snapshot)),
  });
  return snapshot;
};

class DefaultAgentToolsMcpHost implements AgentToolsMcpHost {
  readonly routeDependencies: AgentToolsMcpRouteDependencies;
  readonly sessionAuthorities: AgentToolMcpSessionAuthorityFactory;
  readonly staticAdapterToolNames: ReadonlySet<string>;
  private readonly registry = new AgentToolMcpSessionRegistry();
  private closed = false;

  constructor() {
    const catalog = new AgentToolMcpCatalog({
      providers: buildDefaultAgentToolMcpAdapterProviders(),
      schemaMapper: new AgentToolsMcpSchemaMapper(),
      registry: defaultToolRegistry,
      configuredMcpSourceResolver: new ConfiguredMcpAgentToolSourceResolver({
        registry: defaultToolRegistry,
      }),
    });
    const executor = new AgentToolMcpToolExecutor({ catalog });
    this.staticAdapterToolNames = createReadonlySetSnapshot(
      catalog.listStaticAdapterToolNames(),
    );
    const dispatcher = new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: executor,
      resultMapper: new AgentToolsMcpResultMapper(),
    });
    this.routeDependencies = Object.freeze({
      registry: this.registry,
      dispatcher,
    });
    this.sessionAuthorities = createAgentToolMcpSessionAuthorityFactory({
      registry: this.registry,
      catalog,
      assertHostOpen: () => this.assertOpen(),
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.registry.clear();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("Agent Tools MCP host is closed.");
    }
  }
}

export const createAgentToolsMcpHost = (): AgentToolsMcpHost =>
  new DefaultAgentToolsMcpHost();
