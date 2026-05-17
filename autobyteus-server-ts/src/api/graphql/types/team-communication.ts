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
class TeamCommunicationMemberAddressObject {
  @Field(() => String)
  teamRunId!: string;

  @Field(() => [String])
  memberPath!: string[];

  @Field(() => String)
  memberRouteKey!: string;
}

@ObjectType()
class TeamCommunicationRepresentedSubTeamObject {
  @Field(() => String)
  memberKind!: string;

  @Field(() => String)
  memberName!: string;

  @Field(() => [String])
  memberPath!: string[];

  @Field(() => String)
  memberRouteKey!: string;

  @Field(() => String)
  memberRunId!: string;

  @Field(() => String)
  teamDefinitionId!: string;

  @Field(() => String, { nullable: true })
  childTeamRunId?: string | null;

  @Field(() => TeamCommunicationMemberAddressObject)
  address!: TeamCommunicationMemberAddressObject;
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
  senderMemberKind?: string | null;

  @Field(() => [String], { nullable: true })
  senderMemberPath?: string[] | null;

  @Field(() => String, { nullable: true })
  senderMemberRouteKey?: string | null;

  @Field(() => String, { nullable: true })
  senderMemberName?: string | null;

  @Field(() => TeamCommunicationRepresentedSubTeamObject, { nullable: true })
  senderRepresentedSubTeam?: TeamCommunicationRepresentedSubTeamObject | null;

  @Field(() => String)
  receiverRunId!: string;

  @Field(() => String, { nullable: true })
  receiverMemberKind?: string | null;

  @Field(() => [String], { nullable: true })
  receiverMemberPath?: string[] | null;

  @Field(() => String, { nullable: true })
  receiverMemberRouteKey?: string | null;

  @Field(() => String, { nullable: true })
  receiverMemberName?: string | null;

  @Field(() => TeamCommunicationRepresentedSubTeamObject, { nullable: true })
  receiverRepresentedSubTeam?: TeamCommunicationRepresentedSubTeamObject | null;

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
