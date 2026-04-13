import {
  Arg,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import {
  AgentPackageService,
} from "../../../agent-packages/services/agent-package-service.js";
import type {
  AgentPackage as AgentPackageModel,
  AgentPackageImportInput as AgentPackageImportInputModel,
} from "../../../agent-packages/types.js";

enum AgentPackageSourceKindEnum {
  BUILT_IN = "BUILT_IN",
  LOCAL_PATH = "LOCAL_PATH",
  GITHUB_REPOSITORY = "GITHUB_REPOSITORY",
}

enum AgentPackageImportSourceKindEnum {
  LOCAL_PATH = "LOCAL_PATH",
  GITHUB_REPOSITORY = "GITHUB_REPOSITORY",
}

registerEnumType(AgentPackageSourceKindEnum, {
  name: "AgentPackageSourceKind",
});
registerEnumType(AgentPackageImportSourceKindEnum, {
  name: "AgentPackageImportSourceKind",
});

@ObjectType()
export class AgentPackage {
  @Field(() => String)
  packageId!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  path!: string;

  @Field(() => AgentPackageSourceKindEnum)
  sourceKind!: AgentPackageSourceKindEnum;

  @Field(() => String)
  source!: string;

  @Field(() => Int)
  sharedAgentCount!: number;

  @Field(() => Int)
  teamLocalAgentCount!: number;

  @Field(() => Int)
  agentTeamCount!: number;

  @Field(() => Int)
  applicationCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Boolean)
  isRemovable!: boolean;
}

@InputType()
export class ImportAgentPackageInput {
  @Field(() => AgentPackageImportSourceKindEnum)
  sourceKind!: AgentPackageImportSourceKindEnum;

  @Field(() => String)
  source!: string;
}

const mapAgentPackage = (pkg: AgentPackageModel): AgentPackage => ({
  packageId: pkg.packageId,
  displayName: pkg.displayName,
  path: pkg.path,
  sourceKind: pkg.sourceKind as AgentPackageSourceKindEnum,
  source: pkg.source,
  sharedAgentCount: pkg.sharedAgentCount,
  teamLocalAgentCount: pkg.teamLocalAgentCount,
  agentTeamCount: pkg.agentTeamCount,
  applicationCount: pkg.applicationCount,
  isDefault: pkg.isDefault,
  isRemovable: pkg.isRemovable,
});

const mapImportInput = (
  input: ImportAgentPackageInput,
): AgentPackageImportInputModel => ({
  sourceKind: input.sourceKind,
  source: input.source,
});

@Resolver()
export class AgentPackageResolver {
  @Query(() => [AgentPackage])
  async agentPackages(): Promise<AgentPackage[]> {
    const service = AgentPackageService.getInstance();
    const packages = await service.listAgentPackages();
    return packages.map(mapAgentPackage);
  }

  @Mutation(() => [AgentPackage])
  async importAgentPackage(
    @Arg("input", () => ImportAgentPackageInput)
    input: ImportAgentPackageInput,
  ): Promise<AgentPackage[]> {
    const service = AgentPackageService.getInstance();
    const packages = await service.importAgentPackage(mapImportInput(input));
    return packages.map(mapAgentPackage);
  }

  @Mutation(() => [AgentPackage])
  async removeAgentPackage(
    @Arg("packageId", () => String) packageId: string,
  ): Promise<AgentPackage[]> {
    const service = AgentPackageService.getInstance();
    const packages = await service.removeAgentPackage(packageId);
    return packages.map(mapAgentPackage);
  }
}
