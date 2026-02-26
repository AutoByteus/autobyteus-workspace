import { randomUUID } from 'node:crypto';

type NodeDefinition = { name: string } & Record<string, any>;

export class TeamNodeConfig {
  nodeDefinition: NodeDefinition;
  nodeId: string;

  constructor(options: { nodeDefinition: NodeDefinition }) {
    this.nodeDefinition = options.nodeDefinition;
    this.nodeId = `node_${randomUUID().replace(/-/g, '')}`;
    this.validate();
  }

  private validate(): void {
    if (!this.nodeDefinition || typeof this.nodeDefinition.name !== 'string' || !this.nodeDefinition.name) {
      throw new TypeError("The 'nodeDefinition' attribute must provide a non-empty name.");
    }

  }

  get name(): string {
    return this.nodeDefinition.name;
  }

  get effectiveConfig(): NodeDefinition {
    return this.nodeDefinition;
  }

  get isSubTeam(): boolean {
    const node = this.nodeDefinition as Record<string, any> | null;
    return Boolean(node && Array.isArray(node.nodes) && node.coordinatorNode);
  }

  equals(other: unknown): boolean {
    if (other instanceof TeamNodeConfig) {
      return this.nodeId === other.nodeId;
    }
    return false;
  }
}
