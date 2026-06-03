import { TeamNodeConfig } from './team-node-config.js';

export class AgentTeamConfig {
  readonly name: string;
  readonly description: string;
  readonly nodes: TeamNodeConfig[];
  readonly coordinatorNode: TeamNodeConfig;
  readonly role?: string | null;

  constructor(options: {
    name: string;
    description: string;
    nodes: TeamNodeConfig[];
    coordinatorNode: TeamNodeConfig;
    role?: string | null;
  }) {
    this.name = options.name;
    this.description = options.description;
    this.nodes = options.nodes;
    this.coordinatorNode = options.coordinatorNode;
    this.role = options.role ?? null;

    this.validate();
    Object.freeze(this);
  }

  private validate(): void {
    if (!this.name || typeof this.name !== 'string') {
      throw new Error("The 'name' in AgentTeamConfig must be a non-empty string.");
    }

    if (!this.nodes || this.nodes.length === 0) {
      throw new Error("The 'nodes' collection in AgentTeamConfig cannot be empty.");
    }

    if (!this.nodes.includes(this.coordinatorNode)) {
      throw new Error("The 'coordinatorNode' must be one of the nodes in the 'nodes' collection.");
    }
  }
}
