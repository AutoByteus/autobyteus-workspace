import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
} from 'type-graphql';
import {
  NodeSyncCoordinatorService,
  NodeSyncPreflightValidationError,
  type NodeSyncRunResult as NodeSyncRunServiceResult,
  type RunNodeSyncInput as RunNodeSyncServiceInput,
} from '../../../sync/services/node-sync-coordinator-service.js';
import {
  ExportNodeSyncSelectionInput,
  ImportNodeSyncSummary,
  SyncConflictPolicyEnum,
  SyncEntityTypeEnum,
  SyncTombstonePolicyEnum,
} from './node-sync.js';

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

@InputType()
class NodeSyncEndpointInput {
  @Field(() => String)
  nodeId!: string;

  @Field(() => String)
  baseUrl!: string;
}

@InputType()
class RunNodeSyncInput {
  @Field(() => NodeSyncEndpointInput)
  source!: NodeSyncEndpointInput;

  @Field(() => [NodeSyncEndpointInput])
  targets!: NodeSyncEndpointInput[];

  @Field(() => [SyncEntityTypeEnum])
  scope!: SyncEntityTypeEnum[];

  @Field(() => ExportNodeSyncSelectionInput, { nullable: true })
  selection?: ExportNodeSyncSelectionInput | null;

  @Field(() => SyncConflictPolicyEnum)
  conflictPolicy!: SyncConflictPolicyEnum;

  @Field(() => SyncTombstonePolicyEnum)
  tombstonePolicy!: SyncTombstonePolicyEnum;
}

@ObjectType()
class NodeSyncTargetRunResult {
  @Field(() => String)
  targetNodeId!: string;

  @Field(() => String)
  status!: 'success' | 'failed';

  @Field(() => ImportNodeSyncSummary, { nullable: true })
  summary?: ImportNodeSyncSummary;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
class NodeSyncExportEntityReport {
  @Field(() => SyncEntityTypeEnum)
  entityType!: SyncEntityTypeEnum;

  @Field(() => Number)
  exportedCount!: number;

  @Field(() => [String])
  sampledKeys!: string[];

  @Field(() => Boolean)
  sampleTruncated!: boolean;
}

@ObjectType()
class NodeSyncFailureSample {
  @Field(() => SyncEntityTypeEnum)
  entityType!: SyncEntityTypeEnum;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  message!: string;
}

@ObjectType()
class NodeSyncTargetDetailedReport {
  @Field(() => String)
  targetNodeId!: string;

  @Field(() => String)
  status!: 'success' | 'failed';

  @Field(() => ImportNodeSyncSummary, { nullable: true })
  summary?: ImportNodeSyncSummary;

  @Field(() => Number)
  failureCountTotal!: number;

  @Field(() => [NodeSyncFailureSample])
  failureSamples!: NodeSyncFailureSample[];

  @Field(() => Boolean)
  failureSampleTruncated!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
class NodeSyncRunReport {
  @Field(() => String)
  sourceNodeId!: string;

  @Field(() => [SyncEntityTypeEnum])
  scope!: SyncEntityTypeEnum[];

  @Field(() => [NodeSyncExportEntityReport])
  exportByEntity!: NodeSyncExportEntityReport[];

  @Field(() => [NodeSyncTargetDetailedReport])
  targets!: NodeSyncTargetDetailedReport[];
}

function toGraphqlEntityType(entityType: string): SyncEntityTypeEnum {
  switch (entityType) {
    case 'prompt':
      return SyncEntityTypeEnum.PROMPT;
    case 'agent_definition':
      return SyncEntityTypeEnum.AGENT_DEFINITION;
    case 'agent_team_definition':
      return SyncEntityTypeEnum.AGENT_TEAM_DEFINITION;
    case 'mcp_server_configuration':
      return SyncEntityTypeEnum.MCP_SERVER_CONFIGURATION;
    default:
      throw new Error(`Unsupported sync entity type: ${entityType}`);
  }
}

function toGraphqlRunNodeSyncResult(result: NodeSyncRunServiceResult): RunNodeSyncResult {
  return {
    ...result,
    report: result.report
      ? {
          sourceNodeId: result.report.sourceNodeId,
          scope: result.report.scope.map((scope) => toGraphqlEntityType(scope)),
          exportByEntity: result.report.exportByEntity.map((entry) => ({
            entityType: toGraphqlEntityType(entry.entityType),
            exportedCount: entry.exportedCount,
            sampledKeys: entry.sampledKeys,
            sampleTruncated: entry.sampleTruncated,
          })),
          targets: result.report.targets.map((target) => ({
            targetNodeId: target.targetNodeId,
            status: target.status,
            summary: target.summary,
            failureCountTotal: target.failureCountTotal,
            failureSamples: target.failureSamples.map((failure) => ({
              entityType: toGraphqlEntityType(failure.entityType),
              key: failure.key,
              message: failure.message,
            })),
            failureSampleTruncated: target.failureSampleTruncated,
            message: target.message,
          })),
        }
      : null,
  };
}

@ObjectType()
class RunNodeSyncResult {
  @Field(() => String)
  status!: 'success' | 'partial-success' | 'failed';

  @Field(() => String)
  sourceNodeId!: string;

  @Field(() => [NodeSyncTargetRunResult])
  targetResults!: NodeSyncTargetRunResult[];

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field(() => NodeSyncRunReport, { nullable: true })
  report?: NodeSyncRunReport | null;
}

@Resolver()
export class NodeSyncControlResolver {
  private readonly coordinator = NodeSyncCoordinatorService.getInstance();

  @Mutation(() => RunNodeSyncResult)
  async runNodeSync(
    @Arg('input', () => RunNodeSyncInput) input: RunNodeSyncInput,
  ): Promise<RunNodeSyncResult> {
    try {
      const result = await this.coordinator.run({
        source: {
          nodeId: input.source.nodeId,
          baseUrl: input.source.baseUrl,
        },
        targets: input.targets.map((target) => ({
          nodeId: target.nodeId,
          baseUrl: target.baseUrl,
        })),
        scope: input.scope as unknown as RunNodeSyncServiceInput['scope'],
        selection: input.selection
          ? {
              agentDefinitionIds: input.selection.agentDefinitionIds ?? null,
              agentTeamDefinitionIds: input.selection.agentTeamDefinitionIds ?? null,
              includeDependencies: input.selection.includeDependencies ?? null,
              includeDeletes: input.selection.includeDeletes ?? null,
            }
          : null,
        conflictPolicy: input.conflictPolicy as unknown as RunNodeSyncServiceInput['conflictPolicy'],
        tombstonePolicy: input.tombstonePolicy as unknown as RunNodeSyncServiceInput['tombstonePolicy'],
      });

      return toGraphqlRunNodeSyncResult(result);
    } catch (error) {
      if (error instanceof NodeSyncPreflightValidationError) {
        logger.error(
          `Node sync preflight failed [${error.failureClass}] retryable=${String(error.retryable)}: ${error.message}`,
        );
        throw new Error(`Node sync preflight failed [${error.failureClass}]: ${error.message}`);
      }

      logger.error(`Node sync run failed: ${String(error)}`);
      throw new Error(`Node sync run failed: ${String(error)}`);
    }
  }
}
