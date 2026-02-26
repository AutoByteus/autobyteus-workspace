import type { NodeWindowCommand } from './window-command-types';

const DEFAULT_MAX_PENDING_PER_NODE = 32;

export class NodeWindowCommandRelay {
  private readonly pendingByNodeId = new Map<string, NodeWindowCommand[]>();
  private readonly maxPendingPerNode: number;

  constructor(options: { maxPendingPerNode?: number } = {}) {
    this.maxPendingPerNode = options.maxPendingPerNode ?? DEFAULT_MAX_PENDING_PER_NODE;
  }

  enqueue(nodeId: string, command: NodeWindowCommand): void {
    const current = this.pendingByNodeId.get(nodeId) ?? [];
    current.push(command);

    if (current.length > this.maxPendingPerNode) {
      current.splice(0, current.length - this.maxPendingPerNode);
    }

    this.pendingByNodeId.set(nodeId, current);
  }

  drain(nodeId: string): NodeWindowCommand[] {
    const commands = this.pendingByNodeId.get(nodeId) ?? [];
    this.pendingByNodeId.delete(nodeId);
    return commands;
  }

  getPendingCount(nodeId: string): number {
    return this.pendingByNodeId.get(nodeId)?.length ?? 0;
  }

  clearNode(nodeId: string): void {
    this.pendingByNodeId.delete(nodeId);
  }
}
