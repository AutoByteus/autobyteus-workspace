import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import {
  AgentPackageRootInfo,
  AgentPackageRootService,
} from "../../../agent-package-roots/services/agent-package-root-service.js";

@ObjectType()
export class AgentPackageRoot {
  @Field(() => String)
  path!: string;

  @Field(() => Int)
  sharedAgentCount!: number;

  @Field(() => Int)
  teamLocalAgentCount!: number;

  @Field(() => Int)
  agentTeamCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;
}

const mapPackageRoot = (root: AgentPackageRootInfo): AgentPackageRoot => ({
  path: root.path,
  sharedAgentCount: root.sharedAgentCount,
  teamLocalAgentCount: root.teamLocalAgentCount,
  agentTeamCount: root.agentTeamCount,
  isDefault: root.isDefault,
});

@Resolver()
export class AgentPackageRootResolver {
  @Query(() => [AgentPackageRoot])
  agentPackageRoots(): AgentPackageRoot[] {
    const service = AgentPackageRootService.getInstance();
    return service.listAgentPackageRoots().map(mapPackageRoot);
  }

  @Mutation(() => [AgentPackageRoot])
  async addAgentPackageRoot(@Arg("path", () => String) pathValue: string): Promise<AgentPackageRoot[]> {
    const service = AgentPackageRootService.getInstance();
    const roots = await service.addAgentPackageRoot(pathValue);
    return roots.map(mapPackageRoot);
  }

  @Mutation(() => [AgentPackageRoot])
  async removeAgentPackageRoot(
    @Arg("path", () => String) pathValue: string,
  ): Promise<AgentPackageRoot[]> {
    const service = AgentPackageRootService.getInstance();
    const roots = await service.removeAgentPackageRoot(pathValue);
    return roots.map(mapPackageRoot);
  }
}
