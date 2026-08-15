import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { getTaskDelegationProjectionService } from "../../../agent-team-execution/task-delegation/task-delegation-projection-service.js";

@ObjectType()
class TaskDelegationReferenceFileObject {
  @Field(() => String) referenceId!: string;
  @Field(() => String) path!: string;
  @Field(() => String) type!: string;
  @Field(() => String) createdAt!: string;
  @Field(() => String) updatedAt!: string;
}

@ObjectType()
class TaskDelegationUpdateObject {
  @Field(() => String) kind!: string;
  @Field(() => String, { nullable: true }) submissionId!: string | null;
  @Field(() => String, { nullable: true }) reviewId!: string | null;
  @Field(() => String, { nullable: true }) interruptionId!: string | null;
  @Field(() => String, { nullable: true }) reviewedSubmissionId!: string | null;
  @Field(() => String, { nullable: true }) decision!: string | null;
  @Field(() => String, { nullable: true }) content!: string | null;
  @Field(() => [TaskDelegationReferenceFileObject]) referenceFiles!: TaskDelegationReferenceFileObject[];
  @Field(() => String) createdAt!: string;
}

@ObjectType()
class TaskDelegationRecordObject {
  @Field(() => String) taskId!: string;
  @Field(() => String) delegatorAgentRunId!: string;
  @Field(() => String) recipientAddress!: string;
  @Field(() => String, { nullable: true }) targetAgentRunId!: string | null;
  @Field(() => String, { nullable: true }) targetTeamRunId!: string | null;
  @Field(() => String) description!: string;
  @Field(() => [TaskDelegationReferenceFileObject]) referenceFiles!: TaskDelegationReferenceFileObject[];
  @Field(() => String) status!: string;
  @Field(() => [TaskDelegationUpdateObject]) updates!: TaskDelegationUpdateObject[];
  @Field(() => String) createdAt!: string;
}

@Resolver()
export class TaskDelegationResolver {
  @Query(() => [TaskDelegationRecordObject])
  async getTaskDelegationRecords(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TaskDelegationRecordObject[]> {
    return (await getTaskDelegationProjectionService().list(teamRunId)).map((record) => ({
      ...record,
      referenceFiles: record.referenceFiles.map((reference) => ({ ...reference })),
      updates: record.updates.map((update) => ({
        ...update,
        referenceFiles: update.referenceFiles.map((reference) => ({ ...reference })),
      })),
    }));
  }
}
