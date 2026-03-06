import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import {
  DefinitionSourceInfo,
  DefinitionSourceService,
} from "../../../definition-sources/services/definition-source-service.js";

@ObjectType()
export class DefinitionSource {
  @Field(() => String)
  path!: string;

  @Field(() => Int)
  agentCount!: number;

  @Field(() => Int)
  agentTeamCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;
}

const mapSource = (source: DefinitionSourceInfo): DefinitionSource => ({
  path: source.path,
  agentCount: source.agentCount,
  agentTeamCount: source.agentTeamCount,
  isDefault: source.isDefault,
});

@Resolver()
export class DefinitionSourceResolver {
  @Query(() => [DefinitionSource])
  definitionSources(): DefinitionSource[] {
    const service = DefinitionSourceService.getInstance();
    return service.listDefinitionSources().map(mapSource);
  }

  @Mutation(() => [DefinitionSource])
  async addDefinitionSource(@Arg("path", () => String) pathValue: string): Promise<DefinitionSource[]> {
    const service = DefinitionSourceService.getInstance();
    const sources = await service.addDefinitionSource(pathValue);
    return sources.map(mapSource);
  }

  @Mutation(() => [DefinitionSource])
  async removeDefinitionSource(
    @Arg("path", () => String) pathValue: string,
  ): Promise<DefinitionSource[]> {
    const service = DefinitionSourceService.getInstance();
    const sources = await service.removeDefinitionSource(pathValue);
    return sources.map(mapSource);
  }
}
