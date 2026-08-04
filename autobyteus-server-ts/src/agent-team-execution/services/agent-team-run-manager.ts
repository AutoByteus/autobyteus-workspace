import { TeamRun } from "../domain/team-run.js";
import {
  TeamRunConfig,
  type TeamRunMemberConfig,
} from "../domain/team-run-config.js";
import { TeamRunContext, type RuntimeTeamRunContext } from "../domain/team-run-context.js";
import type { MixedTeamRunContext } from "../backends/mixed/mixed-team-run-context.js";
import type { TeamRunEventListener, TeamRunEventUnsubscribe } from "../domain/team-run-event.js";
import { AgentTeamTerminationError } from "../errors.js";
import {
  getMixedTeamRunBackendFactory,
  type MixedTeamRunBackendFactory,
} from "../backends/mixed/mixed-team-run-backend-factory.js";
import { normalizeMemberRouteKey } from "../domain/team-run-member-identity.js";
import { TeamBackendKind } from "../domain/team-backend-kind.js";
import {
  TeamCommunicationService,
  getTeamCommunicationService,
} from "../../services/team-communication/team-communication-service.js";
import {
  RunFileChangeService,
  getRunFileChangeService,
} from "../../services/run-file-changes/run-file-change-service.js";
import { getTaskDelegationRunRegistry } from "../task-delegation/task-delegation-run-registry.js";
import type {
  TeamRunLifecycleListener,
  TeamRunLifecycleSnapshot,
  TeamRunLifecycleUnsubscribe,
} from "../domain/team-run-lifecycle.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const normalizeRequiredRunId = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

type AgentTeamRunManagerOptions = {
  mixedTeamRunBackendFactory?: MixedTeamRunBackendFactory;
  teamCommunicationService?: TeamCommunicationService;
  runFileChangeService?: RunFileChangeService;
};

export class AgentTeamRunManager {
  private static instance: AgentTeamRunManager | null = null;
  private readonly mixedTeamRunBackendFactory: MixedTeamRunBackendFactory;
  private readonly teamCommunicationService: TeamCommunicationService;
  private readonly runFileChangeService: RunFileChangeService;
  private activeRuns = new Map<string, TeamRun>();
  private readonly teamCommunicationUnsubscribers = new Map<string, () => void>();
  private readonly runFileChangeUnsubscribers = new Map<string, () => void>();
  private readonly lifecycleListenersByRunId = new Map<
    string,
    Set<TeamRunLifecycleListener>
  >();

  static getInstance(options: AgentTeamRunManagerOptions = {}): AgentTeamRunManager {
    if (!AgentTeamRunManager.instance) {
      AgentTeamRunManager.instance = new AgentTeamRunManager(options);
    }
    return AgentTeamRunManager.instance;
  }

  constructor(options: AgentTeamRunManagerOptions = {}) {
    this.mixedTeamRunBackendFactory =
      options.mixedTeamRunBackendFactory ?? getMixedTeamRunBackendFactory();
    this.teamCommunicationService =
      options.teamCommunicationService ?? getTeamCommunicationService();
    this.runFileChangeService =
      options.runFileChangeService ?? getRunFileChangeService();
    logger.info("AgentTeamRunManager initialized with MixedTeamManager-only team execution.");
  }

  async createTeamRun(input: TeamRunConfig, teamRunId: string): Promise<TeamRun> {
    const normalizedTeamRunId = normalizeRequiredRunId(teamRunId, "teamRunId");
    const config = this.withMixedBackendKind(input);
    const backend = await this.mixedTeamRunBackendFactory.createBackend(config, normalizedTeamRunId);
    const normalizedConfig = new TeamRunConfig({
      teamDefinitionId: config.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: config.coordinatorMemberName,
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      memberTree: this.attachRuntimeMemberIds(config.memberTree),
      effectiveHandoffs: config.effectiveHandoffs,
    });
    const activeRun = new TeamRun({
      context: new TeamRunContext({
        runId: backend.runId,
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: normalizedConfig.coordinatorMemberName,
        coordinatorMemberRouteKey: normalizedConfig.coordinatorMemberRouteKey,
        config: normalizedConfig,
        runtimeContext: backend.getRuntimeContext(),
      }),
      backend,
    });
    this.registerActiveRun(activeRun);
    logger.info(`Successfully created mixed team run '${activeRun.runId}'.`);
    return activeRun;
  }

