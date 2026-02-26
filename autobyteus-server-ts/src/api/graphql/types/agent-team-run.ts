import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { randomUUID } from "node:crypto";
import { GraphQLJSON } from "graphql-scalars";
import { TaskNotificationMode } from "autobyteus-ts/agent-team/task-notification/task-notification-mode.js";
import { AgentTeamRunManager } from "../../../agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamDefinitionService } from "../../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamRunManifest } from "../../../run-history/domain/team-models.js";
import { getTeamRunContinuationService } from "../../../run-history/services/team-run-continuation-service.js";
import { getTeamRunHistoryService } from "../../../run-history/services/team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../../../run-history/store/team-member-memory-layout-store.js";
import {
  buildTeamMemberRunId,
  normalizeMemberRouteKey,
} from "../../../run-history/utils/team-member-run-id.js";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { UserInputConverter } from "../converters/user-input-converter.js";
import { AgentTeamRunConverter } from "../converters/agent-team-run-converter.js";
import { AgentUserInput } from "./agent-user-input.js";

registerEnumType(TaskNotificationMode, {
  name: "TaskNotificationModeEnum",
});

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

@ObjectType()
export class AgentTeamRun {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  currentStatus!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;
}

@ObjectType()
export class CreateAgentTeamRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;
}

@ObjectType()
export class TerminateAgentTeamRunResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@InputType()
export class TeamMemberConfigInput {
  @Field(() => String)
  memberName!: string;

  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  memberRouteKey?: string | null;

  @Field(() => String, { nullable: true })
  memberRunId?: string | null;
}

@InputType()
export class CreateAgentTeamRunInput {
  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => [TeamMemberConfigInput])
  memberConfigs!: TeamMemberConfigInput[];

  @Field(() => TaskNotificationMode, { nullable: true })
  taskNotificationMode?: TaskNotificationMode | null;

  @Field(() => Boolean, { nullable: true })
  useXmlToolFormat?: boolean | null;
}

@InputType()
export class SendMessageToTeamInput {
  @Field(() => AgentUserInput)
  userInput!: AgentUserInput;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;

  @Field(() => String, { nullable: true })
  targetNodeName?: string | null;

  @Field(() => String, { nullable: true })
  targetMemberName?: string | null;

  @Field(() => String, { nullable: true })
  teamDefinitionId?: string | null;

  @Field(() => [TeamMemberConfigInput], { nullable: true })
  memberConfigs?: TeamMemberConfigInput[] | null;

  @Field(() => TaskNotificationMode, { nullable: true })
  taskNotificationMode?: TaskNotificationMode | null;

  @Field(() => Boolean, { nullable: true })
  useXmlToolFormat?: boolean | null;
}

@ObjectType()
export class SendMessageToTeamResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  teamRunId?: string | null;
}

type TeamRuntimeMemberConfig = {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  workspaceId?: string | null;
  memoryDir?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  memberRouteKey?: string | null;
  memberRunId?: string | null;
};

@Resolver()
export class AgentTeamRunResolver {
  private readonly teamRunHistoryService = getTeamRunHistoryService();
  private readonly teamRunContinuationService = getTeamRunContinuationService();
  private readonly teamDefinitionService = AgentTeamDefinitionService.getInstance();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly teamMemberMemoryLayoutStore = new TeamMemberMemoryLayoutStore(
    appConfigProvider.config.getMemoryDir(),
  );

  private get agentTeamRunManager(): AgentTeamRunManager {
    return AgentTeamRunManager.getInstance();
  }

