import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  type BaseMcpConfig,
} from "autobyteus-ts";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  getMcpConfigService,
  type McpConfigService,
} from "../../mcp-server-management/services/mcp-config-service.js";
import { NodeSyncSelectionService } from "./node-sync-selection-service.js";
import type {
  NodeSyncSelectionSpec,
  ResolvedNodeSyncSelection,
} from "./node-sync-selection-service.js";
import {
  readAgentDefinitionPayload,
  readAgentTeamDefinitionPayload,
  type SyncAgentDefinition,
  type SyncAgentTeamDefinition,
  writeAgentDefinitionPayload,
  writeAgentTeamDefinitionPayload,
} from "./node-sync-file-layout.js";

export type SyncEntityType =
  | "agent_definition"
  | "agent_team_definition"
  | "mcp_server_configuration";

export type SyncConflictPolicy = "source_wins" | "target_wins";
export type SyncTombstonePolicy = "source_delete_wins";

export interface ExportNodeSyncBundleInput {
  scope: SyncEntityType[];
  watermarkByEntity?: Partial<Record<SyncEntityType, string | null>>;
  selection?: NodeSyncSelectionSpec | null;
}

export interface NodeSyncBundle {
  watermark: string;
  entities: Partial<Record<SyncEntityType, unknown[]>>;
  tombstones: Partial<Record<SyncEntityType, string[]>>;
}

export interface ImportNodeSyncBundleInput {
  scope: SyncEntityType[];
  bundle: NodeSyncBundle;
  conflictPolicy: SyncConflictPolicy;
  tombstonePolicy: SyncTombstonePolicy;
}

export interface NodeSyncImportResult {
  success: boolean;
  summary: {
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  };
  failures: Array<{ entityType: SyncEntityType; key: string; message: string }>;
  appliedWatermark: string | null;
}

type SyncMcpServerConfiguration =
  | {
      serverId: string;
      transportType: "stdio";
      enabled: boolean;
      toolNamePrefix?: string | null;
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string | null;
    }
  | {
      serverId: string;
      transportType: "streamable_http";
      enabled: boolean;
      toolNamePrefix?: string | null;
      url: string;
    };

function nowWatermark(): string {
  return new Date().toISOString();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function asRecordStringString(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    typeof entry === "string" ? entry : String(entry),
  ]);
  return Object.fromEntries(entries);
}

type AgentDefinitionServiceLike = {
  getAllAgentDefinitions: AgentDefinitionService["getAllAgentDefinitions"];
  refreshCache?: AgentDefinitionService["refreshCache"];
};

type AgentTeamDefinitionServiceLike = {
  getAllDefinitions: AgentTeamDefinitionService["getAllDefinitions"];
  refreshCache?: AgentTeamDefinitionService["refreshCache"];
};

type McpConfigServiceLike = {
  getAllMcpServers: McpConfigService["getAllMcpServers"];
  configureMcpServer: McpConfigService["configureMcpServer"];
};

type NodeSyncServiceOptions = {
  agentDefinitionService?: AgentDefinitionServiceLike;
  agentTeamDefinitionService?: AgentTeamDefinitionServiceLike;
  mcpConfigService?: McpConfigServiceLike;
  selectionService?: NodeSyncSelectionService;
};

export class NodeSyncService {
  private static instance: NodeSyncService | null = null;

  static getInstance(): NodeSyncService {
    if (!NodeSyncService.instance) {
      NodeSyncService.instance = new NodeSyncService();
    }
    return NodeSyncService.instance;
  }

  private readonly agentDefinitionService: AgentDefinitionServiceLike;
  private readonly agentTeamDefinitionService: AgentTeamDefinitionServiceLike;
  private readonly mcpConfigService: McpConfigServiceLike;
  private readonly selectionService: NodeSyncSelectionService;

