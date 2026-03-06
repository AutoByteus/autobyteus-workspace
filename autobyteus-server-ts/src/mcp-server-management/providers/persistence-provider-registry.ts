import type { BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";

export type McpPersistenceProviderContract = {
  getByServerId(serverId: string): Promise<BaseMcpConfig | null>;
  getAll(): Promise<BaseMcpConfig[]>;
  deleteByServerId(serverId: string): Promise<boolean>;
  create(domainObj: BaseMcpConfig): Promise<BaseMcpConfig>;
  update(domainObj: BaseMcpConfig): Promise<BaseMcpConfig>;
};

export type McpProviderLoader = () => Promise<McpPersistenceProviderContract>;

const importRuntimeModule = async <T>(modulePath: string): Promise<T> =>
  (await import(modulePath)) as T;

const loadFileMcpProvider = async (): Promise<McpPersistenceProviderContract> => {
  const module = await importRuntimeModule<{
    FileMcpServerConfigProvider: new () => McpPersistenceProviderContract;
  }>(["./", "file-provider.js"].join(""));
  return new module.FileMcpServerConfigProvider();
};

export class McpPersistenceProviderRegistry {
  private static instance: McpPersistenceProviderRegistry | null = null;

  static getInstance(): McpPersistenceProviderRegistry {
    if (!McpPersistenceProviderRegistry.instance) {
      McpPersistenceProviderRegistry.instance = new McpPersistenceProviderRegistry();
    }
    return McpPersistenceProviderRegistry.instance;
  }

  private loaders = new Map<string, McpProviderLoader>();

  private constructor() {
    // File-based persistence is canonical for MCP server configurations.
    // Keep non-file profile aliases for compatibility while avoiding SQL paths.
    this.registerProviderLoader("sqlite", loadFileMcpProvider);
    this.registerProviderLoader("postgresql", loadFileMcpProvider);
    this.registerProviderLoader("file", loadFileMcpProvider);
  }

  registerProviderLoader(name: string, loader: McpProviderLoader): void {
    this.loaders.set(name.toLowerCase(), loader);
  }

  getProviderLoader(name: string): McpProviderLoader | undefined {
    return this.loaders.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.loaders.keys());
  }
}
