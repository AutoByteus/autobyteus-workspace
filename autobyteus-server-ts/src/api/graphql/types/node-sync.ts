import { GraphQLJSON } from 'graphql-scalars';
import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from 'type-graphql';
import {
  NodeSyncService,
  type SyncEntityType,
  type SyncConflictPolicy,
  type SyncTombstonePolicy,
  type ExportNodeSyncBundleInput as ExportNodeSyncBundleServiceInput,
} from '../../../sync/services/node-sync-service.js';

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

export enum SyncEntityTypeEnum {
  PROMPT = 'prompt',
  AGENT_DEFINITION = 'agent_definition',
  AGENT_TEAM_DEFINITION = 'agent_team_definition',
  MCP_SERVER_CONFIGURATION = 'mcp_server_configuration',
}

export enum SyncConflictPolicyEnum {
  SOURCE_WINS = 'source_wins',
  TARGET_WINS = 'target_wins',
}

export enum SyncTombstonePolicyEnum {
  SOURCE_DELETE_WINS = 'source_delete_wins',
}

registerEnumType(SyncEntityTypeEnum, { name: 'SyncEntityTypeEnum' });
registerEnumType(SyncConflictPolicyEnum, { name: 'SyncConflictPolicyEnum' });
registerEnumType(SyncTombstonePolicyEnum, { name: 'SyncTombstonePolicyEnum' });

@ObjectType()
export class ExportNodeSyncBundleResult {
  @Field(() => String)
  watermark!: string;

  @Field(() => GraphQLJSON)
  entities!: Record<string, unknown[]>;

  @Field(() => GraphQLJSON)
  tombstones!: Record<string, string[]>;
}

@ObjectType()
export class ImportNodeSyncSummary {
  @Field(() => Number)
  processed!: number;

  @Field(() => Number)
  created!: number;

  @Field(() => Number)
  updated!: number;

  @Field(() => Number)
  deleted!: number;

  @Field(() => Number)
  skipped!: number;
}

@ObjectType()
export class ImportNodeSyncFailure {
  @Field(() => SyncEntityTypeEnum)
  entityType!: SyncEntityTypeEnum;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  message!: string;
}

@ObjectType()
export class ImportNodeSyncBundleResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  appliedWatermark!: string | null;

  @Field(() => ImportNodeSyncSummary)
  summary!: ImportNodeSyncSummary;

  @Field(() => [ImportNodeSyncFailure])
  failures!: ImportNodeSyncFailure[];
}

@InputType()
export class ExportNodeSyncBundleInput {
  @Field(() => [SyncEntityTypeEnum])
  scope!: SyncEntityTypeEnum[];

  @Field(() => GraphQLJSON, { nullable: true })
  watermarkByEntity?: Record<string, string | null> | null;

  @Field(() => ExportNodeSyncSelectionInput, { nullable: true })
  selection?: ExportNodeSyncSelectionInput | null;
}

@InputType()
export class ExportNodeSyncSelectionInput {
  @Field(() => [String], { nullable: true })
  agentDefinitionIds?: string[] | null;

  @Field(() => [String], { nullable: true })
  agentTeamDefinitionIds?: string[] | null;

  @Field(() => Boolean, { nullable: true })
  includeDependencies?: boolean | null;

  @Field(() => Boolean, { nullable: true })
  includeDeletes?: boolean | null;
}

@InputType()
export class ImportNodeSyncBundleInput {
  @Field(() => [SyncEntityTypeEnum])
  scope!: SyncEntityTypeEnum[];

  @Field(() => SyncConflictPolicyEnum)
  conflictPolicy!: SyncConflictPolicyEnum;

  @Field(() => SyncTombstonePolicyEnum)
  tombstonePolicy!: SyncTombstonePolicyEnum;

  @Field(() => GraphQLJSON)
  bundle!: {
    watermark: string;
    entities: Record<string, unknown[]>;
    tombstones: Record<string, string[]>;
  };
}

@Resolver()
export class NodeSyncResolver {
  private readonly syncService = NodeSyncService.getInstance();

  @Query(() => ExportNodeSyncBundleResult)
  async exportSyncBundle(
    @Arg('input', () => ExportNodeSyncBundleInput) input: ExportNodeSyncBundleInput,
  ): Promise<ExportNodeSyncBundleResult> {
    try {
      return await this.syncService.exportBundle({
        scope: input.scope as unknown as SyncEntityType[],
        watermarkByEntity: (input.watermarkByEntity ?? undefined) as
          | Partial<Record<SyncEntityType, string | null>>
          | undefined,
        selection: this.toSelectionInput(input),
      } satisfies ExportNodeSyncBundleServiceInput);
    } catch (error) {
      logger.error(`Failed to export sync bundle: ${String(error)}`);
      throw new Error(`Failed to export sync bundle: ${String(error)}`);
    }
  }

  @Mutation(() => ImportNodeSyncBundleResult)
  async importSyncBundle(
    @Arg('input', () => ImportNodeSyncBundleInput) input: ImportNodeSyncBundleInput,
  ): Promise<ImportNodeSyncBundleResult> {
    try {
      const result = await this.syncService.importBundle({
        scope: input.scope as unknown as SyncEntityType[],
        conflictPolicy: input.conflictPolicy as unknown as SyncConflictPolicy,
        tombstonePolicy: input.tombstonePolicy as unknown as SyncTombstonePolicy,
        bundle: {
          watermark: input.bundle?.watermark ?? new Date().toISOString(),
          entities: input.bundle?.entities ?? {},
          tombstones: input.bundle?.tombstones ?? {},
        },
      });

      return {
        ...result,
        failures: result.failures.map((failure) => ({
          ...failure,
          entityType: failure.entityType as SyncEntityTypeEnum,
        })),
      };
    } catch (error) {
      logger.error(`Failed to import sync bundle: ${String(error)}`);
      throw new Error(`Failed to import sync bundle: ${String(error)}`);
    }
  }

  private toSelectionInput(input: ExportNodeSyncBundleInput): ExportNodeSyncBundleServiceInput['selection'] {
    if (!input.selection) {
      return undefined;
    }
    return {
      agentDefinitionIds: input.selection.agentDefinitionIds ?? null,
      agentTeamDefinitionIds: input.selection.agentTeamDefinitionIds ?? null,
      includeDependencies: input.selection.includeDependencies ?? null,
      includeDeletes: input.selection.includeDeletes ?? null,
    };
  }
}
