import {
  AgentConfig,
  AgentTeamConfig,
  BaseAgentUserInputMessageProcessor,
  BaseLLMResponseProcessor,
  BaseLifecycleEventProcessor,
  BaseSystemPromptProcessor,
  BaseToolExecutionResultProcessor,
  BaseToolInvocationPreprocessor,
  TeamNodeConfig,
  defaultAgentTeamFactory,
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultLifecycleEventProcessorRegistry,
  defaultSystemPromptProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  LLMFactory,
} from "autobyteus-ts";
import { waitForTeamToBeIdle } from "autobyteus-ts/agent-team/utils/wait-for-idle.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentDefinition } from "../../../agent-definition/domain/models.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import { mergeMandatoryAndOptional } from "../../../agent-definition/utils/processor-defaults.js";
import type { AgentTeamDefinition } from "../../../agent-team-definition/domain/models.js";
import { AgentTeamDefinitionService } from "../../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamRun } from "../../domain/team-run.js";
import {
  TeamRunConfig,
  type TeamMemberRunConfig,
} from "../../domain/team-run-config.js";
import type { RuntimeTeamRunContext, TeamRunContext } from "../../domain/team-run-context.js";
import {
  buildTeamMemberRunId,
  normalizeMemberRouteKey,
} from "../../../run-history/utils/team-member-run-id.js";
import { generateTeamRunId } from "../../../run-history/utils/team-run-id-utils.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import { TempWorkspace } from "../../../workspaces/temp-workspace.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { AgentTeamCreationError } from "../../errors.js";
import { AutoByteusTeamRunBackend } from "./autobyteus-team-run-backend.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import type { TeamRunBackend } from "../team-run-backend.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type TeamFactoryLike = typeof defaultAgentTeamFactory;
type LlmFactoryLike = typeof LLMFactory;

type ProcessorOption = { name: string; isMandatory: boolean };