  async restoreTeamRun(
    context: TeamRunContext<RuntimeTeamRunContext>,
  ): Promise<TeamRun> {
    if (!context.runtimeContext) {
      throw new Error(`Team run '${context.runId}' restore requires a mixed runtime context.`);
    }
    const mixedContext = new TeamRunContext<MixedTeamRunContext>({
      runId: context.runId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: context.coordinatorMemberName,
      coordinatorMemberRouteKey: context.coordinatorMemberRouteKey,
      config: context.config ? this.withMixedBackendKind(context.config) : null,
      runtimeContext: context.runtimeContext,
    });
    const backend = await this.mixedTeamRunBackendFactory.restoreBackend(mixedContext);
    const activeRun = new TeamRun({
      context: mixedContext,
      backend,
    });
    this.registerActiveRun(activeRun);
    logger.info(`Successfully restored mixed team run '${activeRun.runId}'.`);
    return activeRun;
  }

  getTeamRun(teamRunId: string): TeamRun | null {
    const normalizedTeamRunId = normalizeRequiredRunId(teamRunId, "teamRunId");
    const activeRun = this.activeRuns.get(normalizedTeamRunId) ?? null;
    if (!activeRun) {
      return null;
    }
    if (!activeRun.isActive()) {
      this.unregisterActiveRun(normalizedTeamRunId, activeRun);
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

  getLifecycleSnapshot(teamRunId: string): TeamRunLifecycleSnapshot {
    const normalizedTeamRunId = normalizeRequiredRunId(teamRunId, "teamRunId");
    return {
      teamRunId: normalizedTeamRunId,
      isActive: this.getActiveRun(normalizedTeamRunId) !== null,
    };
  }

  subscribeToLifecycle(
    teamRunId: string,
    listener: TeamRunLifecycleListener,
  ): TeamRunLifecycleUnsubscribe {
    const normalizedTeamRunId = normalizeRequiredRunId(teamRunId, "teamRunId");
    let listeners = this.lifecycleListenersByRunId.get(normalizedTeamRunId);
    if (!listeners) {
      listeners = new Set<TeamRunLifecycleListener>();
      this.lifecycleListenersByRunId.set(normalizedTeamRunId, listeners);
    }
    listeners.add(listener);
    return () => {
      const current = this.lifecycleListenersByRunId.get(normalizedTeamRunId);
      current?.delete(listener);
      if (current?.size === 0) {
        this.lifecycleListenersByRunId.delete(normalizedTeamRunId);
      }
    };
  }

  private registerActiveRun(run: TeamRun): void {
    if (!run.isActive()) {
      throw new Error(`Cannot register inactive team run '${run.runId}'.`);
    }
    const teamRunId = normalizeRequiredRunId(run.runId, "teamRunId");
    this.transitionActiveRun({ teamRunId, nextRun: run });
  }

  private unregisterActiveRun(
    teamRunId: string,
    expectedRun: TeamRun | null = null,
  ): boolean {
    return this.transitionActiveRun({ teamRunId, nextRun: null, expectedRun });
  }

  private transitionActiveRun(input: {
    teamRunId: string;
    nextRun: TeamRun | null;
    expectedRun?: TeamRun | null;
  }): boolean {
    const current = this.activeRuns.get(input.teamRunId) ?? null;
    if (input.expectedRun && current !== input.expectedRun) {
      return false;
    }
    if (current === input.nextRun) {
      return current !== null;
    }
    if (!current && !input.nextRun) {
      return false;
    }

    const wasActive = current !== null;
    this.unregisterTeamCommunication(input.teamRunId);
    this.unregisterRunFileChanges(input.teamRunId);
    if (current) {
      getTaskDelegationRunRegistry().detach(input.teamRunId);
    }

    if (input.nextRun) {
      this.activeRuns.set(input.teamRunId, input.nextRun);
      this.teamCommunicationUnsubscribers.set(
        input.teamRunId,
        this.teamCommunicationService.attachToTeamRun(input.nextRun),
      );
      this.runFileChangeUnsubscribers.set(
        input.teamRunId,
        this.runFileChangeService.attachToTeamRun(input.nextRun),
      );
    } else {
      this.activeRuns.delete(input.teamRunId);
    }

    const isActive = input.nextRun !== null;
    if (wasActive !== isActive) {
      this.notifyLifecycle({ teamRunId: input.teamRunId, isActive });
    }
    return true;
  }

  private notifyLifecycle(snapshot: TeamRunLifecycleSnapshot): void {
    const listeners = [
      ...(this.lifecycleListenersByRunId.get(snapshot.teamRunId) ?? []),
    ];
    for (const listener of listeners) {
      try {
        listener({ ...snapshot });
      } catch (error) {
        logger.error(
          `AgentTeamRunManager lifecycle listener failed for '${snapshot.teamRunId}': ${String(error)}`,
        );
      }
    }
  }

  private unregisterTeamCommunication(teamRunId: string): void {
    const unsubscribe = this.teamCommunicationUnsubscribers.get(teamRunId);
    if (!unsubscribe) {
      return;
    }
    this.teamCommunicationUnsubscribers.delete(teamRunId);
    unsubscribe();
  }

  private unregisterRunFileChanges(teamRunId: string): void {
    const unsubscribe = this.runFileChangeUnsubscribers.get(teamRunId);
    if (!unsubscribe) {
      return;
    }
    this.runFileChangeUnsubscribers.delete(teamRunId);
    unsubscribe();
  }

  async terminateTeamRun(teamRunId: string): Promise<boolean> {
    try {
      const normalizedTeamRunId = normalizeRequiredRunId(teamRunId, "teamRunId");
      const activeRun = this.getActiveRun(normalizedTeamRunId);
      if (activeRun) {
        const result = await activeRun.terminate();
        if (!result.accepted) {
          return false;
        }
        return this.unregisterActiveRun(normalizedTeamRunId, activeRun);
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

  private attachRuntimeMemberIds(
    members: readonly TeamRunMemberConfig[],
  ): TeamRunMemberConfig[] {
    return members.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(memberConfig.memberRouteKey);
      const memberRunId = normalizeRequiredRunId(
        memberConfig.memberRunId ?? "",
        `memberRunId for member '${memberRouteKey}'`,
      );
      if (memberConfig.memberKind === "agent_team") {
        const childTeamRunId = normalizeRequiredRunId(
          memberConfig.childTeamRunId ?? "",
          `childTeamRunId for member '${memberRouteKey}'`,
        );
        if (memberRunId !== childTeamRunId) {
          throw new Error(
            `agent_team wrapper memberRunId for '${memberRouteKey}' must equal childTeamRunId.`,
          );
        }
        return {
          ...memberConfig,
          memberRouteKey,
          memberRunId,
          childTeamRunId,
          memberConfigs: this.attachRuntimeMemberIds(memberConfig.memberConfigs),
        };
      }
      return {
        ...memberConfig,
        memberRouteKey,
        memberRunId,
      };
    });
  }

  private withMixedBackendKind(config: TeamRunConfig): TeamRunConfig {
    if (config.teamBackendKind === TeamBackendKind.MIXED) {
      return config;
    }
    return new TeamRunConfig({
      teamDefinitionId: config.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: config.coordinatorMemberName,
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      memberTree: config.memberTree,
      effectiveHandoffs: config.effectiveHandoffs,
    });
  }
}
