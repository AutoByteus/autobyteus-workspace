import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { getMessageFileReferenceProjectionService } from "../../../services/message-file-references/message-file-reference-projection-service.js";

@ObjectType()
class MessageFileReferenceEntryObject {
  @Field(() => String)
  referenceId!: string;

  @Field(() => String)
  teamRunId!: string;

  @Field(() => String)
  senderRunId!: string;

  @Field(() => String, { nullable: true })
  senderMemberName?: string | null;

  @Field(() => String)
  receiverRunId!: string;

  @Field(() => String, { nullable: true })
  receiverMemberName?: string | null;

  @Field(() => String)
  path!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  messageType!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@Resolver()
export class MessageFileReferencesResolver {
  private readonly projectionService = getMessageFileReferenceProjectionService();

  @Query(() => [MessageFileReferenceEntryObject])
  async getMessageFileReferences(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<MessageFileReferenceEntryObject[]> {
    return this.projectionService.getMessageFileReferences(teamRunId);
  }
}
