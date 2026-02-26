import { AgentFactory } from '../../agent/factory/agent-factory.js';
import { waitForAgentToBeIdle } from '../../agent/utils/wait-for-idle.js';
import { waitForTeamToBeIdle } from '../utils/wait-for-idle.js';
import { TeamNodeNotFoundException, TeamNodeNotLocalException } from '../exceptions.js';
import { Agent } from '../../agent/agent.js';
import { AgentTeam } from '../agent-team.js';
import { AgentTeamConfig } from './agent-team-config.js';
import { AgentConfig } from '../../agent/context/agent-config.js';
import type { TeamRoutingPort } from '../ports/team-routing-port.js';
import type { AgentTeamRuntime } from '../runtime/agent-team-runtime.js';
import type { AgentEventMultiplexer } from '../streaming/agent-event-multiplexer.js';
import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from '../events/agent-team-events.js';
import { createLocalTeamRoutingPortAdapter } from '../routing/local-team-routing-port-adapter.js';

export type ManagedNode = Agent | AgentTeam;

type TeamRestoreMemberMetadata = {
  memberAgentId: string;
  memoryDir: string | null;
};

export class TeamManager {
  teamId: string;
  private runtime: AgentTeamRuntime;
  private multiplexer: AgentEventMultiplexer;
  private agentFactory: AgentFactory;
  private teamRoutingPort: TeamRoutingPort;
  private nodesCache: Map<string, ManagedNode> = new Map();
  private agentIdToNameMap: Map<string, string> = new Map();
  private coordinatorAgentRef: Agent | null = null;

  constructor(teamId: string, runtime: AgentTeamRuntime, multiplexer: AgentEventMultiplexer) {
    this.teamId = teamId;
    this.runtime = runtime;
    this.multiplexer = multiplexer;
    this.agentFactory = new AgentFactory();
    this.teamRoutingPort = createLocalTeamRoutingPortAdapter({
      ensureNodeIsReady: this.ensureNodeIsReady.bind(this),
    });
    console.info(`TeamManager created for team '${this.teamId}'.`);
  }

  async dispatchInterAgentMessageRequest(event: InterAgentMessageRequestEvent): Promise<void> {
    await this.runtime.submitEvent(event);
  }

  setTeamRoutingPort(port: TeamRoutingPort): void {
    this.teamRoutingPort = port;
  }

  async dispatchInterAgentMessage(event: InterAgentMessageRequestEvent): Promise<void> {
    const result = await this.teamRoutingPort.dispatchInterAgentMessageRequest(event);
    if (!result.accepted) {
      throw new Error(result.errorMessage ?? result.errorCode ?? 'Inter-agent message rejected by routing port.');
    }
  }

  async dispatchUserMessageToAgent(event: ProcessUserMessageEvent): Promise<void> {
    const result = await this.teamRoutingPort.dispatchUserMessage(event);
    if (!result.accepted) {
      throw new Error(result.errorMessage ?? result.errorCode ?? 'User message rejected by routing port.');
    }
  }

