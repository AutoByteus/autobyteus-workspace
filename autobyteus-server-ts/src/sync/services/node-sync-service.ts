import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  type BaseMcpConfig,
} from 'autobyteus-ts';
import type { AgentDefinition } from '../../agent-definition/domain/models.js';
import { AgentDefinitionService } from '../../agent-definition/services/agent-definition-service.js';
import {
  AgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember,
} from '../../agent-team-definition/domain/models.js';
import { NodeType as TeamNodeType } from '../../agent-team-definition/domain/enums.js';
import { AgentTeamDefinitionService } from '../../agent-team-definition/services/agent-team-definition-service.js';
import type { Prompt } from '../../prompt-engineering/domain/models.js';
import {
  getMcpConfigService,
  type McpConfigService,
} from '../../mcp-server-management/services/mcp-config-service.js';
import { PromptService } from '../../prompt-engineering/services/prompt-service.js';
import { NodeSyncSelectionService } from './node-sync-selection-service.js';
import type {
  NodeSyncSelectionSpec,
  ResolvedNodeSyncSelection,
} from './node-sync-selection-service.js';

export type SyncEntityType =
  | 'prompt'
  | 'agent_definition'
  | 'agent_team_definition'
  | 'mcp_server_configuration';

export type SyncConflictPolicy = 'source_wins' | 'target_wins';
export type SyncTombstonePolicy = 'source_delete_wins';

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

type SyncPrompt = {
  key: string;
  name: string;
  category: string;
  promptContent: string;
  description?: string | null;
  suitableForModels?: string | null;
  version: number;
  isActive: boolean;
};

type SyncAgentDefinition = {
  name: string;
  role: string;
  description: string;
  avatarUrl?: string | null;
  systemPromptCategory: string;
  systemPromptName: string;
  toolNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  skillNames?: string[];
};

type SyncTeamMember = {
  memberName: string;
  referenceId: string;
  referenceType: TeamNodeType;
  homeNodeId?: string | null;
};

type SyncAgentTeamDefinition = {
  name: string;
  description: string;
  role?: string | null;
  avatarUrl?: string | null;
  coordinatorMemberName: string;
  nodes: SyncTeamMember[];
};

type SyncMcpServerConfiguration =
  | {
      serverId: string;
      transportType: 'stdio';
      enabled: boolean;
      toolNamePrefix?: string | null;
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string | null;
    }
  | {
      serverId: string;
      transportType: 'streamable_http';
      enabled: boolean;
      toolNamePrefix?: string | null;
      url: string;
    };

function nowWatermark(): string {
  return new Date().toISOString();
}

function promptKey(input: {
  name: string;
  category: string;
  version: number;
  suitableForModels?: string | null;
}): string {
  return `${input.category}::${input.name}::${input.version}::${input.suitableForModels ?? ''}`;
}

function promptFamilyKey(input: { name: string; category: string }): string {
  return `${input.category}::${input.name}`;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function asRecordStringString(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    typeof entry === 'string' ? entry : String(entry),
  ]);
  return Object.fromEntries(entries);
}

type PromptServiceLike = {
  findPrompts: PromptService['findPrompts'];
  createPrompt: PromptService['createPrompt'];
  markActivePrompt: PromptService['markActivePrompt'];
  updatePrompt: PromptService['updatePrompt'];
};

type AgentDefinitionServiceLike = {
  getAllAgentDefinitions: AgentDefinitionService['getAllAgentDefinitions'];
  createAgentDefinition: AgentDefinitionService['createAgentDefinition'];
  updateAgentDefinition: AgentDefinitionService['updateAgentDefinition'];
};

type AgentTeamDefinitionServiceLike = {
  getAllDefinitions: AgentTeamDefinitionService['getAllDefinitions'];
  createDefinition: AgentTeamDefinitionService['createDefinition'];
  updateDefinition: AgentTeamDefinitionService['updateDefinition'];
};

type McpConfigServiceLike = {
  getAllMcpServers: McpConfigService['getAllMcpServers'];
  configureMcpServer: McpConfigService['configureMcpServer'];
};

