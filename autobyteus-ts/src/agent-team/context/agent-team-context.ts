import { AgentTeamStatus } from '../status/agent-team-status.js';
import type { AgentTeamConfig } from './agent-team-config.js';
import type { AgentTeamRuntimeState } from './agent-team-runtime-state.js';
import type { TeamNodeConfig } from './team-node-config.js';
import type { Agent } from '../../agent/agent.js';
import type { AgentTeamStatusManager } from '../status/agent-team-status-manager.js';
import type { AgentTeamStatusDeriver } from '../status/status-deriver.js';
import type { AgentTeamEventStore } from '../events/event-store.js';
import type { TeamManager } from './team-manager.js';
import type { AgentEventMultiplexer } from '../streaming/agent-event-multiplexer.js';

export class AgentTeamContext {
  teamId: string;
  config: AgentTeamConfig;
  state: AgentTeamRuntimeState;
  private nodeConfigMap: Map<string, TeamNodeConfig> | null = null;

  constructor(teamId: string, config: AgentTeamConfig, state: AgentTeamRuntimeState) {
    if (!teamId || typeof teamId !== 'string') {
      throw new Error("AgentTeamContext requires a non-empty string 'teamId'.");
    }

    this.teamId = teamId;
    this.config = config;
    this.state = state;

    console.info(`AgentTeamContext composed for team '${this.teamId}'.`);
  }

  getNodeConfigByName(name: string): TeamNodeConfig | undefined {
    if (!this.nodeConfigMap) {
      this.nodeConfigMap = new Map(this.config.nodes.map((node) => [node.name, node]));
    }
    return this.nodeConfigMap.get(name);
  }

  get agents(): Agent[] {
    const manager = this.state.teamManager as TeamManager;
    if (manager && typeof manager.getAllAgents === 'function') {
      return manager.getAllAgents();
    }
    return [];
  }

  get coordinatorAgent(): Agent | null {
    const manager = this.state.teamManager as TeamManager;
    if (manager) {
      return manager.coordinatorAgent ?? null;
    }
    return null;
  }

  get statusManager(): AgentTeamStatusManager | null {
    return this.state.statusManagerRef ?? null;
  }

  get currentStatus(): AgentTeamStatus {
    return this.state.currentStatus;
  }

  set currentStatus(value: AgentTeamStatus) {
    if (!Object.values(AgentTeamStatus).includes(value)) {
      throw new TypeError(`currentStatus must be an AgentTeamStatus value. Got ${String(value)}`);
    }
    this.state.currentStatus = value;
  }

  get eventStore(): AgentTeamEventStore | null {
    return this.state.eventStore ?? null;
  }

  get statusDeriver(): AgentTeamStatusDeriver | null {
    return this.state.statusDeriver ?? null;
  }

  get teamManager(): TeamManager {
    return (this.state.teamManager as TeamManager) ?? null;
  }

  get multiplexer(): AgentEventMultiplexer | null {
    return this.state.multiplexerRef ?? null;
  }
}
