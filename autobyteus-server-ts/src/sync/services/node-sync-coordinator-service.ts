import type { NodeSyncImportResult } from './node-sync-service.js';
import { NodeSyncRemoteClient } from './node-sync-remote-client.js';
import {
  NodeSyncReportingService,
  type NodeSyncRunReport,
} from './node-sync-reporting-service.js';
import {
  NodeSyncPreflightService,
  NodeSyncPreflightValidationError,
  type RunNodeSyncInput,
  type NodeSyncValidatedPlan,
} from './node-sync-preflight-service.js';

export type NodeSyncRunStatus = 'success' | 'partial-success' | 'failed';
const MAX_TARGET_MESSAGE_LENGTH = 280;

export interface NodeSyncTargetRunResult {
  targetNodeId: string;
  status: 'success' | 'failed';
  summary?: NodeSyncImportResult['summary'];
  message?: string;
}

export interface NodeSyncRunResult {
  status: NodeSyncRunStatus;
  sourceNodeId: string;
  targetResults: NodeSyncTargetRunResult[];
  error?: string | null;
  report?: NodeSyncRunReport | null;
}

type NodeSyncRemoteClientLike = Pick<NodeSyncRemoteClient, 'exportBundle' | 'importBundle'>;
type NodeSyncPreflightServiceLike = Pick<NodeSyncPreflightService, 'validate'>;
type NodeSyncReportingServiceLike = Pick<NodeSyncReportingService, 'buildReport'>;

interface NodeSyncTargetReportInput extends NodeSyncTargetRunResult {
  failures: NodeSyncImportResult['failures'];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class NodeSyncCoordinatorService {
  private static instance: NodeSyncCoordinatorService | null = null;

  static getInstance(): NodeSyncCoordinatorService {
    if (!NodeSyncCoordinatorService.instance) {
      const remoteClient = new NodeSyncRemoteClient();
      NodeSyncCoordinatorService.instance = new NodeSyncCoordinatorService({
        remoteClient,
        preflightService: new NodeSyncPreflightService(remoteClient),
      });
    }
    return NodeSyncCoordinatorService.instance;
  }

  constructor(
    private readonly options: {
      remoteClient?: NodeSyncRemoteClientLike;
      preflightService?: NodeSyncPreflightServiceLike;
      reportingService?: NodeSyncReportingServiceLike;
    } = {},
  ) {}

  async run(input: RunNodeSyncInput): Promise<NodeSyncRunResult> {
    const preflightService = this.options.preflightService ?? new NodeSyncPreflightService();
    const remoteClient = this.options.remoteClient ?? new NodeSyncRemoteClient();
    const reportingService = this.options.reportingService ?? new NodeSyncReportingService();

    const plan = await preflightService.validate(input);

    const exportResult = await this.exportSourceBundle(plan, remoteClient);
    if ('error' in exportResult) {
      return {
        status: 'failed',
        sourceNodeId: plan.source.nodeId,
        targetResults: [],
        error: exportResult.error,
        report: null,
      };
    }

    const targetResults: NodeSyncTargetRunResult[] = [];
    const targetReportInputs: NodeSyncTargetReportInput[] = [];
    for (const target of plan.targets) {
      try {
        const importResult = await remoteClient.importBundle(target.baseUrl, {
          bundle: exportResult.bundle,
          scope: plan.scope,
          conflictPolicy: plan.conflictPolicy,
          tombstonePolicy: plan.tombstonePolicy,
        });

        if (!importResult.success) {
          const failedResult: NodeSyncTargetRunResult = {
            targetNodeId: target.nodeId,
            status: 'failed',
            message: this.buildTargetSummaryMessage({
              failures: importResult.failures,
              fallback: 'Import returned unsuccessful status.',
            }),
            summary: importResult.summary,
          };
          targetResults.push(failedResult);
          targetReportInputs.push({
            ...failedResult,
            failures: importResult.failures,
          });
          continue;
        }

        const successResult: NodeSyncTargetRunResult = {
          targetNodeId: target.nodeId,
          status: 'success',
          summary: importResult.summary,
        };
        targetResults.push(successResult);
        targetReportInputs.push({
          ...successResult,
          failures: [],
        });
      } catch (error) {
        const failedResult: NodeSyncTargetRunResult = {
          targetNodeId: target.nodeId,
          status: 'failed',
          message: this.buildTargetSummaryMessage({ fallback: getErrorMessage(error) }),
        };
        targetResults.push(failedResult);
        targetReportInputs.push({
          ...failedResult,
          failures: [],
        });
      }
    }

    const report = reportingService.buildReport({
      sourceNodeId: plan.source.nodeId,
      scope: plan.scope,
      bundle: exportResult.bundle,
      targets: targetReportInputs,
    });

    return this.toAggregateResult(plan, targetResults, report);
  }

  private async exportSourceBundle(
    plan: NodeSyncValidatedPlan,
    remoteClient: NodeSyncRemoteClientLike,
  ): Promise<{ bundle: Awaited<ReturnType<NodeSyncRemoteClientLike['exportBundle']>> } | { error: string }> {
    try {
      const bundle = await remoteClient.exportBundle(plan.source.baseUrl, {
        scope: plan.scope,
        selection: plan.selection,
      });
      return { bundle };
    } catch (error) {
      return {
        error: `Source export failed for '${plan.source.nodeId}' (${plan.source.baseUrl}): ${getErrorMessage(error)}`,
      };
    }
  }

  private toAggregateResult(
    plan: NodeSyncValidatedPlan,
    targetResults: NodeSyncTargetRunResult[],
    report: NodeSyncRunReport,
  ): NodeSyncRunResult {
    const successCount = targetResults.filter((result) => result.status === 'success').length;

    if (successCount === targetResults.length) {
      return {
        status: 'success',
        sourceNodeId: plan.source.nodeId,
        targetResults,
        report,
      };
    }

    if (successCount === 0) {
      return {
        status: 'failed',
        sourceNodeId: plan.source.nodeId,
        targetResults,
        error: 'All target imports failed.',
        report,
      };
    }

    return {
      status: 'partial-success',
      sourceNodeId: plan.source.nodeId,
      targetResults,
      error: 'One or more target imports failed.',
      report,
    };
  }

  private buildTargetSummaryMessage(input: {
    failures?: NodeSyncImportResult['failures'];
    fallback?: string;
  }): string {
    const failures = input.failures ?? [];
    if (failures.length > 0) {
      const firstFailure = failures[0];
      const message = `Import failed with ${failures.length} issue(s). First: [${firstFailure.entityType}] ${firstFailure.key}: ${firstFailure.message}`;
      return this.clampMessage(message);
    }
    return this.clampMessage(input.fallback ?? 'Import failed.');
  }

  private clampMessage(message: string): string {
    if (message.length <= MAX_TARGET_MESSAGE_LENGTH) {
      return message;
    }
    return `${message.slice(0, MAX_TARGET_MESSAGE_LENGTH - 3)}...`;
  }
}

export { NodeSyncPreflightValidationError };
export type { RunNodeSyncInput };
