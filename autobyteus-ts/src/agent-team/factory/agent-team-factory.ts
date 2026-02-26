import { randomUUID } from 'node:crypto';
import { Singleton } from '../../utils/singleton.js';
import { AgentTeam } from '../agent-team.js';
import { AgentTeamConfig } from '../context/agent-team-config.js';
import { AgentTeamContext } from '../context/agent-team-context.js';
import { AgentTeamRuntimeState } from '../context/agent-team-runtime-state.js';
import { TeamManager } from '../context/team-manager.js';
import { AgentTeamRuntime } from '../runtime/agent-team-runtime.js';
import { AgentTeamEventHandlerRegistry } from '../handlers/agent-team-event-handler-registry.js';
import { ProcessUserMessageEventHandler } from '../handlers/process-user-message-event-handler.js';
import { LifecycleAgentTeamEventHandler } from '../handlers/lifecycle-agent-team-event-handler.js';
import { InterAgentMessageRequestEventHandler } from '../handlers/inter-agent-message-request-event-handler.js';
import { ToolApprovalTeamEventHandler } from '../handlers/tool-approval-team-event-handler.js';
import { initializeLogging } from '../../utils/logger.js';
import {
  ProcessUserMessageEvent,
  AgentTeamBootstrapStartedEvent,
  AgentTeamReadyEvent,
  AgentTeamIdleEvent,
  AgentTeamShutdownRequestedEvent,
  AgentTeamStoppedEvent,
  AgentTeamErrorEvent,
  InterAgentMessageRequestEvent,
  ToolApprovalTeamEvent
} from '../events/agent-team-events.js';

export class AgentTeamFactory extends Singleton {
  protected static instance?: AgentTeamFactory;

  private activeTeams: Map<string, AgentTeam> = new Map();

  private static readonly TEAM_ID_SLUG_MAX_LENGTH = 48;

  constructor() {
    super();
    if (AgentTeamFactory.instance) {
      return AgentTeamFactory.instance;
    }
    AgentTeamFactory.instance = this;
    initializeLogging();
    console.info('AgentTeamFactory (Singleton) initialized.');
  }

  private getDefaultEventHandlerRegistry(): AgentTeamEventHandlerRegistry {
    const registry = new AgentTeamEventHandlerRegistry();
    registry.register(ProcessUserMessageEvent, new ProcessUserMessageEventHandler());
    registry.register(InterAgentMessageRequestEvent, new InterAgentMessageRequestEventHandler());
    registry.register(ToolApprovalTeamEvent, new ToolApprovalTeamEventHandler());

    const lifecycleHandler = new LifecycleAgentTeamEventHandler();
    registry.register(AgentTeamBootstrapStartedEvent, lifecycleHandler);
    registry.register(AgentTeamReadyEvent, lifecycleHandler);
    registry.register(AgentTeamIdleEvent, lifecycleHandler);
    registry.register(AgentTeamShutdownRequestedEvent, lifecycleHandler);
    registry.register(AgentTeamStoppedEvent, lifecycleHandler);
    registry.register(AgentTeamErrorEvent, lifecycleHandler);
    return registry;
  }

  private buildTeamIdSlug(teamName: string): string {
    const normalizedName = teamName.trim();
    const slug = normalizedName
      .toLowerCase()
      .replace(/[\/\\]+/g, '_')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!slug) {
      return 'team';
    }
    return slug.slice(0, AgentTeamFactory.TEAM_ID_SLUG_MAX_LENGTH);
  }

  createTeam(config: AgentTeamConfig): AgentTeam {
    const slug = this.buildTeamIdSlug(config.name);
    let teamId = `${slug}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    while (this.activeTeams.has(teamId)) {
      teamId = `${slug}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    }

    return this.createTeamWithId(teamId, config);
  }

  createTeamWithId(teamId: string, config: AgentTeamConfig): AgentTeam {
    if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
      throw new Error("createTeamWithId requires a non-empty string teamId.");
    }
    const normalizedTeamId = teamId.trim();
    if (this.activeTeams.has(normalizedTeamId)) {
      throw new Error(`Agent team '${normalizedTeamId}' is already active.`);
    }

    const state = new AgentTeamRuntimeState({ teamId: normalizedTeamId });
    const context = new AgentTeamContext(normalizedTeamId, config, state);

    const handlerRegistry = this.getDefaultEventHandlerRegistry();
    const runtime = new AgentTeamRuntime(context, handlerRegistry);

    const teamManager = new TeamManager(normalizedTeamId, runtime, runtime.multiplexer);
    context.state.teamManager = teamManager;

    const team = new AgentTeam(runtime);
    this.activeTeams.set(normalizedTeamId, team);
    console.info(`Agent Team '${normalizedTeamId}' created and stored successfully.`);
    return team;
  }

  getTeam(teamId: string): AgentTeam | undefined {
    return this.activeTeams.get(teamId);
  }

  async removeTeam(teamId: string, shutdownTimeout: number = 10.0): Promise<boolean> {
    const team = this.activeTeams.get(teamId);
    if (!team) {
      console.warn(`Agent team with ID '${teamId}' not found for removal.`);
      return false;
    }

    this.activeTeams.delete(teamId);
    console.info(`Removing agent team '${teamId}'. Attempting graceful shutdown.`);
    await team.stop(shutdownTimeout);
    return true;
  }

  listActiveTeamIds(): string[] {
    return Array.from(this.activeTeams.keys());
  }
}

export const defaultAgentTeamFactory = AgentTeamFactory.getInstance();
