import type {
  NodeSyncBundle,
  NodeSyncImportResult,
  SyncEntityType,
} from './node-sync-service.js';

const DEFAULT_MAX_KEY_SAMPLES_PER_ENTITY = 25;
const DEFAULT_MAX_FAILURE_SAMPLES_PER_TARGET = 50;

type NodeSyncFailure = {
  entityType: SyncEntityType;
  key: string;
  message: string;
};

export interface NodeSyncEntityExportReport {
  entityType: SyncEntityType;
  exportedCount: number;
  sampledKeys: string[];
  sampleTruncated: boolean;
}

export interface NodeSyncTargetDetailedReport {
  targetNodeId: string;
  status: 'success' | 'failed';
  summary?: NodeSyncImportResult['summary'];
  failureCountTotal: number;
  failureSamples: NodeSyncFailure[];
  failureSampleTruncated: boolean;
  message?: string;
}

export interface NodeSyncRunReport {
  sourceNodeId: string;
  scope: SyncEntityType[];
  exportByEntity: NodeSyncEntityExportReport[];
  targets: NodeSyncTargetDetailedReport[];
}

export interface BuildNodeSyncReportInput {
  sourceNodeId: string;
  scope: SyncEntityType[];
  bundle: NodeSyncBundle;
  targets: Array<{
    targetNodeId: string;
    status: 'success' | 'failed';
    summary?: NodeSyncImportResult['summary'];
    failures?: NodeSyncFailure[];
    message?: string;
  }>;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toEntityRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
}

export class NodeSyncReportingService {
  private readonly maxKeySamplesPerEntity: number;
  private readonly maxFailureSamplesPerTarget: number;

  constructor(options?: {
    maxKeySamplesPerEntity?: number;
    maxFailureSamplesPerTarget?: number;
  }) {
    this.maxKeySamplesPerEntity =
      options?.maxKeySamplesPerEntity && options.maxKeySamplesPerEntity > 0
        ? options.maxKeySamplesPerEntity
        : DEFAULT_MAX_KEY_SAMPLES_PER_ENTITY;
    this.maxFailureSamplesPerTarget =
      options?.maxFailureSamplesPerTarget && options.maxFailureSamplesPerTarget > 0
        ? options.maxFailureSamplesPerTarget
        : DEFAULT_MAX_FAILURE_SAMPLES_PER_TARGET;
  }

  buildReport(input: BuildNodeSyncReportInput): NodeSyncRunReport {
    const exportByEntity = input.scope.map((entityType) => {
      const records = toEntityRecords(input.bundle.entities?.[entityType] ?? []);
      const keys = records.map((record, index) => this.extractEntityKey(entityType, record, index));
      return {
        entityType,
        exportedCount: keys.length,
        sampledKeys: keys.slice(0, this.maxKeySamplesPerEntity),
        sampleTruncated: keys.length > this.maxKeySamplesPerEntity,
      } satisfies NodeSyncEntityExportReport;
    });

    const targets = input.targets.map((target) => {
      const failures = Array.isArray(target.failures) ? target.failures : [];
      const failureSamples = failures.slice(0, this.maxFailureSamplesPerTarget).map((failure) => ({
        entityType: failure.entityType,
        key: asString(failure.key, '<unknown-key>'),
        message: asString(failure.message, '<no-message>'),
      }));

      return {
        targetNodeId: target.targetNodeId,
        status: target.status,
        summary: target.summary,
        failureCountTotal: failures.length,
        failureSamples,
        failureSampleTruncated: failures.length > this.maxFailureSamplesPerTarget,
        message: target.message,
      } satisfies NodeSyncTargetDetailedReport;
    });

    return {
      sourceNodeId: input.sourceNodeId,
      scope: [...input.scope],
      exportByEntity,
      targets,
    };
  }

  private extractEntityKey(
    entityType: SyncEntityType,
    record: Record<string, unknown>,
    index: number,
  ): string {
    const fallback = `${entityType}#${index + 1}`;
    switch (entityType) {
      case 'prompt':
        return asString(record.key, fallback);
      case 'agent_definition':
        return asString(record.id, asString(record.name, fallback));
      case 'agent_team_definition':
        return asString(record.id, asString(record.name, fallback));
      case 'mcp_server_configuration':
        return asString(
          record.serverId,
          asString(record.server_id, asString(record.name, fallback)),
        );
      default:
        return fallback;
    }
  }
}
