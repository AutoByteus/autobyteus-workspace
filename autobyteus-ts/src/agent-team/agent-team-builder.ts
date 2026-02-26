import { AgentTeam } from './agent-team.js';
import { AgentTeamConfig } from './context/agent-team-config.js';
import { TeamNodeConfig } from './context/team-node-config.js';
import { AgentConfig } from '../agent/context/agent-config.js';
import { AgentTeamFactory } from './factory/agent-team-factory.js';

export type NodeDefinition = AgentConfig | AgentTeamConfig;

export class AgentTeamBuilder {
  private name: string;
  private description: string;
  private role: string | null | undefined;
  private nodes: Set<NodeDefinition> = new Set();
  private coordinatorConfig: AgentConfig | null = null;
  private addedNodeNames: Set<string> = new Set();

  constructor(name: string, description: string, role?: string | null) {
    if (!name || typeof name !== 'string') {
      throw new Error('Agent team name must be a non-empty string.');
    }
    if (!description || typeof description !== 'string') {
      throw new Error('Agent team description must be a non-empty string.');
    }

    this.name = name;
    this.description = description;
    this.role = role;
    console.info(`AgentTeamBuilder initialized for team: '${this.name}'.`);
  }

  addAgentNode(agentConfig: AgentConfig): AgentTeamBuilder {
    this.addNodeInternal(agentConfig);
    return this;
  }

  addSubTeamNode(teamConfig: AgentTeamConfig): AgentTeamBuilder {
    this.addNodeInternal(teamConfig);
    return this;
  }

  private addNodeInternal(nodeDefinition: NodeDefinition): void {
    if (!(nodeDefinition instanceof AgentConfig || nodeDefinition instanceof AgentTeamConfig)) {
      throw new TypeError('nodeDefinition must be an instance of AgentConfig or AgentTeamConfig.');
    }

    const nodeName = nodeDefinition.name;
    if (this.addedNodeNames.has(nodeName)) {
      throw new Error(
        `Duplicate node name '${nodeName}' detected. All nodes in a team must have a unique name.`
      );
    }

    if (this.nodes.has(nodeDefinition) || nodeDefinition === this.coordinatorConfig) {
      throw new Error(
        `The exact same node definition object for '${nodeName}' has already been added to the team.`
      );
    }

    this.nodes.add(nodeDefinition);
    this.addedNodeNames.add(nodeName);

    const nodeType = nodeDefinition instanceof AgentTeamConfig ? 'Sub-Team' : 'Agent';
    console.debug(`Added ${nodeType} node '${nodeName}' to builder.`);
  }

  setCoordinator(agentConfig: AgentConfig): AgentTeamBuilder {
    if (this.coordinatorConfig) {
      throw new Error('A coordinator has already been set for this team.');
    }

    if (!(agentConfig instanceof AgentConfig)) {
      throw new TypeError('Coordinator must be an instance of AgentConfig.');
    }

    const nodeName = agentConfig.name;
    if (this.addedNodeNames.has(nodeName)) {
      throw new Error(
        `Duplicate node name '${nodeName}' detected. The coordinator's name must also be unique within the team.`
      );
    }

    this.coordinatorConfig = agentConfig;
    this.addedNodeNames.add(nodeName);
    console.debug(`Set coordinator for team to '${agentConfig.name}'.`);
    return this;
  }

  build(): AgentTeam {
    console.info('Building AgentTeam from builder...');
    if (!this.coordinatorConfig) {
      throw new Error('Cannot build team: A coordinator must be set.');
    }

    const nodeMap = new Map<NodeDefinition, TeamNodeConfig>();
    const allDefinitions = Array.from(this.nodes);
    if (!allDefinitions.includes(this.coordinatorConfig)) {
      allDefinitions.push(this.coordinatorConfig);
    }

    for (const definition of allDefinitions) {
      nodeMap.set(definition, new TeamNodeConfig({ nodeDefinition: definition }));
    }

    const finalNodes = Array.from(nodeMap.values());
    const coordinatorNodeInstance = nodeMap.get(this.coordinatorConfig);
    if (!coordinatorNodeInstance) {
      throw new Error('Coordinator node configuration was not created.');
    }

    const teamConfig = new AgentTeamConfig({
      name: this.name,
      description: this.description,
      role: this.role ?? null,
      nodes: finalNodes,
      coordinatorNode: coordinatorNodeInstance
    });

    console.info(
      `AgentTeamConfig created successfully. Name: '${teamConfig.name}'. Total nodes: ${finalNodes.length}. Coordinator: '${coordinatorNodeInstance.name}'.`
    );

    const factory = new AgentTeamFactory();
    return factory.createTeam(teamConfig);
  }
}
