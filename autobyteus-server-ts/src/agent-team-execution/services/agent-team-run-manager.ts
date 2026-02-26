import {
  AgentConfig,
  AgentTeamConfig,
  AgentTeamEventStream,
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
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { NodeType } from "../../agent-team-definition/domain/enums.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { PromptLoader, getPromptLoader } from "../../prompt-engineering/utils/prompt-loader.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { WorkspaceManager, getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentTeamCreationError, AgentTeamTerminationError } from "../errors.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-agent-id.js";
import { TeamMemberConfigHydrationService } from "./team-member-config-hydration-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const EMBEDDED_LOCAL_NODE_ID = "embedded-local";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isMemberLocalToNode = (memberHomeNodeId: string | null | undefined): boolean => {
  const normalizedHomeNodeId = normalizeOptionalString(memberHomeNodeId);
  if (!normalizedHomeNodeId || normalizedHomeNodeId === EMBEDDED_LOCAL_NODE_ID) {
    return true;
  }
  const localNodeId = normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID);
  return !!localNodeId && normalizedHomeNodeId === localNodeId;
};

const resolveEffectiveMemberHomeNodeId = (input: {
  definitionHomeNodeId: string | null | undefined;
  bindingHostNodeId: string | null | undefined;
}): string | null => {
  const normalizedBindingHostNodeId = normalizeOptionalString(input.bindingHostNodeId);
  if (normalizedBindingHostNodeId) {
    return normalizedBindingHostNodeId;
  }
  return normalizeOptionalString(input.definitionHomeNodeId);
};

