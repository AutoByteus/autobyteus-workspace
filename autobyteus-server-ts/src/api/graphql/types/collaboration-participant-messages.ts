import { GraphQLJSON } from "graphql-scalars";
import { Arg, Query, Resolver } from "type-graphql";
import {
  collaborationParticipantMessagesCursorSchema,
  collaborationRootKindSchema,
  type CollaborationParticipantMessagesDto,
} from "@autobyteus/collaboration-stream-contracts";
import { getParticipantMessagesReader } from "../../../run-history/services/participant-messages-reader.js";

/**
 * One page of one participant's messages of one root (autobyteus-358, autobyteus-565): the arguments parsed here, the read
 * is `ParticipantMessagesReader`'s. `before` is the last message of the previous page (`{createdAt, messageId}`).
 */
export const readCollaborationParticipantMessages = async (input: Readonly<{
  rootKind: string;
  rootRunId: string;
  agentRunId: string;
  before?: unknown;
}>): Promise<CollaborationParticipantMessagesDto> => {
  const rootKind = collaborationRootKindSchema.parse(input.rootKind);
  const rootRunId = input.rootRunId.trim();
  const agentRunId = input.agentRunId.trim();
  if (!rootRunId || !agentRunId) throw new Error("rootRunId and agentRunId are required.");
  const before = input.before === undefined || input.before === null ? null : collaborationParticipantMessagesCursorSchema.parse(input.before);
  return getParticipantMessagesReader().read({ rootKind, rootRunId, agentRunId, before });
};

@Resolver()
export class CollaborationParticipantMessagesResolver {
  @Query(() => GraphQLJSON)
  collaborationParticipantMessages(
    @Arg("rootKind", () => String) rootKind: string,
    @Arg("rootRunId", () => String) rootRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("before", () => GraphQLJSON, { nullable: true }) before?: unknown,
  ): Promise<CollaborationParticipantMessagesDto> {
    return readCollaborationParticipantMessages({ rootKind, rootRunId, agentRunId, before });
  }
}
