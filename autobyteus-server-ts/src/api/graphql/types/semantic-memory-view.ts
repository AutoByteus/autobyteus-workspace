import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { getAgentSemanticMemory } from "../../../agent-memory/services/agent-semantic-memory.js";

/** A semantic memory folder as the Memory page shows it (autobyteus-554); reading it never creates it. */
@ObjectType()
export class SemanticMemoryFolderState {
  @Field(() => String)
  folderPath!: string;

  @Field(() => Boolean)
  exists!: boolean;

  @Field(() => Boolean)
  isEmpty!: boolean;
}

/**
 * The folder states the Memory page needs before it opens a folder view: an agent's semantic memory folder and the
 * node's global one. The files themselves are read through the read-only semantic memory workspace.
 */
@Resolver()
export class SemanticMemoryViewResolver {
  @Query(() => SemanticMemoryFolderState)
  async agentSemanticMemoryFolder(
    @Arg("agentDefinitionId", () => String) agentDefinitionId: string,
  ): Promise<SemanticMemoryFolderState> {
    return getAgentSemanticMemory().folderState(agentDefinitionId);
  }

  @Query(() => SemanticMemoryFolderState)
  async globalSemanticMemoryFolder(): Promise<SemanticMemoryFolderState> {
    return getAgentSemanticMemory().globalFolderState();
  }
}
