import { Arg, Field, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import {
  AppDataMigrationDuplicateRunError,
  type AppDataMigrationStatus,
} from "../../../app-data-migrations/domain/app-data-migration-types.js";
import { getAppDataMigrationRunner } from "../../../app-data-migrations/app-data-migration-runner.js";

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

  @Field(() => Number)
  attempts!: number;

  @Field(() => Date, { nullable: true })
  startedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  completedAt?: Date | null;

  @Field(() => GraphQLJSON, { nullable: true })
  summary?: unknown | null;

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
