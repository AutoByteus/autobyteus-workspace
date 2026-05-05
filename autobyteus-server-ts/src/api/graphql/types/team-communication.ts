import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { getTeamCommunicationProjectionService } from "../../../services/team-communication/team-communication-projection-service.js";

@ObjectType()
class TeamCommunicationReferenceFileObject {
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
class TeamCommunicationMessageObject {
  @Field(() => String)
  messageId!: string;

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
  content!: string;

  @Field(() => String)
  messageType!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => [TeamCommunicationReferenceFileObject])
  referenceFiles!: TeamCommunicationReferenceFileObject[];
}

@Resolver()
export class TeamCommunicationResolver {
  private readonly projectionService = getTeamCommunicationProjectionService();

  @Query(() => [TeamCommunicationMessageObject])
  async getTeamCommunicationMessages(
    @Arg("teamRunId", () => String) teamRunId: string,
  ): Promise<TeamCommunicationMessageObject[]> {
    return this.projectionService.getTeamCommunicationMessages(teamRunId);
  }
}