type ProcessorRegistry<T> = {
  getProcessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

type PreprocessorRegistry<T> = {
  getPreprocessor: (name: string) => T | undefined;
  getOrderedProcessorOptions: () => ProcessorOption[];
};

export type TeamProcessorRegistries = {
  input: ProcessorRegistry<BaseAgentUserInputMessageProcessor>;
  llmResponse: ProcessorRegistry<BaseLLMResponseProcessor>;
  systemPrompt: ProcessorRegistry<BaseSystemPromptProcessor>;
  toolExecutionResult: ProcessorRegistry<BaseToolExecutionResultProcessor>;
  toolInvocationPreprocessor: PreprocessorRegistry<BaseToolInvocationPreprocessor>;
  lifecycle: ProcessorRegistry<BaseLifecycleEventProcessor>;
};

export type AutoByteusTeamLike = {
  teamId: string;
  notifier?: unknown;
  currentStatus?: string;
  start?: () => void;
  postMessage?: (message: AgentInputUserMessage, targetAgentName?: string | null) => Promise<void>;
  postToolExecutionApproval?: (
    agentName: string,
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void> | void;
};

export type TeamMemberConfigInput = TeamMemberRunConfig;

export type AutoByteusTeamRunBackendFactoryOptions = {
  teamFactory?: TeamFactoryLike;
  teamDefinitionService?: AgentTeamDefinitionService;
  agentDefinitionService?: AgentDefinitionService;
  llmFactory?: LlmFactoryLike;
  workspaceManager?: WorkspaceManager;
  skillService?: SkillService;
  registries?: Partial<TeamProcessorRegistries>;
  waitForIdle?: (team: AutoByteusTeamLike, timeout?: number) => Promise<void>;
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class AutoByteusTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly teamFactory: TeamFactoryLike;
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly llmFactory: LlmFactoryLike;
  private readonly workspaceManager: WorkspaceManager;
  private readonly skillService: SkillService;
  private readonly registries: TeamProcessorRegistries;
  private readonly waitForIdle: (team: AutoByteusTeamLike, timeout?: number) => Promise<void>;

  constructor(options: AutoByteusTeamRunBackendFactoryOptions = {}) {
    this.teamFactory = options.teamFactory ?? defaultAgentTeamFactory;
    this.teamDefinitionService =
      options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.llmFactory = options.llmFactory ?? LLMFactory;
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.skillService = options.skillService ?? SkillService.getInstance();
    this.registries = {
      input: options.registries?.input ?? defaultInputProcessorRegistry,
      llmResponse: options.registries?.llmResponse ?? defaultLlmResponseProcessorRegistry,
      systemPrompt: options.registries?.systemPrompt ?? defaultSystemPromptProcessorRegistry,
      toolExecutionResult:
        options.registries?.toolExecutionResult ??
        defaultToolExecutionResultProcessorRegistry,
      toolInvocationPreprocessor:
        options.registries?.toolInvocationPreprocessor ??
        defaultToolInvocationPreprocessorRegistry,
      lifecycle: options.registries?.lifecycle ?? defaultLifecycleEventProcessorRegistry,
    };
    this.waitForIdle =
      options.waitForIdle ??
      (waitForTeamToBeIdle as (team: AutoByteusTeamLike, timeout?: number) => Promise<void>);
  }

  async createBackend(
    config: TeamRunConfig,
  ): Promise<TeamRunBackend> {
    const team = await this.createRuntimeTeam(config, null);
    return this.createBackendFromTeam(team, config);
  }

  async restoreBackend(
    context: TeamRunContext<RuntimeTeamRunContext>,
  ): Promise<TeamRunBackend> {
    if (!context.config) {
      throw new Error("TeamRunContext.config is required to restore an AutoByteus team backend.");
    }

    const team = await this.createRuntimeTeam(context.config, context.runId);
    return this.createBackendFromTeam(team, context.config);
  }

  async createTeamRun(
    input: TeamRunConfig,
    preferredTeamRunId: string | null = null,
  ): Promise<TeamRun> {
    const config = input;
    const team = await this.createRuntimeTeam(config, preferredTeamRunId);
    return this.materializeTeamRun(team.teamId, config) as TeamRun;
  }

  private async createRuntimeTeam(
    config: TeamRunConfig,
    preferredTeamRunId: string | null,
  ): Promise<AutoByteusTeamLike> {
    const memberConfigsMap: Record<string, TeamMemberConfigInput> = {};
    for (const memberConfig of config.memberConfigs) {
      memberConfigsMap[memberConfig.memberName] = memberConfig;
      if (
        typeof memberConfig.memberRouteKey === "string" &&
        memberConfig.memberRouteKey.trim()
      ) {
        memberConfigsMap[normalizeMemberRouteKey(memberConfig.memberRouteKey)] = memberConfig;
      }
    }

    const teamConfig = await this.buildTeamConfigFromDefinition(
      config.teamDefinitionId,
      memberConfigsMap,
      new Set(),
    );
    const desiredTeamRunId = preferredTeamRunId ?? generateTeamRunId(teamConfig.name);

    const createTeamWithId = (this.teamFactory as { createTeamWithId?: unknown }).createTeamWithId;
    const team =
      typeof createTeamWithId === "function"
        ? (createTeamWithId.call(this.teamFactory, desiredTeamRunId, teamConfig) as AutoByteusTeamLike)
        : (this.teamFactory.createTeam(teamConfig) as AutoByteusTeamLike);

    const teamRunId = team.teamId;
    if (teamRunId !== desiredTeamRunId) {
      throw new Error(
        `Failed to create team '${desiredTeamRunId}': runtime created '${teamRunId}'.`,
      );
    }

    team.start?.();
    await this.waitForIdle(team, 120.0);

    logger.info(
      `Successfully created and started agent team '${teamConfig.name}' with ID: ${teamRunId}`,
    );
    return team;
  }

  getTeam(teamRunId: string): AutoByteusTeamLike | null {
    return (this.teamFactory.getTeam(teamRunId) as AutoByteusTeamLike | undefined) ?? null;
  }

  materializeTeamRun(teamRunId: string, config: TeamRunConfig | null): TeamRun | null {
    const team = this.getTeam(teamRunId);
    if (!team || !config) {
      return null;
    }

    const backend = this.createBackendFromTeam(team, config);

    return new TeamRun({
      runId: teamRunId,
      config,
      backend,
    });
  }

  listTeamRunIds(): string[] {
    return this.teamFactory.listActiveTeamIds();
  }

  async removeTeamRun(teamRunId: string): Promise<boolean> {
    return this.teamFactory.removeTeam(teamRunId);
  }

  private createBackendFromTeam(
    team: AutoByteusTeamLike,
    config: TeamRunConfig,
  ): AutoByteusTeamRunBackend {
    const memberRunIdsByName = new Map(
      config.memberConfigs.map((memberConfig) => [
        memberConfig.memberName,
        typeof memberConfig.memberRunId === "string" && memberConfig.memberRunId.trim().length > 0
          ? memberConfig.memberRunId.trim()
          : buildTeamMemberRunId(
              team.teamId,
              normalizeMemberRouteKey(memberConfig.memberRouteKey ?? memberConfig.memberName),
            ),
      ]),
    );
    return new AutoByteusTeamRunBackend(team, {
      isActive: () => this.getTeam(team.teamId) !== null,
      removeTeamRun: async (runId: string) => this.removeTeamRun(runId),
      memberRunIdsByName,
    });
  }

  private async buildAgentConfigFromDefinition(
    memberName: string,
    agentDefinitionId: string,
    memberConfig: TeamMemberConfigInput,
  ): Promise<AgentConfig> {
    const getFreshAgentDefinitionById = (
      this.agentDefinitionService as AgentDefinitionService & {
        getFreshAgentDefinitionById?: (definitionId: string) => Promise<AgentDefinition | null>;
      }
    ).getFreshAgentDefinitionById;
    const agentDef =
      typeof getFreshAgentDefinitionById === "function"
        ? await getFreshAgentDefinitionById.call(this.agentDefinitionService, agentDefinitionId)
        : await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    if (!agentDef) {
      throw new Error(`AgentDefinition with ID ${agentDefinitionId} not found.`);
    }

    const systemPrompt = asTrimmedString(agentDef.instructions);
    const resolvedPrompt = systemPrompt ?? agentDef.description;

    const tools = [];
    if (agentDef.toolNames?.length) {
      for (const name of agentDef.toolNames) {
        if (!defaultToolRegistry.getToolDefinition(name)) {
          logger.warn(
            `Tool '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
          );
          continue;
        }
        try {
          tools.push(defaultToolRegistry.createTool(name));
        } catch (error) {
          logger.error(
            `Failed to create tool instance for '${name}' from agent definition '${agentDef.name}': ${String(error)}`,
          );
        }
      }
    }

    const inputProcessors: BaseAgentUserInputMessageProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(agentDef.inputProcessorNames, this.registries.input)) {
      const processor = this.registries.input.getProcessor(name);
      if (processor) {
        inputProcessors.push(processor);
      } else {
        logger.warn(
          `Input processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const llmResponseProcessors: BaseLLMResponseProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.llmResponseProcessorNames,
      this.registries.llmResponse,
    )) {
      const processor = this.registries.llmResponse.getProcessor(name);
      if (processor) {
        llmResponseProcessors.push(processor);
      } else {
        logger.warn(
          `LLM response processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const systemPromptProcessors: BaseSystemPromptProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.systemPromptProcessorNames,
      this.registries.systemPrompt,
    )) {
      const processor = this.registries.systemPrompt.getProcessor(name);
      if (processor) {
        systemPromptProcessors.push(processor);
      } else {
        logger.warn(
          `System prompt processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const toolExecutionResultProcessors: BaseToolExecutionResultProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.toolExecutionResultProcessorNames,
      this.registries.toolExecutionResult,
    )) {
      const processor = this.registries.toolExecutionResult.getProcessor(name);
      if (processor) {
        toolExecutionResultProcessors.push(processor);
      } else {
        logger.warn(
          `Tool result processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const toolInvocationPreprocessors: BaseToolInvocationPreprocessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.toolInvocationPreprocessorNames,
      this.registries.toolInvocationPreprocessor,
    )) {
      const processor = this.registries.toolInvocationPreprocessor.getPreprocessor(name);
      if (processor) {
        toolInvocationPreprocessors.push(processor);
      } else {
        logger.warn(
          `Tool invocation preprocessor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    const lifecycleProcessors: BaseLifecycleEventProcessor[] = [];
    for (const name of mergeMandatoryAndOptional(
      agentDef.lifecycleProcessorNames,
      this.registries.lifecycle,
    )) {
      const processor = this.registries.lifecycle.getProcessor(name);
      if (processor) {
        lifecycleProcessors.push(processor);
      } else {
        logger.warn(
          `Lifecycle processor '${name}' defined in agent definition '${agentDef.name}' not found in registry. Skipping.`,
        );
      }
    }

    let workspaceInstance = memberConfig.workspaceId
      ? this.workspaceManager.getWorkspaceById(memberConfig.workspaceId)
      : undefined;
    if (!workspaceInstance && memberConfig.workspaceRootPath?.trim()) {
      workspaceInstance = await this.workspaceManager.ensureWorkspaceByRootPath(
        memberConfig.workspaceRootPath.trim(),
      );
    }
    const workspaceRootPath = workspaceInstance?.getBasePath?.() ?? null;

    const skillPaths: string[] = [];
    if (agentDef.skillNames?.length) {
      for (const skillName of agentDef.skillNames) {
        const skill = this.skillService.getSkill(skillName);
        if (skill) {
          skillPaths.push(skill.rootPath);
          logger.info(
            `Resolved skill '${skillName}' to path: ${skill.rootPath} for team member '${memberName}'`,
          );
        } else {
          logger.warn(
            `Skill '${skillName}' defined in agent definition '${agentDef.name}' not found via SkillService. Skipping.`,
          );
        }
      }
    }

    const config = memberConfig.llmConfig ? new LLMConfig({ extraParams: memberConfig.llmConfig }) : undefined;
    const llmInstance = await this.llmFactory.createLLM(memberConfig.llmModelIdentifier, config);

    const initialCustomData = {
      agent_definition_id: agentDefinitionId,
      member_route_key:
        typeof memberConfig.memberRouteKey === "string" && memberConfig.memberRouteKey.trim().length > 0
          ? normalizeMemberRouteKey(memberConfig.memberRouteKey)
          : normalizeMemberRouteKey(memberName),
      member_run_id:
        typeof memberConfig.memberRunId === "string" && memberConfig.memberRunId.trim().length > 0
          ? memberConfig.memberRunId.trim()
          : null,
      is_first_user_turn: true,
      workspace_id: workspaceInstance?.workspaceId ?? null,
      workspace_root_path: workspaceRootPath,
      workspace_name: workspaceInstance?.getName?.() ?? workspaceInstance?.workspaceId ?? null,
      workspace_is_temp: workspaceInstance?.workspaceId === TempWorkspace.TEMP_WORKSPACE_ID,
    };

    const memoryDir =
      typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
        ? memberConfig.memoryDir.trim()
        : null;

    return new AgentConfig(
      memberName,
      agentDef.role ?? "",
      agentDef.description,
      llmInstance,
      resolvedPrompt,
      tools,
      memberConfig.autoExecuteTools,
      inputProcessors,
      llmResponseProcessors,
      systemPromptProcessors,
      toolExecutionResultProcessors,
      toolInvocationPreprocessors,
      workspaceRootPath,
      lifecycleProcessors,
      initialCustomData,
      skillPaths,
      memoryDir,
    );
  }

  private async buildTeamConfigFromDefinition(
    teamDefinitionId: string,
    memberConfigsMap: Record<string, TeamMemberConfigInput>,
    visited: Set<string>,
  ): Promise<AgentTeamConfig> {
    if (visited.has(teamDefinitionId)) {
      throw new AgentTeamCreationError(
        `Circular dependency detected in team definitions involving ID: ${teamDefinitionId}`,
      );
    }
    visited.add(teamDefinitionId);

    const getFreshDefinitionById = (
      this.teamDefinitionService as AgentTeamDefinitionService & {
        getFreshDefinitionById?: (definitionId: string) => Promise<AgentTeamDefinition | null>;
      }
    ).getFreshDefinitionById;
    const teamDef =
      typeof getFreshDefinitionById === "function"
        ? await getFreshDefinitionById.call(this.teamDefinitionService, teamDefinitionId)
        : await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!teamDef) {
      throw new Error(`AgentTeamDefinition with ID ${teamDefinitionId} not found.`);
    }

    const hydratedConfigs: Record<string, AgentConfig | AgentTeamConfig> = {};
    for (const member of teamDef.nodes) {
      if (member.refType === "agent") {
        const memberConfig =
          memberConfigsMap[member.memberName] ??
          memberConfigsMap[normalizeMemberRouteKey(member.memberName)];
        if (!memberConfig) {
          throw new AgentTeamCreationError(
            `Configuration for team member '${member.memberName}' was not provided.`,
          );
        }
        hydratedConfigs[member.memberName] = await this.buildAgentConfigFromDefinition(
          member.memberName,
          member.ref,
          memberConfig,
        );
      } else if (member.refType === "agent_team") {
        const nestedConfig = await this.buildTeamConfigFromDefinition(
          member.ref,
          memberConfigsMap,
          new Set(visited),
        );
        hydratedConfigs[member.memberName] = this.aliasSubTeamConfig(
          member.memberName,
          nestedConfig,
        );
      }
    }

    const teamNodeMap = new Map<string, TeamNodeConfig>();
    for (const [memberName, config] of Object.entries(hydratedConfigs)) {
      teamNodeMap.set(memberName, new TeamNodeConfig({ nodeDefinition: config }));
    }

    const coordinatorNode = teamNodeMap.get(teamDef.coordinatorMemberName);
    if (!coordinatorNode) {
      throw new Error(
        `Coordinator member name '${teamDef.coordinatorMemberName}' not found in team '${teamDef.name}'.`,
      );
    }
    if (!(coordinatorNode.nodeDefinition instanceof AgentConfig)) {
      throw new AgentTeamCreationError(
        `The designated coordinator '${coordinatorNode.name}' must be an AGENT, but is a TEAM.`,
      );
    }

    return new AgentTeamConfig({
      name: teamDef.name,
      description: teamDef.description,
      role: null,
      nodes: Array.from(teamNodeMap.values()),
      coordinatorNode,
    });
  }

  private aliasSubTeamConfig(memberName: string, config: AgentTeamConfig): AgentTeamConfig {
    if (config.name === memberName) {
      return config;
    }

    return new AgentTeamConfig({
      name: memberName,
      description: config.description,
      role: config.role ?? null,
      nodes: config.nodes,
      coordinatorNode: config.coordinatorNode,
    });
  }
}

let cachedAutoByteusTeamRunBackendFactory: AutoByteusTeamRunBackendFactory | null = null;

export const getAutoByteusTeamRunBackendFactory = (): AutoByteusTeamRunBackendFactory => {
  if (!cachedAutoByteusTeamRunBackendFactory) {
    cachedAutoByteusTeamRunBackendFactory = new AutoByteusTeamRunBackendFactory();
  }
  return cachedAutoByteusTeamRunBackendFactory;
};
