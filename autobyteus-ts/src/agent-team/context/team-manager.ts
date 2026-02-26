import { AgentFactory } from '../../agent/factory/agent-factory.js';
import { waitForAgentToBeIdle } from '../../agent/utils/wait-for-idle.js';
import { waitForTeamToBeIdle } from '../utils/wait-for-idle.js';
import { TeamNodeNotFoundException } from '../exceptions.js';
import { Agent } from '../../agent/agent.js';
import { AgentTeam } from '../agent-team.js';
import { AgentTeamConfig } from './agent-team-config.js';
import type { AgentTeamRuntime } from '../runtime/agent-team-runtime.js';
import type { AgentEventMultiplexer } from '../streaming/agent-event-multiplexer.js';
import type { InterAgentMessageRequestEvent, ProcessUserMessageEvent } from '../events/agent-team-events.js';

export type ManagedNode = Agent | AgentTeam;

export class TeamManager {
  teamId: string;
  private runtime: AgentTeamRuntime;
  private multiplexer: AgentEventMultiplexer;
  private agentFactory: AgentFactory;
  private nodesCache: Map<string, ManagedNode> = new Map();
  private agentIdToNameMap: Map<string, string> = new Map();
  private coordinatorAgentRef: Agent | null = null;

  constructor(teamId: string, runtime: AgentTeamRuntime, multiplexer: AgentEventMultiplexer) {
    this.teamId = teamId;
    this.runtime = runtime;
    this.multiplexer = multiplexer;
    this.agentFactory = new AgentFactory();
    console.info(`TeamManager created for team '${this.teamId}'.`);
  }

  async dispatchInterAgentMessageRequest(event: InterAgentMessageRequestEvent): Promise<void> {
    await this.runtime.submitEvent(event);
  }

  async dispatchUserMessageToAgent(event: ProcessUserMessageEvent): Promise<void> {
    await this.runtime.submitEvent(event);
  }

  async ensureNodeIsReady(nameOrAgentId: string): Promise<ManagedNode> {
    const uniqueName = this.agentIdToNameMap.get(nameOrAgentId) ?? nameOrAgentId;

    let nodeInstance = this.nodesCache.get(uniqueName);
    let wasCreated = false;

    if (!nodeInstance) {
      console.debug(`Node '${uniqueName}' not in cache for team '${this.teamId}'. Attempting lazy creation.`);

      const nodeConfigWrapper = this.runtime.context.getNodeConfigByName(uniqueName);
      if (!nodeConfigWrapper) {
        throw new TeamNodeNotFoundException(nameOrAgentId, this.teamId);
      }

      if (nodeConfigWrapper.isSubTeam) {
        const { AgentTeamFactory } = await import('../factory/agent-team-factory.js');
        const nodeDefinition = nodeConfigWrapper.nodeDefinition;
        if (!(nodeDefinition instanceof AgentTeamConfig)) {
          throw new TypeError(
            `Expected AgentTeamConfig for node '${uniqueName}', but found ${
              nodeDefinition?.constructor?.name ?? typeof nodeDefinition
            }`
          );
        }
        console.info(`Lazily creating sub-team node '${uniqueName}' in team '${this.teamId}'.`);
        const teamFactory = new AgentTeamFactory();
        nodeInstance = teamFactory.createTeam(nodeDefinition);
      } else {
        const finalConfig = this.runtime.context.state.finalAgentConfigs[uniqueName];
        if (!finalConfig) {
          throw new Error(
            `No pre-prepared agent configuration found for '${uniqueName}'. Bootstrap step may have failed or skipped this agent.`
          );
        }

        console.info(`Lazily creating agent node '${uniqueName}' using pre-prepared configuration.`);
        const preferredAgentIdRaw = (finalConfig.initialCustomData as Record<string, unknown> | null)?.member_agent_id;
        const preferredAgentId =
          typeof preferredAgentIdRaw === 'string' && preferredAgentIdRaw.trim().length > 0
            ? preferredAgentIdRaw.trim()
            : null;
        nodeInstance = preferredAgentId
          ? this.agentFactory.restoreAgent(preferredAgentId, finalConfig)
          : this.agentFactory.createAgent(finalConfig);
      }

      this.nodesCache.set(uniqueName, nodeInstance);
      wasCreated = true;

      if (nodeInstance instanceof Agent) {
        this.agentIdToNameMap.set(nodeInstance.agentId, uniqueName);
      }
    }

    if (wasCreated && nodeInstance) {
      if (nodeInstance instanceof AgentTeam) {
        this.multiplexer.startBridgingTeamEvents(nodeInstance, uniqueName);
      } else if (nodeInstance instanceof Agent) {
        this.multiplexer.startBridgingAgentEvents(nodeInstance, uniqueName);
      }
    }

    if (!nodeInstance.isRunning) {
      console.info(`Team '${this.teamId}': Node '${uniqueName}' is not running. Starting on-demand.`);
      await this.startNode(nodeInstance, uniqueName);
    }

    return nodeInstance;
  }

  private async startNode(node: ManagedNode, name: string): Promise<void> {
    try {
      node.start();
      if (node instanceof AgentTeam) {
        await waitForTeamToBeIdle(node, 120.0);
      } else {
        await waitForAgentToBeIdle(node, 60.0);
      }
    } catch (error) {
      console.error(`Team '${this.teamId}': Failed to start node '${name}' on-demand: ${error}`);
      throw new Error(`Failed to start node '${name}' on-demand.`);
    }
  }

  getAllAgents(): Agent[] {
    return Array.from(this.nodesCache.values()).filter((node) => node instanceof Agent) as Agent[];
  }

  getAllSubTeams(): AgentTeam[] {
    return Array.from(this.nodesCache.values()).filter((node) => node instanceof AgentTeam) as AgentTeam[];
  }

  get coordinatorAgent(): Agent | null {
    return this.coordinatorAgentRef;
  }

  async ensureCoordinatorIsReady(coordinatorName: string): Promise<Agent> {
    const node = await this.ensureNodeIsReady(coordinatorName);
    if (!(node instanceof Agent)) {
      throw new TypeError(
        `Coordinator node '${coordinatorName}' resolved to a non-agent type: ${node?.constructor?.name ?? typeof node}`
      );
    }

    this.coordinatorAgentRef = node;
    return node;
  }
}