  constructor(options: NodeSyncServiceOptions = {}) {
    this.agentDefinitionService = options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.agentTeamDefinitionService =
      options.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.mcpConfigService = options.mcpConfigService ?? getMcpConfigService();
    this.selectionService =
      options.selectionService ??
      new NodeSyncSelectionService({
        agentDefinitionService: this.agentDefinitionService,
        agentTeamDefinitionService: this.agentTeamDefinitionService,
      });
  }

  async exportBundle(input: ExportNodeSyncBundleInput): Promise<NodeSyncBundle> {
    const scope = new Set(input.scope);
    const entities: NodeSyncBundle["entities"] = {};
    const selection = await this.selectionService.resolveSelection(input.selection);

    if (scope.has("agent_definition")) {
      const definitions = await this.agentDefinitionService.getAllAgentDefinitions();
      const selectedDefinitions = this.filterAgentDefinitionsBySelection(definitions, selection);
      const payloads: SyncAgentDefinition[] = [];
      for (const definition of selectedDefinitions) {
        if (!definition.id) {
          continue;
        }
        payloads.push(await readAgentDefinitionPayload(definition.id));
      }
      entities.agent_definition = payloads;
    }

    if (scope.has("agent_team_definition")) {
      const teams = await this.agentTeamDefinitionService.getAllDefinitions();
      const selectedTeams = this.filterAgentTeamDefinitionsBySelection(teams, selection);
      const payloads: SyncAgentTeamDefinition[] = [];
      for (const team of selectedTeams) {
        if (!team.id) {
          continue;
        }
        payloads.push(await readAgentTeamDefinitionPayload(team.id));
      }
      entities.agent_team_definition = payloads;
    }

    if (scope.has("mcp_server_configuration")) {
      const configs = selection ? [] : await this.mcpConfigService.getAllMcpServers();
      entities.mcp_server_configuration = configs.map((config) => {
        const configRecord = config as unknown as Record<string, unknown>;
        if (config.transport_type === "stdio") {
          return {
            serverId: config.server_id,
            transportType: "stdio",
            enabled: Boolean(config.enabled),
            toolNamePrefix: config.tool_name_prefix ?? null,
            command: asString(configRecord.command),
            args: asStringArray(configRecord.args),
            env: asRecordStringString(configRecord.env),
            cwd: asStringOrNull(configRecord.cwd),
          } satisfies SyncMcpServerConfiguration;
        }

        return {
          serverId: config.server_id,
          transportType: "streamable_http",
          enabled: Boolean(config.enabled),
          toolNamePrefix: config.tool_name_prefix ?? null,
          url: asString(configRecord.url),
        } satisfies SyncMcpServerConfiguration;
      });
    }

    return {
      watermark: nowWatermark(),
      entities,
      tombstones: {},
    };
  }

  private filterAgentDefinitionsBySelection(
    definitions: AgentDefinition[],
    selection: ResolvedNodeSyncSelection | null,
  ): AgentDefinition[] {
    if (!selection) {
      return definitions;
    }
    return definitions.filter((definition) => {
      if (!definition.id) {
        return false;
      }
      return selection.agentDefinitionIds.has(definition.id);
    });
  }

  private filterAgentTeamDefinitionsBySelection(
    teams: AgentTeamDefinition[],
    selection: ResolvedNodeSyncSelection | null,
  ): AgentTeamDefinition[] {
    if (!selection) {
      return teams;
    }
    return teams.filter((team) => {
      if (!team.id) {
        return false;
      }
      return selection.agentTeamDefinitionIds.has(team.id);
    });
  }

  async importBundle(input: ImportNodeSyncBundleInput): Promise<NodeSyncImportResult> {
    const summary = {
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
    };
    const failures: Array<{ entityType: SyncEntityType; key: string; message: string }> = [];
    const scopeSet = new Set(input.scope);

    if (scopeSet.has("agent_definition")) {
      await this.importAgentDefinitions(
        (input.bundle.entities.agent_definition ?? []) as SyncAgentDefinition[],
        input.conflictPolicy,
        summary,
        failures,
      );
    }

    if (scopeSet.has("agent_team_definition")) {
      await this.importAgentTeamDefinitions(
        (input.bundle.entities.agent_team_definition ?? []) as SyncAgentTeamDefinition[],
        input.conflictPolicy,
        summary,
        failures,
      );
    }

    if (scopeSet.has("mcp_server_configuration")) {
      await this.importMcpServerConfigurations(
        (input.bundle.entities.mcp_server_configuration ?? []) as SyncMcpServerConfiguration[],
        input.conflictPolicy,
        summary,
        failures,
      );
    }

    return {
      success: failures.length === 0,
      summary,
      failures,
      appliedWatermark: input.bundle.watermark ?? null,
    };
  }