  private generateTeamId(): string {
    return `team_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  private async resolveWorkspaceId(config: TeamMemberConfigInput): Promise<string | null> {
    const workspaceId =
      typeof config.workspaceId === "string" && config.workspaceId.trim().length > 0
        ? config.workspaceId.trim()
        : null;
    if (workspaceId) {
      return workspaceId;
    }

    const workspaceRootPath =
      typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
        ? config.workspaceRootPath.trim()
        : null;
    if (!workspaceRootPath) {
      return null;
    }

    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
    return workspace.workspaceId;
  }

  private resolveWorkspaceRootPath(config: TeamRuntimeMemberConfig): string | null {
    if (typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0) {
      return config.workspaceRootPath.trim();
    }
    if (typeof config.workspaceId !== "string" || config.workspaceId.trim().length === 0) {
      return null;
    }

    const workspace = this.workspaceManager.getWorkspaceById(config.workspaceId.trim());
    if (!workspace) {
      return null;
    }
    const rootPath =
      typeof (workspace as { rootPath?: unknown }).rootPath === "string"
        ? ((workspace as { rootPath: string }).rootPath ?? null)
        : typeof workspace.getBasePath === "function"
          ? workspace.getBasePath()
          : null;

    if (typeof rootPath !== "string") {
      return null;
    }

    const normalized = rootPath.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private resolveTeamWorkspaceRootPath(memberConfigs: TeamRuntimeMemberConfig[]): string | null {
    const workspaceRootPaths = memberConfigs
      .map((config) => this.resolveWorkspaceRootPath(config))
      .filter((value): value is string => Boolean(value));

    if (workspaceRootPaths.length === 0) {
      return null;
    }

    const uniqueRoots = Array.from(new Set(workspaceRootPaths));
    if (uniqueRoots.length > 1) {
      logger.warn(
        `Team run member workspace roots diverged (${uniqueRoots.join(", ")}); using first root for team grouping.`,
      );
    }

    return uniqueRoots[0] ?? null;
  }

  private resolveRuntimeMemberConfigs(
    teamRunId: string,
    memberConfigs: TeamMemberConfigInput[],
  ): TeamRuntimeMemberConfig[] {
    return memberConfigs.map((config) => {
      const memberName = config.memberName.trim();
      const memberRouteKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
      const memberRunId =
        typeof config.memberRunId === "string" && config.memberRunId.trim().length > 0
          ? config.memberRunId.trim()
          : buildTeamMemberRunId(teamRunId, memberRouteKey);

      return {
        memberName,
        agentDefinitionId: config.agentDefinitionId.trim(),
        llmModelIdentifier: config.llmModelIdentifier.trim(),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        workspaceId: config.workspaceId ?? null,
        memoryDir: this.teamMemberMemoryLayoutStore.getMemberDirPath(teamRunId, memberRunId),
        workspaceRootPath:
          typeof config.workspaceRootPath === "string" && config.workspaceRootPath.trim().length > 0
            ? config.workspaceRootPath.trim()
            : null,
        llmConfig: config.llmConfig ?? null,
        memberRouteKey,
        memberRunId,
      };
    });
  }

  private buildTeamRunManifest(options: {
    teamRunId: string;
    teamDefinitionId: string;
    teamDefinitionName: string;
    coordinatorMemberName?: string | null;
    memberConfigs: TeamRuntimeMemberConfig[];
  }): TeamRunManifest {
    const now = new Date().toISOString();
    const memberBindings = options.memberConfigs.map((config) => {
      const memberName = config.memberName.trim();
      const routeKey = normalizeMemberRouteKey(config.memberRouteKey ?? memberName);
      const memberRunId =
        typeof config.memberRunId === "string" && config.memberRunId.trim().length > 0
          ? config.memberRunId.trim()
          : buildTeamMemberRunId(options.teamRunId, routeKey);

      return {
        memberRouteKey: routeKey,
        memberName,
        memberRunId,
        agentDefinitionId: config.agentDefinitionId.trim(),
        llmModelIdentifier: config.llmModelIdentifier.trim(),
        autoExecuteTools: Boolean(config.autoExecuteTools),
        llmConfig: config.llmConfig ?? null,
        workspaceRootPath: this.resolveWorkspaceRootPath(config),
      };
    });

    const normalizedCoordinatorName =
      typeof options.coordinatorMemberName === "string" && options.coordinatorMemberName.trim().length > 0
        ? options.coordinatorMemberName.trim()
        : null;

    const coordinatorMemberRouteKey =
      (normalizedCoordinatorName
        ? memberBindings.find((binding) => binding.memberName === normalizedCoordinatorName)
            ?.memberRouteKey ??
          memberBindings.find(
            (binding) => binding.memberRouteKey === normalizeMemberRouteKey(normalizedCoordinatorName),
          )?.memberRouteKey
        : null) ??
      memberBindings[0]?.memberRouteKey ??
      "coordinator";

    return {
      teamRunId: options.teamRunId,
      teamDefinitionId: options.teamDefinitionId.trim(),
      teamDefinitionName: options.teamDefinitionName.trim() || options.teamDefinitionId.trim(),
      workspaceRootPath: this.resolveTeamWorkspaceRootPath(options.memberConfigs),
      coordinatorMemberRouteKey,
      runVersion: 1,
      createdAt: now,
      updatedAt: now,
      memberBindings,
    };
  }

  private async resolveTeamDefinitionMetadata(teamDefinitionId: string): Promise<{
    teamDefinitionName: string;
    coordinatorMemberName: string | null;
  }> {
    const normalizedId = teamDefinitionId.trim();
    if (!normalizedId) {
      return {
        teamDefinitionName: "",
        coordinatorMemberName: null,
      };
    }

    try {
      const definition = await this.teamDefinitionService.getDefinitionById(normalizedId);
      return {
        teamDefinitionName:
          typeof definition?.name === "string" && definition.name.trim().length > 0
            ? definition.name.trim()
            : normalizedId,
        coordinatorMemberName:
          typeof definition?.coordinatorMemberName === "string" &&
          definition.coordinatorMemberName.trim().length > 0
            ? definition.coordinatorMemberName.trim()
            : null,
      };
    } catch (error) {
      logger.warn(
        `Failed to resolve team definition metadata for '${normalizedId}', using fallback metadata: ${String(error)}`,
      );
      return {
        teamDefinitionName: normalizedId,
        coordinatorMemberName: null,
      };
    }
  }

  @Query(() => AgentTeamRun, { nullable: true })
  agentTeamRun(@Arg("id", () => String) id: string): AgentTeamRun | null {
    try {
      const domainTeam = this.agentTeamRunManager.getTeamRun(id);
      if (!domainTeam) {
        return null;
      }
      return AgentTeamRunConverter.toGraphql(domainTeam as any);
    } catch (error) {
      logger.error(`Error fetching agent team run by ID ${id}: ${String(error)}`);
      throw new Error("Unable to fetch agent team run at this time.");
    }
  }

  @Query(() => [AgentTeamRun])
  agentTeamRuns(): AgentTeamRun[] {
    try {
      const runIds = this.agentTeamRunManager.listActiveRuns();
      const results: AgentTeamRun[] = [];
      for (const runId of runIds) {
        const domainTeam = this.agentTeamRunManager.getTeamRun(runId);
        if (domainTeam) {
          results.push(AgentTeamRunConverter.toGraphql(domainTeam as any));
        }
      }
      return results;
    } catch (error) {
      logger.error(`Error fetching all agent team runs: ${String(error)}`);
      throw new Error("Unable to fetch agent team runs at this time.");
    }
  }

  @Mutation(() => CreateAgentTeamRunResult)
  async createAgentTeamRun(
    @Arg("input", () => CreateAgentTeamRunInput)
    input: CreateAgentTeamRunInput,
  ): Promise<CreateAgentTeamRunResult> {
    try {
      const teamRunId = this.generateTeamId();
      const memberConfigs = await Promise.all(
        input.memberConfigs.map(async (config) => ({
          ...config,
          workspaceId: await this.resolveWorkspaceId(config),
          llmConfig: config.llmConfig ?? null,
        })),
      );
      const resolvedMemberConfigs = this.resolveRuntimeMemberConfigs(teamRunId, memberConfigs);

      await this.agentTeamRunManager.createTeamRunWithId(
        teamRunId,
        input.teamDefinitionId,
        resolvedMemberConfigs,
      );

      try {
        const metadata = await this.resolveTeamDefinitionMetadata(input.teamDefinitionId);
        const manifest = this.buildTeamRunManifest({
          teamRunId,
          teamDefinitionId: input.teamDefinitionId,
          teamDefinitionName: metadata.teamDefinitionName,
          coordinatorMemberName: metadata.coordinatorMemberName,
          memberConfigs: resolvedMemberConfigs,
        });
        await this.teamRunHistoryService.upsertTeamRunHistoryRow({
          teamRunId,
          manifest,
          summary: "",
          lastKnownStatus: "IDLE",
        });
      } catch (historyError) {
        logger.warn(
          `Failed to upsert team run history for '${teamRunId}' during createAgentTeamRun: ${String(historyError)}`,
        );
      }

      return {
        success: true,
        message: "Agent team run created successfully.",
        teamRunId,
      };
    } catch (error) {
      logger.error(`Error creating agent team run: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => TerminateAgentTeamRunResult)
  async terminateAgentTeamRun(
    @Arg("id", () => String) id: string,
  ): Promise<TerminateAgentTeamRunResult> {
    try {
      const success = await this.agentTeamRunManager.terminateTeamRun(id);
      if (success) {
        try {
          await this.teamRunHistoryService.onTeamTerminated(id);
        } catch (historyError) {
          logger.warn(`Failed to mark team run '${id}' terminated in history: ${String(historyError)}`);
        }
      }

      return {
        success,
        message: success
          ? "Agent team run terminated successfully."
          : "Agent team run not found.",
      };
    } catch (error) {
      logger.error(`Error terminating agent team run with ID ${id}: ${String(error)}`);
      return { success: false, message: String(error) };
    }
  }

