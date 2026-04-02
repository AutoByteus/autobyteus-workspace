import {
  AgentConfig,
  AgentTeamConfig,
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
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentDefinitionService } from "../../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinition } from "../../../agent-team-definition/domain/models.js";
import { AgentTeamDefinitionService } from "../../../agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
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
import { TeamMemberMemoryLayout } from "../../../agent-memory/store/team-member-memory-layout.js";
import { SkillService } from "../../../skills/services/skill-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { AgentTeamCreationError } from "../../errors.js";
import { AutoByteusTeamRunBackend } from "./autobyteus-team-run-backend.js";
import {
  AutoByteusTeamMemberContext,
  AutoByteusTeamRunContext,
} from "./autobyteus-team-run-context.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import type { TeamRunBackend } from "../team-run-backend.js";
import { AutoByteusAgentConfigBuilder } from "./autobyteus-agent-config-builder.js";
import type { TeamProcessorRegistries } from "./team-processor-registries.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type TeamFactoryLike = typeof defaultAgentTeamFactory;
type LlmFactoryLike = typeof LLMFactory;

export type AutoByteusTeamLike = {
  teamId: string;
  context?: {
    agents?: Array<{
      agentId?: string | null;
      context?: {
        config?: {
          name?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
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

export type AutoByteusTeamRunBackendFactoryOptions = {
  teamFactory?: TeamFactoryLike;
  teamDefinitionService?: AgentTeamDefinitionService;
  agentDefinitionService?: AgentDefinitionService;
  llmFactory?: LlmFactoryLike;
  workspaceManager?: WorkspaceManager;
  skillService?: SkillService;
  registries?: Partial<TeamProcessorRegistries>;
  waitForIdle?: (team: AutoByteusTeamLike, timeout?: number) => Promise<void>;
  memoryDir?: string;
};

export class AutoByteusTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly teamFactory: TeamFactoryLike;
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly llmFactory: LlmFactoryLike;
  private readonly workspaceManager: WorkspaceManager;
  private readonly skillService: SkillService;
  private readonly registries: TeamProcessorRegistries;
  private readonly waitForIdle: (team: AutoByteusTeamLike, timeout?: number) => Promise<void>;
  private readonly memberLayout: TeamMemberMemoryLayout;
  private readonly agentConfigBuilder: AutoByteusAgentConfigBuilder;

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
    this.memberLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
    this.agentConfigBuilder = new AutoByteusAgentConfigBuilder({
      agentDefinitionService: this.agentDefinitionService,
      llmFactory: this.llmFactory,
      workspaceManager: this.workspaceManager,
      skillService: this.skillService,
      registries: this.registries,
    });
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

  private async createRuntimeTeam(
    config: TeamRunConfig,
    preferredTeamRunId: string | null,
  ): Promise<AutoByteusTeamLike> {
    const initialTeamConfig = await this.buildTeamConfigFromDefinition(
      config.teamDefinitionId,
      this.buildMemberConfigsMap(config.memberConfigs),
      new Set(),
    );
    const desiredTeamRunId = preferredTeamRunId ?? generateTeamRunId(initialTeamConfig.name);
    const runtimeReadyConfig = this.attachRuntimeMemberIdentity(config, desiredTeamRunId);
    await this.memberLayout.ensureLocalMemberSubtrees(
      desiredTeamRunId,
      runtimeReadyConfig.memberConfigs.map((memberConfig) => memberConfig.memberRunId ?? ""),
    );
    const teamConfig = await this.buildTeamConfigFromDefinition(
      runtimeReadyConfig.teamDefinitionId,
      this.buildMemberConfigsMap(runtimeReadyConfig.memberConfigs),
      new Set(),
    );

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

  private buildMemberConfigsMap(
    memberConfigs: TeamMemberRunConfig[],
  ): Record<string, TeamMemberRunConfig> {
    const memberConfigsMap: Record<string, TeamMemberRunConfig> = {};
    for (const memberConfig of memberConfigs) {
      memberConfigsMap[memberConfig.memberName] = memberConfig;
      if (
        typeof memberConfig.memberRouteKey === "string" &&
        memberConfig.memberRouteKey.trim()
      ) {
        memberConfigsMap[normalizeMemberRouteKey(memberConfig.memberRouteKey)] = memberConfig;
      }
    }
    return memberConfigsMap;
  }

  private attachRuntimeMemberIdentity(
    config: TeamRunConfig,
    teamRunId: string,
  ): TeamRunConfig {
    return new TeamRunConfig({
      teamDefinitionId: config.teamDefinitionId,
      runtimeKind: config.runtimeKind,
      memberConfigs: config.memberConfigs.map((memberConfig) => {
        const memberRouteKey = normalizeMemberRouteKey(
          memberConfig.memberRouteKey ?? memberConfig.memberName,
        );
        const memberRunId =
          typeof memberConfig.memberRunId === "string" && memberConfig.memberRunId.trim().length > 0
            ? memberConfig.memberRunId.trim()
            : buildTeamMemberRunId(teamRunId, memberRouteKey);
        const memoryDir =
          typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
            ? memberConfig.memoryDir.trim()
            : this.memberLayout.getMemberDirPath(teamRunId, memberRunId);
        return {
          ...memberConfig,
          memberRouteKey,
          memberRunId,
          memoryDir,
        };
      }),
    });
  }

  getTeam(teamRunId: string): AutoByteusTeamLike | null {
    return (this.teamFactory.getTeam(teamRunId) as AutoByteusTeamLike | undefined) ?? null;
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
    const runtimeContext = this.buildRuntimeContext(team, config);
    const memberRunIdsByName = new Map(
      runtimeContext.memberContexts.map((memberContext) => [
        memberContext.memberName,
        memberContext.memberRunId,
      ]),
    );
    return new AutoByteusTeamRunBackend(team, {
      isActive: () => this.getTeam(team.teamId) !== null,
      removeTeamRun: async (runId: string) => this.removeTeamRun(runId),
      memberRunIdsByName,
      runtimeContext,
    });
  }

  private buildRuntimeContext(
    team: AutoByteusTeamLike,
    config: TeamRunConfig,
  ): AutoByteusTeamRunContext {
    const liveAgents = Array.isArray(team.context?.agents) ? team.context?.agents ?? [] : [];
    const memberContexts = config.memberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const memberRunId =
        typeof memberConfig.memberRunId === "string" && memberConfig.memberRunId.trim().length > 0
          ? memberConfig.memberRunId.trim()
          : buildTeamMemberRunId(team.teamId, memberRouteKey);
      const nativeAgentId =
        liveAgents.find(
          (agent) => agent?.context?.config?.name?.trim() === memberConfig.memberName,
        )?.agentId ?? null;
      return new AutoByteusTeamMemberContext({
        memberName: memberConfig.memberName,
        memberRouteKey,
        memberRunId,
        nativeAgentId: typeof nativeAgentId === "string" && nativeAgentId.trim().length > 0
          ? nativeAgentId.trim()
          : null,
      });
    });

    return new AutoByteusTeamRunContext({
      coordinatorMemberRouteKey: null,
      memberContexts,
    });
  }

  private async buildTeamConfigFromDefinition(
    teamDefinitionId: string,
    memberConfigsMap: Record<string, TeamMemberRunConfig>,
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
        const resolvedAgentDefinitionId = member.refScope === "team_local"
          ? buildTeamLocalAgentDefinitionId(teamDefinitionId, member.ref)
          : member.ref;
        hydratedConfigs[member.memberName] = await this.agentConfigBuilder.build(
          member.memberName,
          resolvedAgentDefinitionId,
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