const cloneMemberConfigInput = (config: TeamMemberConfigInput): TeamMemberConfigInput => {
  const cloned: TeamMemberConfigInput = {
    memberName: config.memberName,
    agentDefinitionId: config.agentDefinitionId,
    llmModelIdentifier: config.llmModelIdentifier,
    autoExecuteTools: config.autoExecuteTools,
    workspaceId: config.workspaceId ?? null,
    workspaceRootPath: config.workspaceRootPath ?? null,
    llmConfig: config.llmConfig ? { ...config.llmConfig } : null,
  };
  if (typeof config.memberRouteKey === "string") {
    cloned.memberRouteKey = config.memberRouteKey;
  }
  if (typeof config.memberAgentId === "string") {
    cloned.memberAgentId = config.memberAgentId;
  }
  if (typeof config.memoryDir === "string") {
    cloned.memoryDir = config.memoryDir;
  }
  if (typeof config.hostNodeId === "string") {
    cloned.hostNodeId = config.hostNodeId;
  }
  return cloned;
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

type ProcessorRegistries = {
  input: ProcessorRegistry<BaseAgentUserInputMessageProcessor>;
  llmResponse: ProcessorRegistry<BaseLLMResponseProcessor>;
  systemPrompt: ProcessorRegistry<BaseSystemPromptProcessor>;
  toolExecutionResult: ProcessorRegistry<BaseToolExecutionResultProcessor>;
  toolInvocationPreprocessor: PreprocessorRegistry<BaseToolInvocationPreprocessor>;
  lifecycle: ProcessorRegistry<BaseLifecycleEventProcessor>;
};

type TeamLike = {
  teamId: string;
  notifier?: unknown;
};

export type TeamMemberConfigInput = {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberAgentId?: string | null;
  memoryDir?: string | null;
  hostNodeId?: string | null;
};

type TeamRunCreationMode = "strict" | "worker-projection";

type AgentTeamRunManagerOptions = {
  teamFactory?: TeamFactoryLike;
  teamDefinitionService?: AgentTeamDefinitionService;
  agentDefinitionService?: AgentDefinitionService;
  llmFactory?: LlmFactoryLike;
  workspaceManager?: WorkspaceManager;
  skillService?: SkillService;
  promptLoader?: PromptLoader;
  registries?: Partial<ProcessorRegistries>;
  waitForIdle?: (team: TeamLike, timeout?: number) => Promise<void>;
};

export class AgentTeamRunManager {
  private static instance: AgentTeamRunManager | null = null;
  private readonly teamDefinitionIdByTeamId = new Map<string, string>();
  private readonly teamIdByTeamDefinitionId = new Map<string, string>();
  private readonly memberConfigsByTeamDefinitionId = new Map<string, TeamMemberConfigInput[]>();
  private readonly memberConfigsByTeamId = new Map<string, TeamMemberConfigInput[]>();
  private readonly memberNamesByTeamId = new Map<string, string[]>();
  private teamFactory: TeamFactoryLike;
  private teamDefinitionService: AgentTeamDefinitionService;
  private registries: ProcessorRegistries;
  private readonly hydrationService: TeamMemberConfigHydrationService;
  private waitForIdle: (team: TeamLike, timeout?: number) => Promise<void>;

  static getInstance(options: AgentTeamRunManagerOptions = {}): AgentTeamRunManager {
    if (!AgentTeamRunManager.instance) {
      AgentTeamRunManager.instance = new AgentTeamRunManager(options);
    }
    return AgentTeamRunManager.instance;
  }

  constructor(options: AgentTeamRunManagerOptions = {}) {
    this.teamFactory = options.teamFactory ?? defaultAgentTeamFactory;
    this.teamDefinitionService =
      options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    const agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    const llmFactory = options.llmFactory ?? LLMFactory;
    const workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    const skillService = options.skillService ?? SkillService.getInstance();
    const promptLoader = options.promptLoader ?? getPromptLoader();
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
    this.hydrationService = new TeamMemberConfigHydrationService({
      agentDefinitionService,
      llmFactory,
      workspaceManager,
      skillService,
      promptLoader,
      registries: this.registries,
    });
    this.waitForIdle = options.waitForIdle ?? waitForTeamToBeIdle;
    logger.info("AgentTeamRunManager initialized.");
  }

  async createTeamRun(
    teamDefinitionId: string,
    memberConfigs: TeamMemberConfigInput[],
  ): Promise<string> {
    return this.createTeamRunInternal({
      teamDefinitionId,
      memberConfigs,
      preferredTeamId: null,
      creationMode: "strict",
    });
  }

  async createTeamRunWithId(
    teamId: string,
    teamDefinitionId: string,
    memberConfigs: TeamMemberConfigInput[],
  ): Promise<string> {
    return this.createTeamRunInternal({
      teamDefinitionId,
      memberConfigs,
      preferredTeamId: teamId,
      creationMode: "strict",
    });
  }

  async createWorkerProjectionTeamRunWithId(
    teamId: string,
    teamDefinitionId: string,
    memberConfigs: TeamMemberConfigInput[],
  ): Promise<string> {
    return this.createTeamRunInternal({
      teamDefinitionId,
      memberConfigs,
      preferredTeamId: teamId,
      creationMode: "worker-projection",
    });
  }

  private async createTeamRunInternal(input: {
    teamDefinitionId: string;
    memberConfigs: TeamMemberConfigInput[];
    preferredTeamId: string | null;
    creationMode: TeamRunCreationMode;
  }): Promise<string> {
    logger.info(
      `Attempting to create agent team run from definition ID: ${input.teamDefinitionId}`,
    );

    try {
      const memberConfigSnapshots = input.memberConfigs.map((config) => cloneMemberConfigInput(config));
      const memberConfigsMap: Record<string, TeamMemberConfigInput> = {};
      for (const config of memberConfigSnapshots) {
        memberConfigsMap[config.memberName] = config;
        if (typeof config.memberRouteKey === "string" && config.memberRouteKey.trim()) {
          const normalizedRouteKey = normalizeMemberRouteKey(config.memberRouteKey);
          memberConfigsMap[normalizedRouteKey] = config;
        }
      }

      const teamConfig = await this.buildTeamConfigFromDefinition(
        input.teamDefinitionId,
        memberConfigsMap,
        new Set(),
        "",
        input.creationMode,
      );

      const createTeamWithId = (this.teamFactory as any).createTeamWithId;
      const team =
        input.preferredTeamId && typeof createTeamWithId === "function"
          ? (createTeamWithId.call(this.teamFactory, input.preferredTeamId, teamConfig) as TeamLike & {
              start?: () => void;
            })
          : (this.teamFactory.createTeam(teamConfig) as TeamLike & {
              start?: () => void;
            });
      const teamMemberNames = teamConfig.nodes.map((node) => node.name);
      this.teamDefinitionIdByTeamId.set(team.teamId, input.teamDefinitionId);
      this.teamIdByTeamDefinitionId.set(input.teamDefinitionId, team.teamId);
      this.memberConfigsByTeamDefinitionId.set(input.teamDefinitionId, memberConfigSnapshots);
      this.memberConfigsByTeamId.set(team.teamId, memberConfigSnapshots);
      this.memberNamesByTeamId.set(team.teamId, teamMemberNames);
      team.start?.();
      await this.waitForIdle(team, 120.0);

      logger.info(
        `Successfully created and started agent team '${teamConfig.name}' with ID: ${team.teamId}`,
      );
      return team.teamId;
    } catch (error) {
      logger.error(
        `Failed to create agent team from definition ID '${input.teamDefinitionId}': ${String(error)}`,
      );
      if (error instanceof AgentTeamCreationError) {
        throw error;
      }
      throw new AgentTeamCreationError(`Failed to create agent team: ${String(error)}`);
    }
  }

  private async buildTeamConfigFromDefinition(
    teamDefinitionId: string,
    memberConfigsMap: Record<string, TeamMemberConfigInput>,
    visited: Set<string>,
    routePrefix: string = "",
    creationMode: TeamRunCreationMode = "strict",
  ): Promise<AgentTeamConfig> {
    if (visited.has(teamDefinitionId)) {
      throw new AgentTeamCreationError(
        `Circular dependency detected in team definitions involving ID: ${teamDefinitionId}`,
      );
    }
    visited.add(teamDefinitionId);

    const teamDef = await this.teamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!teamDef) {
      throw new Error(`AgentTeamDefinition with ID ${teamDefinitionId} not found.`);
    }

    const hydratedConfigs: Record<string, AgentConfig | AgentTeamConfig> = {};
    for (const member of teamDef.nodes) {
      const memberRouteKey = routePrefix
        ? normalizeMemberRouteKey(`${routePrefix}/${member.memberName}`)
        : normalizeMemberRouteKey(member.memberName);
      if (member.referenceType === NodeType.AGENT) {
        const memberConfig = memberConfigsMap[memberRouteKey] ?? memberConfigsMap[member.memberName];
        if (!memberConfig) {
          throw new AgentTeamCreationError(
            `Configuration for team member '${member.memberName}' was not provided.`,
          );
        }
        const effectiveMemberHomeNodeId = resolveEffectiveMemberHomeNodeId({
          definitionHomeNodeId: member.homeNodeId,
          bindingHostNodeId: memberConfig.hostNodeId,
        });
        const memberIsLocalToCurrentNode = isMemberLocalToNode(effectiveMemberHomeNodeId);
        const normalizedHomeNodeId = effectiveMemberHomeNodeId;
        const memberIsDistributedHomeBound =
          normalizedHomeNodeId !== null &&
          normalizedHomeNodeId !== EMBEDDED_LOCAL_NODE_ID;
        if (
          memberIsDistributedHomeBound &&
          !memberIsLocalToCurrentNode &&
          creationMode === "strict" &&
          !normalizeOptionalString(memberConfig.workspaceRootPath)
        ) {
          throw new AgentTeamCreationError(
            `Remote member '${member.memberName}' requires workspaceRootPath for home node '${normalizedHomeNodeId}'.`,
          );
        }
        const requiresLocalWorkspacePath =
          memberIsDistributedHomeBound &&
          memberIsLocalToCurrentNode &&
          !normalizeOptionalString(memberConfig.workspaceId);
        if (requiresLocalWorkspacePath && !normalizeOptionalString(memberConfig.workspaceRootPath)) {
          throw new AgentTeamCreationError(
            `Remote member '${member.memberName}' requires workspaceRootPath on node '${normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID) ?? "local"}'.`,
          );
        }
        hydratedConfigs[member.memberName] = await this.hydrationService.buildAgentConfigFromDefinition(
          {
            memberName: member.memberName,
            agentDefinitionId: member.referenceId,
            memberConfig,
            memberRouteKey,
            memberHomeNodeId: effectiveMemberHomeNodeId,
          },
        );
      } else if (member.referenceType === NodeType.AGENT_TEAM) {
        hydratedConfigs[member.memberName] = await this.buildTeamConfigFromDefinition(
          member.referenceId,
          memberConfigsMap,
          new Set(visited),
          memberRouteKey,
          creationMode,
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
      throw new TypeError(
        `The designated coordinator '${coordinatorNode.name}' must be an AGENT, but is a TEAM.`,
      );
    }

    return new AgentTeamConfig({
      name: teamDef.name,
      description: teamDef.description,
      role: teamDef.role ?? null,
      nodes: Array.from(teamNodeMap.values()),
      coordinatorNode,
    });
  }

  getTeamRun(teamId: string): TeamLike | null {
    return (this.teamFactory.getTeam(teamId) as TeamLike | undefined) ?? null;
  }

  listActiveRuns(): string[] {
    return this.teamFactory.listActiveTeamIds();
  }

  async terminateTeamRun(teamId: string): Promise<boolean> {
    try {
      const removed = await this.teamFactory.removeTeam(teamId);
      if (removed) {
        const definitionId = this.teamDefinitionIdByTeamId.get(teamId) ?? null;
        this.teamDefinitionIdByTeamId.delete(teamId);
        this.memberConfigsByTeamId.delete(teamId);
        this.memberNamesByTeamId.delete(teamId);
        if (definitionId && this.teamIdByTeamDefinitionId.get(definitionId) === teamId) {
          this.teamIdByTeamDefinitionId.delete(definitionId);
          this.memberConfigsByTeamDefinitionId.delete(definitionId);
        }
      }
      return removed;
    } catch (error) {
      logger.error(`Failed to terminate team '${teamId}': ${String(error)}`);
      if (error instanceof AgentTeamTerminationError) {
        throw error;
      }
      throw new AgentTeamTerminationError(`Failed to terminate team: ${String(error)}`);
    }
  }

  getTeamDefinitionId(teamId: string): string | null {
    return this.teamDefinitionIdByTeamId.get(teamId) ?? null;
  }

  getTeamIdByDefinitionId(teamDefinitionId: string): string | null {
    return this.teamIdByTeamDefinitionId.get(teamDefinitionId) ?? null;
  }

  getTeamMemberConfigsByDefinitionId(teamDefinitionId: string): TeamMemberConfigInput[] {
    const configs = this.memberConfigsByTeamDefinitionId.get(teamDefinitionId);
    if (!Array.isArray(configs)) {
      return [];
    }
    return configs.map((config) => cloneMemberConfigInput(config));
  }

  getTeamMemberConfigs(teamId: string): TeamMemberConfigInput[] {
    const configs = this.memberConfigsByTeamId.get(teamId);
    if (!Array.isArray(configs)) {
      return [];
    }
    return configs.map((config) => cloneMemberConfigInput(config));
  }

  getTeamMemberNames(teamId: string): string[] {
    const names = this.memberNamesByTeamId.get(teamId);
    return Array.isArray(names) ? [...names] : [];
  }

  getTeamEventStream(teamId: string): AgentTeamEventStream | null {
    const team = this.getTeamRun(teamId);
    if (!team) {
      logger.warn(
        `AgentTeamRunManager: Attempted to get event stream for non-existent team_id '${teamId}'.`,
      );
      return null;
    }
    return new AgentTeamEventStream(team as any);
  }
}
