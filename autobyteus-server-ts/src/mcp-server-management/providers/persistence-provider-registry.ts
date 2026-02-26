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

const loadSqlMcpProvider = async (): Promise<McpPersistenceProviderContract> => {
  const module = await importRuntimeModule<{
    SqlMcpServerConfigProvider: new () => McpPersistenceProviderContract;
  }>(["./", "sql-provider.js"].join(""));
  return new module.SqlMcpServerConfigProvider();
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
    this.registerProviderLoader("sqlite", loadSqlMcpProvider);
    this.registerProviderLoader("postgresql", loadSqlMcpProvider);
    this.registerProviderLoader("file", async () => {
      const { FileMcpServerConfigProvider } = await import("./file-provider.js");
      return new FileMcpServerConfigProvider();
    });
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
