import { describe, expect, it } from 'vitest';
import { NodeSyncReportingService } from '../../../src/sync/services/node-sync-reporting-service.js';

describe('NodeSyncReportingService', () => {
  it('builds export and target report blocks with bounded samples', () => {
    const service = new NodeSyncReportingService();
    const promptEntities = Array.from({ length: 30 }, (_, index) => ({
      key: `prompt-${index + 1}`,
    }));
    const failures = Array.from({ length: 60 }, (_, index) => ({
      entityType: 'prompt' as const,
      key: `prompt-${index + 1}`,
      message: `failure-${index + 1}`,
    }));

    const report = service.buildReport({
      sourceNodeId: 'source-a',
      scope: ['prompt', 'agent_definition'],
      bundle: {
        watermark: 'wm-1',
        entities: {
          prompt: promptEntities,
          agent_definition: [],
        },
        tombstones: {},
      },
      targets: [
        {
          targetNodeId: 'target-a',
          status: 'failed',
          summary: {
            processed: 60,
            created: 0,
            updated: 0,
            deleted: 0,
            skipped: 60,
          },
          failures,
          message: 'Import failed with 60 issue(s).',
        },
      ],
    });

    expect(report.sourceNodeId).toBe('source-a');
    expect(report.scope).toEqual(['prompt', 'agent_definition']);
    expect(report.exportByEntity).toEqual([
      expect.objectContaining({
        entityType: 'prompt',
        exportedCount: 30,
        sampleTruncated: true,
      }),
      expect.objectContaining({
        entityType: 'agent_definition',
        exportedCount: 0,
        sampledKeys: [],
        sampleTruncated: false,
      }),
    ]);
    expect(report.exportByEntity[0]?.sampledKeys).toHaveLength(25);
    expect(report.targets).toHaveLength(1);
    expect(report.targets[0]).toEqual(
      expect.objectContaining({
        targetNodeId: 'target-a',
        status: 'failed',
        failureCountTotal: 60,
        failureSampleTruncated: true,
        message: 'Import failed with 60 issue(s).',
      }),
    );
    expect(report.targets[0]?.failureSamples).toHaveLength(50);
  });

  it('falls back to deterministic placeholders when entity key fields are missing', () => {
    const service = new NodeSyncReportingService({
      maxKeySamplesPerEntity: 10,
      maxFailureSamplesPerTarget: 10,
    });

    const report = service.buildReport({
      sourceNodeId: 'source-a',
      scope: ['mcp_server_configuration'],
      bundle: {
        watermark: 'wm-1',
        entities: {
          mcp_server_configuration: [{}, { transportType: 'stdio' }],
        },
        tombstones: {},
      },
      targets: [],
    });

    expect(report.exportByEntity[0]).toEqual({
      entityType: 'mcp_server_configuration',
      exportedCount: 2,
      sampledKeys: [
        'mcp_server_configuration#1',
        'mcp_server_configuration#2',
      ],
      sampleTruncated: false,
    });
  });
});
