import { promises as fs } from "node:fs";
import path from "node:path";
import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  type BaseMcpConfig,
} from "autobyteus-ts";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import {
  AgentTeamDefinition,
  TeamMember,
} from "../../agent-team-definition/domain/models.js";
import { NodeType as TeamNodeType } from "../../agent-team-definition/domain/enums.js";
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

type SyncAgentDefinition = {
  agentId: string;
  agent: {
    name: string;
    role: string;
    description: string;
    avatarUrl?: string | null;
    activePromptVersion: number;
    toolNames?: string[];
    inputProcessorNames?: string[];
    llmResponseProcessorNames?: string[];
    systemPromptProcessorNames?: string[];
    toolExecutionResultProcessorNames?: string[];
    toolInvocationPreprocessorNames?: string[];
    lifecycleProcessorNames?: string[];
    skillNames?: string[];
  };
  promptVersions: Record<string, string>;
};

type SyncTeamMember = {
  memberName: string;
  agentId: string;
};

type SyncAgentTeamDefinition = {
  teamId: string;
  team: {
    name: string;
    description: string;
    role?: string | null;
    avatarUrl?: string | null;
    coordinatorMemberName: string;
    members: SyncTeamMember[];
  };
};

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

const getDataDir = (): string => appConfigProvider.config.getAppDataDir();
const getAgentDir = (agentId: string): string => path.join(getDataDir(), "agents", agentId);
const getAgentJsonPath = (agentId: string): string => path.join(getAgentDir(agentId), "agent.json");
const getTeamDir = (teamId: string): string => path.join(getDataDir(), "agent-teams", teamId);
const getTeamJsonPath = (teamId: string): string => path.join(getTeamDir(teamId), "team.json");

const toJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

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
        const promptVersions = await this.readPromptVersions(definition.id);
        payloads.push({
          agentId: definition.id,
          agent: {
            name: definition.name,
            role: definition.role,
            description: definition.description,
            avatarUrl: definition.avatarUrl ?? null,
            activePromptVersion: Number.isInteger(definition.activePromptVersion)
              ? definition.activePromptVersion
              : 1,
            toolNames: definition.toolNames,
            inputProcessorNames: definition.inputProcessorNames,
            llmResponseProcessorNames: definition.llmResponseProcessorNames,
            systemPromptProcessorNames: definition.systemPromptProcessorNames,
            toolExecutionResultProcessorNames: definition.toolExecutionResultProcessorNames,
            toolInvocationPreprocessorNames: definition.toolInvocationPreprocessorNames,
            lifecycleProcessorNames: definition.lifecycleProcessorNames,
            skillNames: definition.skillNames,
          },
          promptVersions,
        });
      }
      entities.agent_definition = payloads;
    }

    if (scope.has("agent_team_definition")) {
      const teams = await this.agentTeamDefinitionService.getAllDefinitions();
      const selectedTeams = this.filterAgentTeamDefinitionsBySelection(teams, selection);
      entities.agent_team_definition = selectedTeams
        .filter((team): team is AgentTeamDefinition & { id: string } => Boolean(team.id))
        .map((team) => ({
          teamId: team.id,
          team: {
            name: team.name,
            description: team.description,
            role: team.role ?? null,
            avatarUrl: team.avatarUrl ?? null,
            coordinatorMemberName: team.coordinatorMemberName,
            members: team.nodes
              .filter((node) => node.referenceType === TeamNodeType.AGENT)
              .map((node) => ({
                memberName: node.memberName,
                agentId: node.referenceId,
              })),
          },
        } satisfies SyncAgentTeamDefinition));
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

        await this.writeAgentFolder(payload.agentId, payload);

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
    const existingById = new Map(
      existingTeams
        .filter((team): team is AgentTeamDefinition & { id: string } => Boolean(team.id))
        .map((team) => [team.id, team]),
    );

    for (const payload of incoming) {
      summary.processed += 1;
      const key = payload.teamId;
      try {
        const existing = existingById.get(payload.teamId);
        if (existing && conflictPolicy === "target_wins") {
          summary.skipped += 1;
          continue;
        }

        await this.writeTeamFolder(payload.teamId, payload);
        if (!existing) {
          summary.created += 1;
          const createdTeam = new AgentTeamDefinition({
            id: payload.teamId,
            name: payload.team.name,
            description: payload.team.description,
            role: payload.team.role ?? null,
            avatarUrl: payload.team.avatarUrl ?? null,
            coordinatorMemberName: payload.team.coordinatorMemberName,
            nodes: payload.team.members.map(
              (member) =>
                new TeamMember({
                  memberName: member.memberName,
                  referenceId: member.agentId,
                  referenceType: TeamNodeType.AGENT,
                }),
            ),
          }) as AgentTeamDefinition & { id: string };
          existingById.set(
            payload.teamId,
            createdTeam,
          );
        } else {
          summary.updated += 1;
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

  private async readPromptVersions(agentId: string): Promise<Record<string, string>> {
    const versions: Record<string, string> = {};
    let files: string[] = [];
    try {
      files = await fs.readdir(getAgentDir(agentId));
    } catch {
      return versions;
    }
    for (const file of files) {
      const match = /^prompt-v(\d+)\.md$/.exec(file);
      if (!match || !match[1]) {
        continue;
      }
      try {
        versions[match[1]] = await fs.readFile(path.join(getAgentDir(agentId), file), "utf-8");
      } catch {
        // ignore unreadable version file
      }
    }
    return versions;
  }

  private async writeAgentFolder(agentId: string, payload: SyncAgentDefinition): Promise<void> {
    const agentDir = getAgentDir(agentId);
    await fs.mkdir(agentDir, { recursive: true });
    const agentJson = {
      name: payload.agent.name,
      role: payload.agent.role,
      description: payload.agent.description,
      avatarUrl: payload.agent.avatarUrl ?? null,
      activePromptVersion: payload.agent.activePromptVersion,
      toolNames: payload.agent.toolNames ?? [],
      inputProcessorNames: payload.agent.inputProcessorNames ?? [],
      llmResponseProcessorNames: payload.agent.llmResponseProcessorNames ?? [],
      systemPromptProcessorNames: payload.agent.systemPromptProcessorNames ?? [],
      toolExecutionResultProcessorNames: payload.agent.toolExecutionResultProcessorNames ?? [],
      toolInvocationPreprocessorNames: payload.agent.toolInvocationPreprocessorNames ?? [],
      lifecycleProcessorNames: payload.agent.lifecycleProcessorNames ?? [],
      skillNames: payload.agent.skillNames ?? [],
    };
    await fs.writeFile(getAgentJsonPath(agentId), toJson(agentJson), "utf-8");

    let existing: string[] = [];
    try {
      existing = await fs.readdir(agentDir);
    } catch {
      existing = [];
    }
    for (const name of existing) {
      if (/^prompt-v\d+\.md$/.test(name)) {
        await fs.unlink(path.join(agentDir, name)).catch(() => undefined);
      }
    }

    const sortedVersions = Object.keys(payload.promptVersions ?? {}).sort((a, b) => Number(a) - Number(b));
    for (const version of sortedVersions) {
      await fs.writeFile(
        path.join(agentDir, `prompt-v${version}.md`),
        payload.promptVersions[version] ?? "",
        "utf-8",
      );
    }
  }

  private async writeTeamFolder(teamId: string, payload: SyncAgentTeamDefinition): Promise<void> {
    const teamDir = getTeamDir(teamId);
    await fs.mkdir(teamDir, { recursive: true });
    const teamJson = {
      name: payload.team.name,
      description: payload.team.description,
      coordinatorMemberName: payload.team.coordinatorMemberName,
      role: payload.team.role ?? null,
      avatarUrl: payload.team.avatarUrl ?? null,
      members: (payload.team.members ?? []).map((member) => ({
        memberName: member.memberName,
        agentId: member.agentId,
      })),
    };
    await fs.writeFile(getTeamJsonPath(teamId), toJson(teamJson), "utf-8");
  }
}
