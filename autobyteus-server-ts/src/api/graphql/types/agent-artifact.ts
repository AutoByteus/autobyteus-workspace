import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { ArtifactService } from "../../../agent-artifacts/services/artifact-service.js";
import type { AgentArtifact as DomainAgentArtifact } from "../../../agent-artifacts/domain/models.js";

@ObjectType()
export class AgentArtifact {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  runId!: string;

  @Field(() => String)
  path!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String, { nullable: true })
  workspaceRoot?: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

const toGraphql = (artifact: DomainAgentArtifact): AgentArtifact => ({
  id: artifact.id ?? "",
  runId: artifact.runId,
  path: artifact.path,
  type: artifact.type,
  workspaceRoot: artifact.workspaceRoot ?? null,
  createdAt: artifact.createdAt.toISOString(),
  updatedAt: artifact.updatedAt.toISOString(),
});

@Resolver()
export class AgentArtifactResolver {
  @Query(() => [AgentArtifact])
  async agentArtifacts(
    @Arg("runId", () => String) runId: string,
  ): Promise<AgentArtifact[]> {
    const service = ArtifactService.getInstance();
    const artifacts = await service.getArtifactsByRunId(runId);
    return artifacts.map(toGraphql);
  }
}
