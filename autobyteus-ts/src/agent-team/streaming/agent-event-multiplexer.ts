import { AgentEventBridge } from './agent-event-bridge.js';
import { TeamEventBridge } from './team-event-bridge.js';
import type { AgentTeamExternalEventNotifier } from './agent-team-event-notifier.js';

type WorkerLike = { getWorkerLoop: () => unknown };

type AgentLike = Record<string, any>;

type TeamLike = Record<string, any>;

export class AgentEventMultiplexer {
  private teamId: string;
  private notifier: AgentTeamExternalEventNotifier;
  private worker: WorkerLike;
  private loop: unknown | null = null;
  private agentBridges: Map<string, AgentEventBridge> = new Map();
  private teamBridges: Map<string, TeamEventBridge> = new Map();

  constructor(teamId: string, notifier: AgentTeamExternalEventNotifier, workerRef: WorkerLike) {
    this.teamId = teamId;
    this.notifier = notifier;
    this.worker = workerRef;
    console.info(`AgentEventMultiplexer initialized for team '${this.teamId}'.`);
  }

  private getLoop(): unknown {
    if (!this.loop) {
      this.loop = this.worker.getWorkerLoop();
      if (!this.loop) {
        throw new Error(`Agent team worker loop for team '${this.teamId}' is not available or not running.`);
      }
    }
    return this.loop;
  }

  startBridgingAgentEvents(agent: AgentLike, agentName: string): void {
    if (this.agentBridges.has(agentName)) {
      console.warn(`Event bridge for agent '${agentName}' already exists. Skipping creation.`);
      return;
    }

    const bridge = new AgentEventBridge(agent, agentName, this.notifier, this.getLoop());
    this.agentBridges.set(agentName, bridge);
    console.info(`AgentEventMultiplexer started agent event bridge for '${agentName}'.`);
  }

  startBridgingTeamEvents(subTeam: TeamLike, nodeName: string): void {
    if (this.teamBridges.has(nodeName)) {
      console.warn(`Event bridge for sub-team '${nodeName}' already exists. Skipping creation.`);
      return;
    }

    const bridge = new TeamEventBridge(subTeam, nodeName, this.notifier, this.getLoop());
    this.teamBridges.set(nodeName, bridge);
    console.info(`AgentEventMultiplexer started team event bridge for '${nodeName}'.`);
  }

  async shutdown(): Promise<void> {
    console.info(`AgentEventMultiplexer for '${this.teamId}' shutting down all event bridges.`);
    const agent_tasks = Array.from(this.agentBridges.values()).map((bridge) => bridge.cancel());
    const team_tasks = Array.from(this.teamBridges.values()).map((bridge) => bridge.cancel());

    await Promise.allSettled([...agent_tasks, ...team_tasks]);

    this.agentBridges.clear();
    this.teamBridges.clear();
    console.info(`All event bridges for team '${this.teamId}' have been shut down by multiplexer.`);
  }
}