  private async importAgentDefinitions(
    incoming: SyncAgentDefinition[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult["summary"],
    failures: NodeSyncImportResult["failures"],
  ): Promise<void> {
    const existingDefinitions = await this.agentDefinitionService.getAllAgentDefinitions();
    const existingIds = new Set(
      existingDefinitions
        .map((definition) => definition.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    for (const payload of incoming) {
      summary.processed += 1;
      const key = payload.agentId;
      try {
        const exists = existingIds.has(payload.agentId);
        if (exists && conflictPolicy === "target_wins") {
          summary.skipped += 1;
          continue;
        }

        await writeAgentDefinitionPayload(payload);

        if (exists) {
          summary.updated += 1;
        } else {
          summary.created += 1;
          existingIds.add(payload.agentId);
        }
      } catch (error) {
        failures.push({
          entityType: "agent_definition",
          key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (this.agentDefinitionService.refreshCache) {
      await this.agentDefinitionService.refreshCache();
    }
  }

  private async importAgentTeamDefinitions(
    incoming: SyncAgentTeamDefinition[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult["summary"],
    failures: NodeSyncImportResult["failures"],
  ): Promise<void> {
    const existingTeams = await this.agentTeamDefinitionService.getAllDefinitions();
    const existingIds = new Set(
      existingTeams
        .map((team) => team.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    for (const payload of incoming) {
      summary.processed += 1;
      const key = payload.teamId;
      try {
        const exists = existingIds.has(payload.teamId);
        if (exists && conflictPolicy === "target_wins") {
          summary.skipped += 1;
          continue;
        }

        await writeAgentTeamDefinitionPayload(payload);

        if (exists) {
          summary.updated += 1;
        } else {
          summary.created += 1;
          existingIds.add(payload.teamId);
        }
      } catch (error) {
        failures.push({
          entityType: "agent_team_definition",
          key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (this.agentTeamDefinitionService.refreshCache) {
      await this.agentTeamDefinitionService.refreshCache();
    }
  }

  private async importMcpServerConfigurations(
    incoming: SyncMcpServerConfiguration[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult["summary"],
    failures: NodeSyncImportResult["failures"],
  ): Promise<void> {
    const existingConfigs = await this.mcpConfigService.getAllMcpServers();
    const existingByServerId = new Map(existingConfigs.map((config) => [config.server_id, config]));

    for (const config of incoming) {
      summary.processed += 1;
      const key = config.serverId;
      try {
        const existing = existingByServerId.get(config.serverId);

        if (existing && conflictPolicy === "target_wins") {
          summary.skipped += 1;
          continue;
        }

        let domainConfig: BaseMcpConfig;
        if (config.transportType === "stdio") {
          domainConfig = new StdioMcpServerConfig({
            server_id: config.serverId,
            enabled: config.enabled,
            tool_name_prefix: config.toolNamePrefix ?? null,
            command: config.command,
            args: config.args,
            env: config.env,
            cwd: config.cwd ?? null,
          });
        } else {
          domainConfig = new StreamableHttpMcpServerConfig({
            server_id: config.serverId,
            enabled: config.enabled,
            tool_name_prefix: config.toolNamePrefix ?? null,
            url: config.url,
          });
        }

        await this.mcpConfigService.configureMcpServer(domainConfig);
        if (existing) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }
      } catch (error) {
        failures.push({
          entityType: "mcp_server_configuration",
          key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
