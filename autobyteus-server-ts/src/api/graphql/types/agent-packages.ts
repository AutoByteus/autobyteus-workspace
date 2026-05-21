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
  AgentPackageUpdateInfo as AgentPackageUpdateInfoModel,
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

enum AgentPackageUpdateStatusEnum {
  NOT_APPLICABLE = "NOT_APPLICABLE",
  RELOAD_AVAILABLE = "RELOAD_AVAILABLE",
  NOT_CHECKED = "NOT_CHECKED",
  UNKNOWN = "UNKNOWN",
  UP_TO_DATE = "UP_TO_DATE",
  UPDATE_AVAILABLE = "UPDATE_AVAILABLE",
  CHECK_FAILED = "CHECK_FAILED",
  UPDATE_FAILED = "UPDATE_FAILED",
}

registerEnumType(AgentPackageSourceKindEnum, {
  name: "AgentPackageSourceKind",
});
registerEnumType(AgentPackageImportSourceKindEnum, {
  name: "AgentPackageImportSourceKind",
});
registerEnumType(AgentPackageUpdateStatusEnum, {
  name: "AgentPackageUpdateStatus",
});

@ObjectType()
export class AgentPackageUpdateInfo {
  @Field(() => AgentPackageUpdateStatusEnum)
  status!: AgentPackageUpdateStatusEnum;

  @Field(() => Boolean)
  canCheck!: boolean;

  @Field(() => Boolean)
  canUpdate!: boolean;

  @Field(() => Boolean)
  canReload!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String, { nullable: true })
  installedRevision!: string | null;

  @Field(() => String, { nullable: true })
  latestRevision!: string | null;

  @Field(() => String, { nullable: true })
  checkedAt!: string | null;

  @Field(() => String, { nullable: true })
  lastError!: string | null;
}

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

  @Field(() => AgentPackageUpdateInfo)
  updateInfo!: AgentPackageUpdateInfo;
}

@InputType()
export class ImportAgentPackageInput {
  @Field(() => AgentPackageImportSourceKindEnum)
  sourceKind!: AgentPackageImportSourceKindEnum;

  @Field(() => String)
  source!: string;
}

const mapAgentPackageUpdateInfo = (
  info: AgentPackageUpdateInfoModel,
): AgentPackageUpdateInfo => ({
  status: info.status as AgentPackageUpdateStatusEnum,
  canCheck: info.canCheck,
  canUpdate: info.canUpdate,
  canReload: info.canReload,
  message: info.message,
  installedRevision: info.installedRevision,
  latestRevision: info.latestRevision,
  checkedAt: info.checkedAt,
  lastError: info.lastError,
});

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
  updateInfo: mapAgentPackageUpdateInfo(pkg.updateInfo),
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

  @Mutation(() => [AgentPackage])
  async reloadAgentPackage(
    @Arg("packageId", () => String) packageId: string,
  ): Promise<AgentPackage[]> {
    const service = AgentPackageService.getInstance();
    const packages = await service.reloadAgentPackage(packageId);
    return packages.map(mapAgentPackage);
  }

  @Mutation(() => [AgentPackage])
  async checkAgentPackageUpdates(
    @Arg("packageIds", () => [String], { nullable: true })
    packageIds?: string[],
  ): Promise<AgentPackage[]> {
    const service = AgentPackageService.getInstance();
    const packages = await service.checkAgentPackageUpdates(packageIds);
    return packages.map(mapAgentPackage);
  }

  @Mutation(() => [AgentPackage])
  async updateAgentPackage(
    @Arg("packageId", () => String) packageId: string,
  ): Promise<AgentPackage[]> {
    const service = AgentPackageService.getInstance();
    const packages = await service.updateAgentPackage(packageId);
    return packages.map(mapAgentPackage);
  }
}
