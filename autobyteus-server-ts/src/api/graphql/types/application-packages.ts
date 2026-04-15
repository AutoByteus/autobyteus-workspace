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
  ApplicationPackageService,
} from "../../../application-packages/services/application-package-service.js";
import type {
  ApplicationPackage as ApplicationPackageModel,
  ApplicationPackageImportInput as ApplicationPackageImportInputModel,
} from "../../../application-packages/types.js";

enum ApplicationPackageSourceKindEnum {
  BUILT_IN = "BUILT_IN",
  LOCAL_PATH = "LOCAL_PATH",
  GITHUB_REPOSITORY = "GITHUB_REPOSITORY",
}

enum ApplicationPackageImportSourceKindEnum {
  LOCAL_PATH = "LOCAL_PATH",
  GITHUB_REPOSITORY = "GITHUB_REPOSITORY",
}

registerEnumType(ApplicationPackageSourceKindEnum, {
  name: "ApplicationPackageSourceKind",
});
registerEnumType(ApplicationPackageImportSourceKindEnum, {
  name: "ApplicationPackageImportSourceKind",
});

@ObjectType()
export class ApplicationPackage {
  @Field(() => String)
  packageId!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  path!: string;

  @Field(() => ApplicationPackageSourceKindEnum)
  sourceKind!: ApplicationPackageSourceKindEnum;

  @Field(() => String)
  source!: string;

  @Field(() => Int)
  applicationCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Boolean)
  isRemovable!: boolean;
}

@InputType()
export class ImportApplicationPackageInput {
  @Field(() => ApplicationPackageImportSourceKindEnum)
  sourceKind!: ApplicationPackageImportSourceKindEnum;

  @Field(() => String)
  source!: string;
}

const mapApplicationPackage = (pkg: ApplicationPackageModel): ApplicationPackage => ({
  packageId: pkg.packageId,
  displayName: pkg.displayName,
  path: pkg.path,
  sourceKind: pkg.sourceKind as ApplicationPackageSourceKindEnum,
  source: pkg.source,
  applicationCount: pkg.applicationCount,
  isDefault: pkg.isDefault,
  isRemovable: pkg.isRemovable,
});

const mapImportInput = (
  input: ImportApplicationPackageInput,
): ApplicationPackageImportInputModel => ({
  sourceKind: input.sourceKind,
  source: input.source,
});

@Resolver()
export class ApplicationPackageResolver {
  @Query(() => [ApplicationPackage])
  async applicationPackages(): Promise<ApplicationPackage[]> {
    const service = ApplicationPackageService.getInstance();
    const packages = await service.listApplicationPackages();
    return packages.map(mapApplicationPackage);
  }

  @Mutation(() => [ApplicationPackage])
  async importApplicationPackage(
    @Arg("input", () => ImportApplicationPackageInput)
    input: ImportApplicationPackageInput,
  ): Promise<ApplicationPackage[]> {
    const service = ApplicationPackageService.getInstance();
    const packages = await service.importApplicationPackage(mapImportInput(input));
    return packages.map(mapApplicationPackage);
  }

  @Mutation(() => [ApplicationPackage])
  async removeApplicationPackage(
    @Arg("packageId", () => String) packageId: string,
  ): Promise<ApplicationPackage[]> {
    const service = ApplicationPackageService.getInstance();
    const packages = await service.removeApplicationPackage(packageId);
    return packages.map(mapApplicationPackage);
  }
}
