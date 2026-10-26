import { McpConfigService as CoreMcpConfigService, McpToolRegistrar } from "autobyteus-ts";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import {
  McpTransportType,
  type BaseMcpConfig,
  type McpConfigValue,
  type McpSecretField,
  type StdioMcpServerConfig,
  type StreamableHttpMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import type { DraftEntry, DraftValue, McpServerDraft } from "../domain/mcp-server-draft.js";
import type {
  McpSecretMoveCandidate,
  McpSecretMoveResult,
  McpServerField,
  McpServerView,
} from "../domain/mcp-server-view.js";
import { CachedMcpServerConfigProvider } from "../providers/cached-provider.js";
import type { McpReferenceChange } from "../providers/file-provider.js";
import { McpServerPersistenceProvider } from "../providers/persistence-provider.js";
import { McpSecretSuggestionRule } from "./mcp-secret-suggestion-rule.js";
import { McpServerSecretFields } from "./mcp-server-secret-fields.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export type McpConfigImportFailure = { server_id: string; reason: string };
export type McpConfigImportResult = {
  imported_count: number;
  failed_count: number;
  failures: McpConfigImportFailure[];
  /** The values stored as MCP secrets (always-secret fields and values the suggestion rule matched). */
  stored_secrets: McpServerField[];
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * An imported value becomes a draft value: a non-blank value that is always secret or that the suggestion rule
 * matches is stored as a secret; anything else stays plain. Import takes values, never secret references.
 */
const importedDraftValue = (serverId: string, field: McpSecretField, value: McpConfigValue): DraftValue => {
  if (typeof value !== "string") {
    throw new Error(`MCP server '${serverId}' ${field}: import takes values, not secret references.`);
  }
  return value.trim() && McpSecretSuggestionRule.match(field, value)
    ? { kind: "newSecret", value: SecretValue.fromString(value) }
    : { kind: "plain", value };
};

/** The draft for one imported (parsed) server. */
const importedDraft = (config: BaseMcpConfig): McpServerDraft => {
  const common = { serverId: config.server_id, enabled: config.enabled, toolNamePrefix: config.tool_name_prefix };
  const entries = (values: Record<string, McpConfigValue>, kind: "env" | "header"): DraftEntry[] =>
    Object.entries(values).map(([name, value]) => ({
      name,
      value: importedDraftValue(config.server_id, `${kind}:${name}`, value),
    }));
  if (config.transport_type === McpTransportType.STDIO) {
    const stdio = config as StdioMcpServerConfig;
    return {
      ...common,
      transportType: McpTransportType.STDIO,
      command: stdio.command,
      args: stdio.args,
      cwd: stdio.cwd,
      env: entries(stdio.env, "env"),
    };
  }
  const http = config as StreamableHttpMcpServerConfig;
  return {
    ...common,
    transportType: McpTransportType.STREAMABLE_HTTP,
    url: http.url,
    headers: entries(http.headers, "header"),
    token: http.token === null ? null : importedDraftValue(config.server_id, "token", http.token),
  };
};

const secretFieldsOfDraft = (draft: McpServerDraft): McpServerField[] => {
  const entries = draft.transportType === McpTransportType.STDIO
    ? draft.env.map((entry) => ({ field: `env:${entry.name}` as McpSecretField, value: entry.value }))
    : [
      ...draft.headers.map((entry) => ({ field: `header:${entry.name}` as McpSecretField, value: entry.value })),
      ...(draft.token ? [{ field: "token" as McpSecretField, value: draft.token }] : []),
    ];
  return entries
    .filter((entry) => entry.value.kind === "newSecret")
    .map((entry) => ({ serverId: draft.serverId, field: entry.field }));
};

export class McpConfigService {
  private static instance: McpConfigService | null = null;

  static getInstance(): McpConfigService {
    if (!McpConfigService.instance) {
      McpConfigService.instance = new McpConfigService();
    }
    return McpConfigService.instance;
  }

  static resetInstance(): void {
    McpConfigService.instance = null;
  }

  private provider: CachedMcpServerConfigProvider;
  private coreConfigService: CoreMcpConfigService;
  private toolRegistrar: McpToolRegistrar;
  /** The tail of the service write lock: MCP config writes run one at a time. */
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly secretFields: McpServerSecretFields = new McpServerSecretFields()) {
    const persistenceProvider = new McpServerPersistenceProvider();
    this.provider = new CachedMcpServerConfigProvider(persistenceProvider);

    this.coreConfigService = CoreMcpConfigService.getInstance();
    this.toolRegistrar = McpToolRegistrar.getInstance();
  }

  /**
   * The service write lock. Every write of MCP configs (configure, import, delete, move) runs inside it, so a
   * read-then-write sequence never sees another write in between.
   */
  private withWriteLock<T>(action: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(action, action);
    this.writeQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async viewsOf(configs: BaseMcpConfig[]): Promise<McpServerView[]> {
    const states = await this.secretFields.statesOf(configs);
    return configs.map((config) => ({ config, states: states.get(config.server_id) ?? new Map() }));
  }

  async loadAllAndRegister(): Promise<void> {
    logger.info("Loading and registering all MCP server configurations from file...");
    try {
      const allDbConfigs = await this.provider.getAll();
      logger.info(`Found ${allDbConfigs.length} total MCP server configs.`);

      this.coreConfigService.clearConfigs();
      for (const config of allDbConfigs) {
        this.coreConfigService.addConfig(config);
      }
      logger.info("Synchronized cached configurations with the core MCP config service.");

      await this.toolRegistrar.reloadAllMcpTools();
      logger.info("Finished loading and registering all MCP server configurations.");
    } catch (error) {
      logger.error(`An error occurred during MCP configuration loading: ${String(error)}`);
    }
  }

  async getAllMcpServers(): Promise<BaseMcpConfig[]> {
    logger.debug("Fetching all MCP server configurations.");
    return this.provider.getAll();
  }

  async getMcpServerById(serverId: string): Promise<BaseMcpConfig | null> {
    logger.debug(`Fetching MCP server configuration for server_id: ${serverId}`);
    return this.provider.getByServerId(serverId);
  }

  /** The saved servers with the state of each value (no secret value). A vault that is not READY never fails it. */
  async listMcpServerViews(): Promise<McpServerView[]> {
    return this.viewsOf(await this.provider.getAll());
  }

  /**
   * Saves a server from its draft: new secret values go to the vault first, then the provider writes the file and
   * the cache (with the backup when a stored plain value becomes a reference). Entries the server no longer
   * references are removed after the write commits; if the write fails, the new entries are removed instead.
   * Registry: the config is added, and the tools of a disabled server are unregistered (no discovery on save).
   */
  async configureMcpServer(draft: McpServerDraft): Promise<McpServerView> {
    logger.info(`Configuring MCP server with ID: ${draft.serverId}`);

    const savedConfig = await this.withWriteLock(async () => {
      const existingConfig = await this.provider.getByServerId(draft.serverId);
      const stored = await this.secretFields.store(draft, existingConfig);
      let saved: BaseMcpConfig;
      try {
        saved = existingConfig
          ? await this.provider.update(stored.config)
          : await this.provider.create(stored.config);
      } catch (error) {
        await this.secretFields.remove(stored.created);
        throw error;
      }
      await this.secretFields.remove(stored.obsolete);

      this.coreConfigService.addConfig(saved);
      if (!saved.enabled && this.toolRegistrar.isServerRegistered(saved.server_id)) {
        this.toolRegistrar.unregisterToolsFromServer(saved.server_id);
        logger.info(`Unregistered tools for disabled server: ${saved.server_id}`);
      }
      return saved;
    });

    const [view] = await this.viewsOf([savedConfig]);
    return view as McpServerView;
  }

  async discoverAndRegisterToolsForServer(serverId: string): Promise<ToolDefinition[]> {
    logger.info(`Attempting to discover and register tools for server ID: ${serverId}`);
    const config = await this.getMcpServerById(serverId);
    if (!config) {
      throw new Error(`No configuration found for server ID: ${serverId}`);
    }

    if (!config.enabled) {
      logger.warn(`Server ${serverId} is disabled. Skipping tool discovery.`);
      if (this.toolRegistrar.isServerRegistered(serverId)) {
        this.toolRegistrar.unregisterToolsFromServer(serverId);
      }
      return [];
    }

    const discovered = await this.toolRegistrar.registerServer(config);
    logger.info(`Successfully discovered and registered ${discovered.length} tools for server ID: ${serverId}`);
    return discovered;
  }

  /**
   * Lists the tools of a draft through a temporary connection. New values are used in memory only; kept secrets
   * are resolved from the saved server's references at connect. Nothing is stored.
   */
  async previewMcpServerTools(draft: McpServerDraft): Promise<ToolDefinition[]> {
    logger.info(`Previewing tools for server configuration: ${draft.serverId}`);
    const saved = await this.provider.getByServerId(draft.serverId);
    const previewConfig = await this.secretFields.toPreviewConfig(draft, saved);
    return this.toolRegistrar.listRemoteTools(previewConfig);
  }

  /** Unregisters and deletes a server; once the file write commits, its vault entries are removed. */
  async deleteMcpServer(serverId: string): Promise<boolean> {
    logger.info(`Deleting MCP server with ID: ${serverId}`);

    return this.withWriteLock(async () => {
      const existingConfig = await this.provider.getByServerId(serverId);

      if (this.toolRegistrar.isServerRegistered(serverId)) {
        this.toolRegistrar.unregisterToolsFromServer(serverId);
        logger.info(`Unregistered tools for server ID: ${serverId} before deletion.`);
      }

      this.coreConfigService.removeConfig(serverId);
      logger.info(`Removed config for server ID: ${serverId} from core service.`);

      const success = await this.provider.deleteByServerId(serverId);
      if (success) {
        logger.info(`Successfully deleted configuration for server ID: ${serverId}`);
        if (existingConfig) await this.secretFields.remove(this.secretFields.referencesOf(existingConfig));
      } else {
        logger.warn(`Failed to delete configuration for server ID: ${serverId}. It might have already been removed.`);
      }

      return success;
    });
  }

  /** Plain values offered for the move: always-secret fields and values the suggestion rule matches. */
  async listSecretMoveCandidates(): Promise<McpSecretMoveCandidate[]> {
    return this.secretFields.moveCandidates(await this.provider.getAll());
  }

  /**
   * The move to the vault (a maintenance action the user triggers). Under the write lock: each selected value that
   * is still plain is saved as a new MCP secret, then the provider writes the backup and the file with the
   * references in one locked write (the cache follows). If that fails, the new entries are removed and the file is
   * unchanged. After the lock is released, each changed server is added again and its tools are re-registered.
   */
  async moveSecretsToVault(selection: readonly McpServerField[]): Promise<McpSecretMoveResult> {
    logger.info(`Moving ${selection.length} MCP value(s) to the vault.`);
    const unique = [...new Map(selection.map((item) => [`${item.serverId}\u0000${item.field}`, item])).values()];

    const outcome = await this.withWriteLock(async () => {
      const configs = new Map((await this.provider.getAll()).map((config) => [config.server_id, config]));
      const changes: McpReferenceChange[] = [];
      const skipped: McpServerField[] = [];
      try {
        for (const { serverId, field } of unique) {
          const config = configs.get(serverId);
          const reference = config ? await this.secretFields.storePlainAsSecret(config, field) : null;
          if (reference) changes.push({ serverId, field, reference });
          else skipped.push({ serverId, field });
        }
        if (changes.length === 0) return { backupPath: null, changes, skipped, configs: [] as BaseMcpConfig[] };
        const replacement = await this.provider.replaceWithReferences(changes);
        return { backupPath: replacement.backupPath, changes, skipped, configs: replacement.configs };
      } catch (error) {
        await this.secretFields.remove(changes.map((change) => change.reference.vaultSecretId));
        throw error;
      }
    });

    const serversFailingAfterMove: Array<{ serverId: string; reason: string }> = [];
    for (const config of outcome.configs) {
      this.coreConfigService.addConfig(config);
      if (!config.enabled) continue;
      try {
        await this.toolRegistrar.registerServer(config);
      } catch (error) {
        serversFailingAfterMove.push({ serverId: config.server_id, reason: errorMessage(error) });
      }
    }

    if (outcome.backupPath) {
      logger.info(`Moved ${outcome.changes.length} MCP value(s) to the vault; backup of the plain file: ${outcome.backupPath}`);
    }
    return {
      backupPath: outcome.backupPath,
      moved: outcome.changes.map(({ serverId, field }) => ({ serverId, field })),
      skipped: outcome.skipped,
      serversFailingAfterMove,
    };
  }

  /**
   * Imports every entry of an `mcpServers` object on its own; a failed entry is reported with its server id and the
   * error message (config errors name fields, never values) and the rest still import. Always-secret values and
   * values the suggestion rule matches are stored as MCP secrets, and the result lists them.
   */
  async importMcpServerConfigs(jsonString: string): Promise<McpConfigImportResult> {
    logger.info("Starting bulk import of MCP server configurations from JSON.");
    const data = JSON.parse(jsonString) as Record<string, unknown>;

    const configs = data?.mcpServers;
    if (!configs || typeof configs !== "object" || Array.isArray(configs)) {
      throw new Error("JSON must contain a top-level 'mcpServers' object.");
    }

    let importedCount = 0;
    const failures: McpConfigImportFailure[] = [];
    const storedSecrets: McpServerField[] = [];

    for (const [serverId, configDetails] of Object.entries(configs as Record<string, unknown>)) {
      try {
        // A non-object entry goes to the parser as-is, which reports that it must be a dictionary.
        const entry = configDetails && typeof configDetails === "object" && !Array.isArray(configDetails)
          ? { server_id: serverId, ...(configDetails as Record<string, unknown>) }
          : configDetails;
        const draft = importedDraft(CoreMcpConfigService.parseMcpConfigDict({ [serverId]: entry }));
        await this.configureMcpServer(draft);
        importedCount += 1;
        storedSecrets.push(...secretFieldsOfDraft(draft));
      } catch (error) {
        const reason = errorMessage(error);
        logger.error(`Failed to import configuration for server '${serverId}': ${reason}`);
        failures.push({ server_id: serverId, reason });
      }
    }

    logger.info(`Bulk import complete. Imported: ${importedCount}, Failed: ${failures.length}, stored as secrets: ${storedSecrets.length}`);
    return { imported_count: importedCount, failed_count: failures.length, failures, stored_secrets: storedSecrets };
  }
}

export const getMcpConfigService = (): McpConfigService => McpConfigService.getInstance();
