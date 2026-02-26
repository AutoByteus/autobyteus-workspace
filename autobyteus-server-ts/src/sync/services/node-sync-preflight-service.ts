import type { NodeSyncSelectionSpec } from './node-sync-selection-service.js';
import type {
  SyncConflictPolicy,
  SyncEntityType,
  SyncTombstonePolicy,
} from './node-sync-service.js';
import { NodeSyncRemoteClient } from './node-sync-remote-client.js';

export type PreflightFailureClass = 'configuration' | 'health';

export interface NodeSyncNodeEndpoint {
  nodeId: string;
  baseUrl: string;
}

export interface RunNodeSyncInput {
  source: NodeSyncNodeEndpoint;
  targets: NodeSyncNodeEndpoint[];
  scope: SyncEntityType[];
  selection?: NodeSyncSelectionSpec | null;
  conflictPolicy: SyncConflictPolicy;
  tombstonePolicy: SyncTombstonePolicy;
}

export interface NodeSyncValidatedPlan {
  source: NodeSyncNodeEndpoint;
  targets: NodeSyncNodeEndpoint[];
  scope: SyncEntityType[];
  selection: NodeSyncSelectionSpec | null;
  conflictPolicy: SyncConflictPolicy;
  tombstonePolicy: SyncTombstonePolicy;
}

type NodeSyncRemoteClientLike = Pick<NodeSyncRemoteClient, 'normalizeBaseUrl' | 'checkHealth'>;

function nonEmpty(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class NodeSyncPreflightValidationError extends Error {
  readonly failureClass: PreflightFailureClass;
  readonly retryable: boolean;

  constructor(message: string, failureClass: PreflightFailureClass, retryable: boolean) {
    super(message);
    this.name = 'NodeSyncPreflightValidationError';
    this.failureClass = failureClass;
    this.retryable = retryable;
  }
}

export class NodeSyncPreflightService {
  constructor(private readonly remoteClient: NodeSyncRemoteClientLike = new NodeSyncRemoteClient()) {}

  async validate(input: RunNodeSyncInput): Promise<NodeSyncValidatedPlan> {
    const sourceNodeId = nonEmpty(input.source?.nodeId);
    const sourceBaseUrl = nonEmpty(input.source?.baseUrl);

    if (!sourceNodeId || !sourceBaseUrl) {
      throw new NodeSyncPreflightValidationError(
        'Source node id and base URL are required.',
        'configuration',
        false,
      );
    }

    if (!Array.isArray(input.targets) || input.targets.length === 0) {
      throw new NodeSyncPreflightValidationError(
        'At least one target node is required.',
        'configuration',
        false,
      );
    }

    if (!Array.isArray(input.scope) || input.scope.length === 0) {
      throw new NodeSyncPreflightValidationError(
        'Sync scope cannot be empty.',
        'configuration',
        false,
      );
    }

    const normalizedSourceBaseUrl = this.safeNormalizeBaseUrl(sourceBaseUrl, 'source');
    const normalizedSource: NodeSyncNodeEndpoint = {
      nodeId: sourceNodeId,
      baseUrl: normalizedSourceBaseUrl,
    };

    const normalizedTargets: NodeSyncNodeEndpoint[] = input.targets.map((target, index) => {
      const nodeId = nonEmpty(target?.nodeId);
      const baseUrl = nonEmpty(target?.baseUrl);
      if (!nodeId || !baseUrl) {
        throw new NodeSyncPreflightValidationError(
          `Target at index ${index} must include node id and base URL.`,
          'configuration',
          false,
        );
      }
      return {
        nodeId,
        baseUrl: this.safeNormalizeBaseUrl(baseUrl, `target index ${index}`),
      };
    });

    this.assertDistinctSourceAndTargets(normalizedSource, normalizedTargets);
    this.assertNoDuplicateNormalizedTargets(normalizedTargets);

    await this.assertHealthy(normalizedSource, 'source');
    for (const target of normalizedTargets) {
      await this.assertHealthy(target, `target ${target.nodeId}`);
    }

    return {
      source: normalizedSource,
      targets: normalizedTargets,
      scope: [...input.scope],
      selection: input.selection ?? null,
      conflictPolicy: input.conflictPolicy,
      tombstonePolicy: input.tombstonePolicy,
    };
  }

  private safeNormalizeBaseUrl(rawBaseUrl: string, label: string): string {
    try {
      return this.remoteClient.normalizeBaseUrl(rawBaseUrl);
    } catch (error) {
      throw new NodeSyncPreflightValidationError(
        `Invalid ${label} base URL '${rawBaseUrl}': ${getErrorMessage(error)}`,
        'configuration',
        false,
      );
    }
  }

  private assertDistinctSourceAndTargets(source: NodeSyncNodeEndpoint, targets: NodeSyncNodeEndpoint[]): void {
    for (const target of targets) {
      if (target.nodeId === source.nodeId) {
        throw new NodeSyncPreflightValidationError(
          `Target node '${target.nodeId}' cannot be the same as source node '${source.nodeId}'.`,
          'configuration',
          false,
        );
      }

      if (target.baseUrl === source.baseUrl) {
        throw new NodeSyncPreflightValidationError(
          `Target node '${target.nodeId}' resolves to the same endpoint as source '${source.nodeId}'.`,
          'configuration',
          false,
        );
      }
    }
  }

  private assertNoDuplicateNormalizedTargets(targets: NodeSyncNodeEndpoint[]): void {
    const seenBaseUrls = new Map<string, string>();
    for (const target of targets) {
      const existingNodeId = seenBaseUrls.get(target.baseUrl);
      if (existingNodeId) {
        throw new NodeSyncPreflightValidationError(
          `Target nodes '${existingNodeId}' and '${target.nodeId}' resolve to the same endpoint '${target.baseUrl}'.`,
          'configuration',
          false,
        );
      }
      seenBaseUrls.set(target.baseUrl, target.nodeId);
    }
  }

  private async assertHealthy(node: NodeSyncNodeEndpoint, label: string): Promise<void> {
    try {
      await this.remoteClient.checkHealth(node.baseUrl);
    } catch (error) {
      throw new NodeSyncPreflightValidationError(
        `Health check failed for ${label} '${node.nodeId}' (${node.baseUrl}): ${getErrorMessage(error)}`,
        'health',
        true,
      );
    }
  }
}
