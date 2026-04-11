import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { getRunFileChangeProjectionService } from "../../../run-history/services/run-file-change-projection-service.js";

@ObjectType()
class RunFileChangeEntryObject {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  runId!: string;

  @Field(() => String)
  path!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  sourceTool!: string;

  @Field(() => String, { nullable: true })
  sourceInvocationId?: string | null;

  @Field(() => String, { nullable: true })
  content?: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@Resolver()
export class RunFileChangesResolver {
  private readonly projectionService = getRunFileChangeProjectionService();

  @Query(() => [RunFileChangeEntryObject])
  async getRunFileChanges(
    @Arg("runId", () => String) runId: string,
  ): Promise<RunFileChangeEntryObject[]> {
    return this.projectionService.getProjection(runId);
  }
}
