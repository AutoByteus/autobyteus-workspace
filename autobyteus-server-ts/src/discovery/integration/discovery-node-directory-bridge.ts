import { NodeDirectoryService } from "../../distributed/node-directory/node-directory-service.js";
import {
  type DiscoveryRegistryChangeEvent,
  type DiscoveryPeerRecord,
  NodeDiscoveryRegistryService,
} from "../services/node-discovery-registry-service.js";

export type DiscoveryNodeDirectoryBridgeOptions = {
  hostNodeId: string;
  nodeDirectoryService: NodeDirectoryService;
  discoveryRegistryService: NodeDiscoveryRegistryService;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

export class DiscoveryNodeDirectoryBridge {
  private readonly hostNodeId: string;
  private readonly nodeDirectoryService: NodeDirectoryService;
  private readonly discoveryRegistryService: NodeDiscoveryRegistryService;
  private unsubscribe: (() => void) | null = null;

  constructor(options: DiscoveryNodeDirectoryBridgeOptions) {
    this.hostNodeId = normalizeRequiredString(options.hostNodeId, "hostNodeId");
    this.nodeDirectoryService = options.nodeDirectoryService;
    this.discoveryRegistryService = options.discoveryRegistryService;
  }

  start(): void {
    if (this.unsubscribe) {
      return;
    }

    this.unsubscribe = this.discoveryRegistryService.onChange((event) => {
      this.applyChangeEvent(event);
    });

    this.applySnapshot(this.discoveryRegistryService.listPeers());
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  applyPrunedNodeIds(prunedNodeIds: string[]): void {
    for (const nodeId of prunedNodeIds) {
      if (nodeId === this.hostNodeId) {
        continue;
      }
      this.nodeDirectoryService.removeEntry(nodeId);
    }
  }

  private applyChangeEvent(event: DiscoveryRegistryChangeEvent): void {
    this.applySnapshot(event.peers);
    this.applyPrunedNodeIds(event.prunedNodeIds);
  }

  private applySnapshot(peers: DiscoveryPeerRecord[]): void {
    const seenNodeIds = new Set<string>();

    for (const peer of peers) {
      seenNodeIds.add(peer.nodeId);
      if (peer.nodeId === this.hostNodeId) {
        continue;
      }
      this.nodeDirectoryService.setEntry({
        nodeId: peer.nodeId,
        baseUrl: peer.baseUrl,
        isHealthy: peer.status === "ready",
        supportsAgentExecution: peer.capabilities?.terminal !== false,
      });
    }

    for (const existing of this.nodeDirectoryService.listEntries()) {
      if (existing.nodeId === this.hostNodeId) {
        continue;
      }
      if (!seenNodeIds.has(existing.nodeId)) {
        this.nodeDirectoryService.removeEntry(existing.nodeId);
      }
    }
  }
}
