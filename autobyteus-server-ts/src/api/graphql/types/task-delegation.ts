import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { getTaskDelegationRecordsService } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-service.js";

@ObjectType()
class TaskDelegationReferenceFileObject {
  @Field(() => String)
  referenceId!: string;

  @Field(() => String)
  path!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@ObjectType()
class TaskDelegationTargetAddressObject {
  @Field(() => String)
  rootTeamRunId!: string;

  @Field(() => [String])
  taskTeamRunIds!: string[];

  @Field(() => String)
  memberAddress!: string;

  @Field(() => String, { nullable: true })
  taskAgentRunId?: string | null;
}

@ObjectType()
class TaskDelegationTaskRunObject {
  @Field(() => TaskDelegationTargetAddressObject)
  address!: TaskDelegationTargetAddressObject;

  @Field(() => String)
  startedAt!: string;
}

@ObjectType()
class TaskDelegationUpdateObject {
  @Field(() => String)
  kind!: string;

  @Field(() => String, { nullable: true })
  submissionId?: string | null;

  @Field(() => String, { nullable: true })
  reviewId?: string | null;

  @Field(() => String, { nullable: true })
  reviewedSubmissionId?: string | null;

  @Field(() => String, { nullable: true })
  decision?: string | null;

  @Field(() => TaskDelegationTargetAddressObject)
  senderAddress!: TaskDelegationTargetAddressObject;

  @Field(() => TaskDelegationTargetAddressObject)
  receiverAddress!: TaskDelegationTargetAddressObject;

  @Field(() => String, { nullable: true })
  content?: string | null;

  @Field(() => [TaskDelegationReferenceFileObject])
  referenceFiles!: TaskDelegationReferenceFileObject[];

  @Field(() => String)
  createdAt!: string;
}

@ObjectType()
class TaskDelegationRecordObject {
  @Field(() => String)
  taskId!: string;

  @Field(() => String)
  status!: string;

  @Field(() => TaskDelegationTargetAddressObject)
  senderAddress!: TaskDelegationTargetAddressObject;

  @Field(() => TaskDelegationTargetAddressObject)
  receiverAddress!: TaskDelegationTargetAddressObject;

  @Field(() => String)
  receiverTargetKind!: string;

  @Field(() => String)
  content!: string;

  @Field(() => [TaskDelegationReferenceFileObject])
  referenceFiles!: TaskDelegationReferenceFileObject[];

  @Field(() => TaskDelegationTaskRunObject, { nullable: true })
  taskRun?: TaskDelegationTaskRunObject | null;

  @Field(() => [TaskDelegationUpdateObject])
  updates!: TaskDelegationUpdateObject[];

  @Field(() => String)
  createdAt!: string;
}

@Resolver()
export class TaskDelegationResolver {
  private readonly recordsService = getTaskDelegationRecordsService();

  @Query(() => [TaskDelegationRecordObject])
  async getTaskDelegationRecords(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TaskDelegationRecordObject[]> {
    return this.recordsService.getTaskDelegationRecords(teamRunId) as unknown as Promise<TaskDelegationRecordObject[]>;
  }
}
