import { TeamRun } from "../domain/team-run.js";
import { TeamRunConfig } from "../domain/team-run-config.js";
import { TeamRunContext, type RuntimeTeamRunContext } from "../domain/team-run-context.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";
import { AgentTeamCreationError, AgentTeamTerminationError } from "../errors.js";
import {
  AutoByteusTeamLike,
  getAutoByteusTeamRunBackendFactory,
  type AutoByteusTeamRunBackendFactory,
} from "../backends/autobyteus/autobyteus-team-run-backend-factory.js";
import {
  getClaudeTeamRunBackendFactory,
  type ClaudeTeamRunBackendFactory,
} from "../backends/claude/claude-team-run-backend-factory.js";
import {
  getCodexTeamRunBackendFactory,
  type CodexTeamRunBackendFactory,
} from "../backends/codex/codex-team-run-backend-factory.js";
import type { TeamRunBackendFactory } from "../backends/team-run-backend-factory.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { buildTeamMemberRunId, normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentTeamRunManagerOptions = {
  autoByteusTeamRunBackendFactory?: AutoByteusTeamRunBackendFactory;
  codexTeamRunBackendFactory?: CodexTeamRunBackendFactory;
  claudeTeamRunBackendFactory?: ClaudeTeamRunBackendFactory;
};

export class AgentTeamRunManager {
  private static instance: AgentTeamRunManager | null = null;
  private readonly autoByteusTeamRunBackendFactory: AutoByteusTeamRunBackendFactory;
  private readonly codexTeamRunBackendFactory: CodexTeamRunBackendFactory;
  private readonly claudeTeamRunBackendFactory: ClaudeTeamRunBackendFactory;
  private activeRuns = new Map<string, TeamRun>();

  static getInstance(options: AgentTeamRunManagerOptions = {}): AgentTeamRunManager {
    if (!AgentTeamRunManager.instance) {
      AgentTeamRunManager.instance = new AgentTeamRunManager(options);
    }
    return AgentTeamRunManager.instance;
  }

  constructor(options: AgentTeamRunManagerOptions = {}) {
    this.autoByteusTeamRunBackendFactory =
      options.autoByteusTeamRunBackendFactory ?? getAutoByteusTeamRunBackendFactory();
    this.codexTeamRunBackendFactory =
      options.codexTeamRunBackendFactory ?? getCodexTeamRunBackendFactory();
    this.claudeTeamRunBackendFactory =
      options.claudeTeamRunBackendFactory ?? getClaudeTeamRunBackendFactory();
    logger.info("AgentTeamRunManager initialized.");
  }

  async createTeamRun(
    input: TeamRunConfig,
  ): Promise<TeamRun> {
    const config = input;
    const backendFactory = this.resolveBackendFactory(config.runtimeKind);
    if (!backendFactory) {
      throw new AgentTeamCreationError(
        `Team runtime kind '${config.runtimeKind}' is not yet supported by AgentTeamRunManager.createTeamRun().`,
      );
    }
    const backend = await backendFactory.createBackend(config);
    const normalizedConfig = new TeamRunConfig({
      teamDefinitionId: config.teamDefinitionId,
      runtimeKind: config.runtimeKind,
      memberConfigs: config.memberConfigs.map((memberConfig) => {
        const memberRouteKey = normalizeMemberRouteKey(
          memberConfig.memberRouteKey ?? memberConfig.memberName,
        );
        return {
          ...memberConfig,
          memberRouteKey,
          memberRunId:
            memberConfig.memberRunId?.trim() ||
            buildTeamMemberRunId(backend.runId, memberRouteKey),
        };
      }),
    });
    const activeRun = new TeamRun({
      context: new TeamRunContext({
        runId: backend.runId,
        runtimeKind: backend.runtimeKind,
        coordinatorMemberName: null,
        config: normalizedConfig,
        runtimeContext: backend.getRuntimeContext(),
      }),
      backend,
    });
    this.registerActiveRun(activeRun);
    logger.info(`Successfully created ${backend.runtimeKind} team run '${activeRun.runId}'.`);
    return activeRun;
  }

  async restoreTeamRun(
    context: TeamRunContext<RuntimeTeamRunContext>,
  ): Promise<TeamRun> {
    const backendFactory = this.resolveBackendFactory(context.runtimeKind);
    if (!backendFactory) {
      throw new AgentTeamCreationError(
        `Team runtime kind '${context.runtimeKind}' is not yet supported by AgentTeamRunManager.restoreTeamRun().`,
      );
    }
    const backend = await backendFactory.restoreBackend(context);
    const activeRun = new TeamRun({
      context,
      backend,
    });
    this.registerActiveRun(activeRun);
    logger.info(`Successfully restored ${context.runtimeKind} team run '${activeRun.runId}'.`);
    return activeRun;
  }

  getTeam(teamRunId: string): AutoByteusTeamLike | null {
    return this.autoByteusTeamRunBackendFactory.getTeam(teamRunId) as AutoByteusTeamLike | null;
  }

  getTeamRun(teamRunId: string): TeamRun | null {
    const activeRun = this.activeRuns.get(teamRunId) ?? null;
    if (!activeRun) {
      return null;
    }
    if (!activeRun.isActive()) {
      this.unregisterActiveRun(teamRunId);
      return null;
    }
    return activeRun;
  }

  getActiveRun(teamRunId: string): TeamRun | null {
    return this.getTeamRun(teamRunId);
  }

  listActiveRuns(): string[] {
    const activeRunIds: string[] = [];
    for (const teamRunId of this.activeRuns.keys()) {
      if (this.getActiveRun(teamRunId)) {
        activeRunIds.push(teamRunId);
      }
    }
    return activeRunIds;
  }

  private registerActiveRun(run: TeamRun): void {
    this.activeRuns.set(run.runId, run);
  }

  private unregisterActiveRun(teamRunId: string): void {
    this.activeRuns.delete(teamRunId);
  }

  async terminateTeamRun(teamRunId: string): Promise<boolean> {
    try {
      const activeRun = this.getActiveRun(teamRunId);
      if (activeRun) {
        const result = await activeRun.terminate();
        if (!result.accepted) {
          return false;
        }
        this.unregisterActiveRun(teamRunId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to terminate team run '${teamRunId}': ${String(error)}`);
      throw new AgentTeamTerminationError(String(error));
    }
  }

  subscribeToEvents(
    teamRunId: string,
    listener: TeamRunEventListener,
  ): TeamRunEventUnsubscribe | null {
    const activeRun = this.getTeamRun(teamRunId);
    if (!activeRun) {
      logger.warn(
        `AgentTeamRunManager: Attempted to subscribe to non-existent team run '${teamRunId}'.`,
      );
      return null;
    }
    return activeRun.subscribeToEvents(listener);
  }

  private resolveBackendFactory(runtimeKind: RuntimeKind): TeamRunBackendFactory | null {
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
      return this.autoByteusTeamRunBackendFactory;
    }
    if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return this.codexTeamRunBackendFactory;
    }
    if (runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return this.claudeTeamRunBackendFactory;
    }
    return null;
  }
}