  @Mutation(() => SendMessageToTeamResult)
  async sendMessageToTeam(
    @Arg("input", () => SendMessageToTeamInput) input: SendMessageToTeamInput,
  ): Promise<SendMessageToTeamResult> {
    try {
      let teamRunId = input.teamRunId ?? null;

      if (teamRunId && !input.teamDefinitionId && !input.memberConfigs) {
        await this.teamRunContinuationService.continueTeamRun({
          teamRunId,
          targetMemberRouteKey: input.targetMemberName ?? input.targetNodeName ?? null,
          userInput: input.userInput,
        });

        return {
          success: true,
          message: "Message sent to team successfully.",
          teamRunId,
        };
      }

      if (!teamRunId) {
        logger.info("sendMessageToTeam: teamRunId not provided. Attempting lazy creation.");
        if (!input.teamDefinitionId || !input.memberConfigs) {
          throw new Error("teamDefinitionId and memberConfigs are required for lazy team creation.");
        }

        teamRunId = this.generateTeamId();
        const memberConfigs = await Promise.all(
          input.memberConfigs.map(async (config) => ({
            ...config,
            workspaceId: await this.resolveWorkspaceId(config),
            llmConfig: config.llmConfig ?? null,
          })),
        );
        const resolvedMemberConfigs = this.resolveRuntimeMemberConfigs(teamRunId, memberConfigs);
        await this.agentTeamRunManager.createTeamRunWithId(
          teamRunId,
          input.teamDefinitionId,
          resolvedMemberConfigs,
        );

        try {
          const metadata = await this.resolveTeamDefinitionMetadata(input.teamDefinitionId);
          const manifest = this.buildTeamRunManifest({
            teamRunId,
            teamDefinitionId: input.teamDefinitionId,
            teamDefinitionName: metadata.teamDefinitionName,
            coordinatorMemberName: metadata.coordinatorMemberName,
            memberConfigs: resolvedMemberConfigs,
          });
          await this.teamRunHistoryService.upsertTeamRunHistoryRow({
            teamRunId,
            manifest,
            summary: "",
            lastKnownStatus: "IDLE",
          });
        } catch (historyError) {
          logger.warn(
            `Failed to upsert team run history for '${teamRunId}' during lazy create: ${String(historyError)}`,
          );
        }

        logger.info(`Lazy creation successful. New team run ID: ${teamRunId}`);
      }

      if (!teamRunId) {
        throw new Error("Team run ID could not be resolved for sendMessageToTeam.");
      }

      const team = this.agentTeamRunManager.getTeamRun(teamRunId);
      if (!team) {
        throw new Error(`Agent team run with ID '${teamRunId}' not found.`);
      }

      const userMessage = UserInputConverter.toAgentInputUserMessage(input.userInput);
      const targetMemberName = input.targetMemberName ?? input.targetNodeName ?? null;
      await (team as any).postMessage(userMessage, targetMemberName);

      try {
        await this.teamRunHistoryService.onTeamEvent(teamRunId, {
          status: "ACTIVE",
          summary: input.userInput?.content ?? "",
        });
      } catch (historyError) {
        logger.warn(`Failed to record team run activity for '${teamRunId}': ${String(historyError)}`);
      }

      return {
        success: true,
        message: "Message sent to team successfully.",
        teamRunId,
      };
    } catch (error) {
      logger.error(`Error sending message to team: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        teamRunId: input.teamRunId ?? null,
      };
    }
  }
}