type NodeSyncServiceOptions = {
  promptService?: PromptServiceLike;
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

  private readonly promptService: PromptServiceLike;
  private readonly agentDefinitionService: AgentDefinitionServiceLike;
  private readonly agentTeamDefinitionService: AgentTeamDefinitionServiceLike;
  private readonly mcpConfigService: McpConfigServiceLike;
  private readonly selectionService: NodeSyncSelectionService;

  constructor(options: NodeSyncServiceOptions = {}) {
    this.promptService = options.promptService ?? PromptService.getInstance();
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
    const entities: NodeSyncBundle['entities'] = {};
    const selection = await this.selectionService.resolveSelection(input.selection);

    if (scope.has('prompt')) {
      const prompts = await this.promptService.findPrompts({});
      const selectedPrompts = this.filterPromptsBySelection(prompts, selection);
      entities.prompt = selectedPrompts.map((prompt) => ({
        key: promptKey({
          name: prompt.name,
          category: prompt.category,
          version: prompt.version ?? 1,
          suitableForModels: prompt.suitableForModels ?? null,
        }),
        name: prompt.name,
        category: prompt.category,
        promptContent: prompt.promptContent,
        description: prompt.description ?? null,
        suitableForModels: prompt.suitableForModels ?? null,
        version: prompt.version ?? 1,
        isActive: prompt.isActive,
      } satisfies SyncPrompt));
    }

    if (scope.has('agent_definition')) {
      const definitions = await this.agentDefinitionService.getAllAgentDefinitions();
      const selectedDefinitions = this.filterAgentDefinitionsBySelection(definitions, selection);
      entities.agent_definition = selectedDefinitions.map((definition) => ({
        name: definition.name,
        role: definition.role,
        description: definition.description,
        avatarUrl: definition.avatarUrl ?? null,
        systemPromptCategory: definition.systemPromptCategory ?? '',
        systemPromptName: definition.systemPromptName ?? '',
        toolNames: definition.toolNames,
        inputProcessorNames: definition.inputProcessorNames,
        llmResponseProcessorNames: definition.llmResponseProcessorNames,
        systemPromptProcessorNames: definition.systemPromptProcessorNames,
        toolExecutionResultProcessorNames: definition.toolExecutionResultProcessorNames,
        toolInvocationPreprocessorNames: definition.toolInvocationPreprocessorNames,
        lifecycleProcessorNames: definition.lifecycleProcessorNames,
        skillNames: definition.skillNames,
      } satisfies SyncAgentDefinition));
    }

    if (scope.has('agent_team_definition')) {
      const teams = await this.agentTeamDefinitionService.getAllDefinitions();
      const selectedTeams = this.filterAgentTeamDefinitionsBySelection(teams, selection);
      entities.agent_team_definition = selectedTeams.map((team) => ({
        name: team.name,
        description: team.description,
        role: team.role ?? null,
        avatarUrl: team.avatarUrl ?? null,
        coordinatorMemberName: team.coordinatorMemberName,
        nodes: team.nodes.map((node) => ({
          memberName: node.memberName,
          referenceId: node.referenceId,
          referenceType: node.referenceType,
          homeNodeId: node.homeNodeId ?? 'embedded-local',
        } satisfies SyncTeamMember)),
      } satisfies SyncAgentTeamDefinition));
    }

    if (scope.has('mcp_server_configuration')) {
      const configs = selection ? [] : await this.mcpConfigService.getAllMcpServers();
      entities.mcp_server_configuration = configs.map((config) => {
        const configRecord = config as unknown as Record<string, unknown>;
        if (config.transport_type === 'stdio') {
          return {
            serverId: config.server_id,
            transportType: 'stdio',
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
          transportType: 'streamable_http',
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

  private filterPromptsBySelection(
    prompts: Prompt[],
    selection: ResolvedNodeSyncSelection | null,
  ): Prompt[] {
    if (!selection) {
      return prompts;
    }
    if (selection.promptFamilies.size === 0) {
      return [];
    }
    return prompts.filter((prompt) =>
      selection.promptFamilies.has(promptFamilyKey({ category: prompt.category, name: prompt.name })),
    );
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

    if (scopeSet.has('prompt')) {
      await this.importPrompts(
        (input.bundle.entities.prompt ?? []) as SyncPrompt[],
        input.conflictPolicy,
        summary,
        failures,
      );
    }

    if (scopeSet.has('agent_definition')) {
      await this.importAgentDefinitions(
        (input.bundle.entities.agent_definition ?? []) as SyncAgentDefinition[],
        input.conflictPolicy,
        summary,
        failures,
      );
    }

    if (scopeSet.has('agent_team_definition')) {
      await this.importAgentTeamDefinitions(
        (input.bundle.entities.agent_team_definition ?? []) as SyncAgentTeamDefinition[],
        input.conflictPolicy,
        summary,
        failures,
      );
    }

    if (scopeSet.has('mcp_server_configuration')) {
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

  private async importPrompts(
    incoming: SyncPrompt[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult['summary'],
    failures: NodeSyncImportResult['failures'],
  ): Promise<void> {
    const existingPrompts = await this.promptService.findPrompts({});
    const existingByKey = new Map<string, (typeof existingPrompts)[number]>();

    for (const prompt of existingPrompts) {
      existingByKey.set(
        promptKey({
          name: prompt.name,
          category: prompt.category,
          version: prompt.version ?? 1,
          suitableForModels: prompt.suitableForModels ?? null,
        }),
        prompt,
      );
    }

    for (const prompt of incoming) {
      summary.processed += 1;
      const key = prompt.key || promptKey(prompt);
      try {
        const existing = existingByKey.get(key);
        if (!existing) {
          const created = await this.promptService.createPrompt({
            name: prompt.name,
            category: prompt.category,
            promptContent: prompt.promptContent,
            description: prompt.description ?? null,
            suitableForModels: prompt.suitableForModels ?? null,
          });
          if (prompt.isActive && created.id) {
            await this.promptService.markActivePrompt(created.id);
          }
          summary.created += 1;
          continue;
        }

        if (conflictPolicy === 'target_wins') {
          summary.skipped += 1;
          continue;
        }

        if (!existing.id) {
          throw new Error(`Existing prompt missing id for key ${key}`);
        }

        const updated = await this.promptService.updatePrompt({
          promptId: existing.id,
          promptContent: prompt.promptContent,
          description: prompt.description ?? null,
          suitableForModels: prompt.suitableForModels ?? null,
        });

        if (prompt.isActive && updated.id) {
          await this.promptService.markActivePrompt(updated.id);
        }

        summary.updated += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({
          entityType: 'prompt',
          key,
          message,
        });
      }
    }
  }

  private async importAgentDefinitions(
    incoming: SyncAgentDefinition[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult['summary'],
    failures: NodeSyncImportResult['failures'],
  ): Promise<void> {
    const existingDefinitions = await this.agentDefinitionService.getAllAgentDefinitions();
    const existingByName = new Map(existingDefinitions.map((definition) => [definition.name, definition]));

    for (const definition of incoming) {
      summary.processed += 1;
      const key = definition.name;
      try {
        const existing = existingByName.get(definition.name);
        if (!existing) {
          await this.agentDefinitionService.createAgentDefinition({
            name: definition.name,
            role: definition.role,
            description: definition.description,
            avatarUrl: definition.avatarUrl ?? null,
            systemPromptCategory: definition.systemPromptCategory,
            systemPromptName: definition.systemPromptName,
            toolNames: definition.toolNames ?? [],
            inputProcessorNames: definition.inputProcessorNames ?? [],
            llmResponseProcessorNames: definition.llmResponseProcessorNames ?? [],
            systemPromptProcessorNames: definition.systemPromptProcessorNames ?? [],
            toolExecutionResultProcessorNames: definition.toolExecutionResultProcessorNames ?? [],
            toolInvocationPreprocessorNames: definition.toolInvocationPreprocessorNames ?? [],
            lifecycleProcessorNames: definition.lifecycleProcessorNames ?? [],
            skillNames: definition.skillNames ?? [],
          });
          summary.created += 1;
          continue;
        }

        if (conflictPolicy === 'target_wins') {
          summary.skipped += 1;
          continue;
        }

        if (!existing.id) {
          throw new Error(`Existing agent definition missing id: ${definition.name}`);
        }

        await this.agentDefinitionService.updateAgentDefinition(existing.id, {
          name: definition.name,
          role: definition.role,
          description: definition.description,
          avatarUrl: definition.avatarUrl ?? null,
          systemPromptCategory: definition.systemPromptCategory,
          systemPromptName: definition.systemPromptName,
          toolNames: definition.toolNames ?? [],
          inputProcessorNames: definition.inputProcessorNames ?? [],
          llmResponseProcessorNames: definition.llmResponseProcessorNames ?? [],
          systemPromptProcessorNames: definition.systemPromptProcessorNames ?? [],
          toolExecutionResultProcessorNames: definition.toolExecutionResultProcessorNames ?? [],
          toolInvocationPreprocessorNames: definition.toolInvocationPreprocessorNames ?? [],
          lifecycleProcessorNames: definition.lifecycleProcessorNames ?? [],
          skillNames: definition.skillNames ?? [],
        });
        summary.updated += 1;
      } catch (error) {
        failures.push({
          entityType: 'agent_definition',
          key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async importAgentTeamDefinitions(
    incoming: SyncAgentTeamDefinition[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult['summary'],
    failures: NodeSyncImportResult['failures'],
  ): Promise<void> {
    const existingTeams = await this.agentTeamDefinitionService.getAllDefinitions();
    const existingByName = new Map(existingTeams.map((team) => [team.name, team]));

    for (const team of incoming) {
      summary.processed += 1;
      const key = team.name;
      try {
        const members = team.nodes.map(
          (node) =>
            new TeamMember({
              memberName: node.memberName,
              referenceId: node.referenceId,
              referenceType: node.referenceType,
              homeNodeId: node.homeNodeId ?? 'embedded-local',
            }),
        );

        const existing = existingByName.get(team.name);
        if (!existing) {
          await this.agentTeamDefinitionService.createDefinition(
            new AgentTeamDefinition({
              name: team.name,
              description: team.description,
              role: team.role ?? null,
              avatarUrl: team.avatarUrl ?? null,
              coordinatorMemberName: team.coordinatorMemberName,
              nodes: members,
            }),
          );
          summary.created += 1;
          continue;
        }

        if (conflictPolicy === 'target_wins') {
          summary.skipped += 1;
          continue;
        }

        if (!existing.id) {
          throw new Error(`Existing agent team definition missing id: ${team.name}`);
        }

        await this.agentTeamDefinitionService.updateDefinition(
          existing.id,
          new AgentTeamDefinitionUpdate({
            name: team.name,
            description: team.description,
            role: team.role ?? null,
            avatarUrl: team.avatarUrl ?? null,
            coordinatorMemberName: team.coordinatorMemberName,
            nodes: members,
          }),
        );
        summary.updated += 1;
      } catch (error) {
        failures.push({
          entityType: 'agent_team_definition',
          key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async importMcpServerConfigurations(
    incoming: SyncMcpServerConfiguration[],
    conflictPolicy: SyncConflictPolicy,
    summary: NodeSyncImportResult['summary'],
    failures: NodeSyncImportResult['failures'],
  ): Promise<void> {
    const existingConfigs = await this.mcpConfigService.getAllMcpServers();
    const existingByServerId = new Map(existingConfigs.map((config) => [config.server_id, config]));

    for (const config of incoming) {
      summary.processed += 1;
      const key = config.serverId;
      try {
        const existing = existingByServerId.get(config.serverId);

        if (existing && conflictPolicy === 'target_wins') {
          summary.skipped += 1;
          continue;
        }

        let domainConfig: BaseMcpConfig;
        if (config.transportType === 'stdio') {
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
          entityType: 'mcp_server_configuration',
          key,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