  async dispatchToolApproval(event: ToolApprovalTeamEvent): Promise<void> {
    const result = await this.teamRoutingPort.dispatchToolApproval(event);
    if (!result.accepted) {
      throw new Error(result.errorMessage ?? result.errorCode ?? 'Tool approval rejected by routing port.');
    }
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
        if (!this.isAgentNodeLocalToCurrentRuntime(finalConfig)) {
          throw new TeamNodeNotLocalException(uniqueName, this.teamId);
        }

        const restoreMemberMetadata = this.resolveRestoreMemberMetadata(uniqueName, finalConfig);
        if (restoreMemberMetadata) {
          console.info(
            `Lazily restoring agent node '${uniqueName}' using pre-prepared restore metadata (memberAgentId='${restoreMemberMetadata.memberAgentId}').`
          );
          nodeInstance = this.agentFactory.restoreAgent(
            restoreMemberMetadata.memberAgentId,
            finalConfig,
            restoreMemberMetadata.memoryDir
          );
        } else {
          const preferredMemberAgentId = this.resolvePreferredMemberAgentId(finalConfig);
          if (preferredMemberAgentId) {
            console.info(
              `Lazily creating agent node '${uniqueName}' with deterministic memberAgentId='${preferredMemberAgentId}'.`
            );
            nodeInstance = this.agentFactory.createAgentWithId(preferredMemberAgentId, finalConfig);
          } else {
            console.info(`Lazily creating agent node '${uniqueName}' using pre-prepared configuration.`);
            nodeInstance = this.agentFactory.createAgent(finalConfig);
          }
        }
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

  private resolveRestoreMemberMetadata(
    uniqueName: string,
    finalConfig: AgentConfig
  ): TeamRestoreMemberMetadata | null {
    const rawRestore = finalConfig.initialCustomData?.teamRestore;
    if (!rawRestore || typeof rawRestore !== 'object') {
      return null;
    }

    const direct = this.toRestoreMemberMetadata((rawRestore as Record<string, unknown>)[uniqueName]);
    if (direct) {
      return direct;
    }

    const membersByRouteKey = this.toRecord((rawRestore as Record<string, unknown>).membersByRouteKey);
    if (membersByRouteKey) {
      const fromRouteKey = this.toRestoreMemberMetadata(membersByRouteKey[uniqueName]);
      if (fromRouteKey) {
        return fromRouteKey;
      }
    }

    const membersByName = this.toRecord((rawRestore as Record<string, unknown>).membersByName);
    if (membersByName) {
      const fromName = this.toRestoreMemberMetadata(membersByName[uniqueName]);
      if (fromName) {
        return fromName;
      }
    }

    return null;
  }

  private isAgentNodeLocalToCurrentRuntime(finalConfig: AgentConfig): boolean {
    const placement = this.toRecord(finalConfig.initialCustomData?.teamMemberPlacement);
    if (!placement) {
      return true;
    }
    const isLocal = placement.isLocalToCurrentNode;
    return typeof isLocal === 'boolean' ? isLocal : true;
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private toRestoreMemberMetadata(value: unknown): TeamRestoreMemberMetadata | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const record = value as Record<string, unknown>;
    const memberAgentId =
      typeof record.memberAgentId === 'string' && record.memberAgentId.trim().length > 0
        ? record.memberAgentId.trim()
        : null;
    if (!memberAgentId) {
      return null;
    }
    const memoryDir =
      typeof record.memoryDir === 'string' && record.memoryDir.trim().length > 0
        ? record.memoryDir.trim()
        : null;
    return {
      memberAgentId,
      memoryDir,
    };
  }

  private resolvePreferredMemberAgentId(finalConfig: AgentConfig): string | null {
    const customData = finalConfig.initialCustomData;
    if (!customData || typeof customData !== 'object') {
      return null;
    }

    const identity = this.toRecord((customData as Record<string, unknown>).teamMemberIdentity);
    if (!identity) {
      return null;
    }
    const memberAgentId = identity.memberAgentId;
    if (typeof memberAgentId !== 'string' || memberAgentId.trim().length === 0) {
      return null;
    }
    return memberAgentId.trim();
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

  async shutdownManagedAgents(shutdownTimeout: number = 10.0): Promise<boolean> {
    const agentEntries = Array.from(this.nodesCache.entries()).filter(
      (entry): entry is [string, Agent] => entry[1] instanceof Agent
    );
    if (agentEntries.length === 0) {
      return true;
    }

    let allSuccessful = true;
    for (const [nodeName, agent] of agentEntries) {
      try {
        const removed = await this.agentFactory.removeAgent(agent.agentId, shutdownTimeout);
        if (!removed) {
          if (agent.isRunning) {
            await agent.stop(shutdownTimeout);
          }
          console.warn(
            `Team '${this.teamId}': Agent '${agent.agentId}' was not registered in AgentFactory during shutdown cleanup.`
          );
        }
      } catch (error) {
        console.error(
          `Team '${this.teamId}': Failed to remove managed agent '${agent.agentId}' during shutdown: ${error}`
        );
        allSuccessful = false;
      } finally {
        this.nodesCache.delete(nodeName);
        this.agentIdToNameMap.delete(agent.agentId);
      }
    }

    return allSuccessful;
  }

  getAllSubTeams(): AgentTeam[] {
    return Array.from(this.nodesCache.values()).filter((node) => node instanceof AgentTeam) as AgentTeam[];
  }

  resolveMemberNameByAgentId(agentId: string): string | null {
    if (!agentId || typeof agentId !== 'string') {
      return null;
    }
    return this.agentIdToNameMap.get(agentId) ?? null;
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
