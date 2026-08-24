import { Arg, Field, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import {
  AppDataMigrationDuplicateRunError,
  AppDataMigrationRecoveryAction,
  type AppDataMigrationStatus,
} from "../../../app-data-migrations/domain/app-data-migration-types.js";
import { getAppDataMigrationRunner } from "../../../app-data-migrations/app-data-migration-runner.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../../../app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { TeamRunPackageCatalog } from "../../../run-history/services/team-run-package-catalog.js";

export enum AppDataMigrationStatusEnum {
  NOT_RUN = "NOT_RUN",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  SUCCEEDED_WITH_WARNINGS = "SUCCEEDED_WITH_WARNINGS",
}

registerEnumType(AppDataMigrationStatusEnum, {
  name: "AppDataMigrationStatus",
});

registerEnumType(AppDataMigrationRecoveryAction, {
  name: "AppDataMigrationRecoveryAction",
});

@ObjectType()
class AppDataMigrationMutationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => AppDataMigrationRecordObject, { nullable: true })
  migration?: AppDataMigrationRecordObject | null;
}

@ObjectType()
class AppDataMigrationRecordObject {
  @Field(() => String)
  migrationId!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  description!: string;

  @Field(() => AppDataMigrationStatusEnum)
  status!: AppDataMigrationStatusEnum;

  @Field(() => Boolean)
  requiredOnStartup!: boolean;

  @Field(() => Boolean)
  canRetry!: boolean;

  @Field(() => AppDataMigrationRecoveryAction)
  recoveryAction!: AppDataMigrationRecoveryAction;

  @Field(() => Number)
  attempts!: number;

  @Field(() => Date, { nullable: true })
  startedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  completedAt?: Date | null;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  errorMessage?: string | null;

  @Field(() => String, { nullable: true })
  logPath?: string | null;
}

const toStatusEnum = (status: AppDataMigrationStatus): AppDataMigrationStatusEnum =>
  AppDataMigrationStatusEnum[status];

const toRecordObject = (snapshot: Awaited<ReturnType<ReturnType<typeof getAppDataMigrationRunner>["listStatuses"]>>[number]): AppDataMigrationRecordObject => ({
  migrationId: snapshot.migrationId,
  displayName: snapshot.displayName,
  description: snapshot.description,
  status: toStatusEnum(snapshot.status),
  requiredOnStartup: snapshot.requiredOnStartup,
  recoveryAction: snapshot.recoveryAction,
  canRetry: snapshot.canRetry,
  attempts: snapshot.attempts,
  startedAt: snapshot.startedAt,
  completedAt: snapshot.completedAt,
  summary: snapshot.summary,
  errorMessage: snapshot.errorMessage,
  logPath: snapshot.logPath,
});

@Resolver()
export class AppDataMigrationResolver {
  private readonly runner = getAppDataMigrationRunner();

  @Query(() => [AppDataMigrationRecordObject])
  async getAppDataMigrations(): Promise<AppDataMigrationRecordObject[]> {
    return (await this.runner.listStatuses()).map(toRecordObject);
  }

  @Mutation(() => AppDataMigrationMutationResult)
  async runAppDataMigration(
    @Arg("migrationId", () => String) migrationId: string,
  ): Promise<AppDataMigrationMutationResult> {
    try {
      const snapshot = await this.runner.runMigration(migrationId);
      if (migrationId === TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID) {
        // Manual Settings Retry is not complete until the current-package
        // admission catalog reflects every V2 file produced by this attempt.
        await new TeamRunPackageCatalog(appConfigProvider.config.getMemoryDir()).rebuild();
      }
      return {
        success: snapshot.status !== "FAILED",
        message: `Migration '${migrationId}' completed with status ${snapshot.status}.`,
        migration: toRecordObject(snapshot),
      };
    } catch (error) {
      const duplicate = error instanceof AppDataMigrationDuplicateRunError;
      return {
        success: false,
        message: duplicate
          ? error.message
          : error instanceof Error ? error.message : String(error),
        migration: null,
      };
    }
  }
}
