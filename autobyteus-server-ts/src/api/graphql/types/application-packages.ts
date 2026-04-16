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
  ApplicationPackageDebugDetails as ApplicationPackageDebugDetailsModel,
  ApplicationPackageImportInput as ApplicationPackageImportInputModel,
  ApplicationPackageListItem as ApplicationPackageListItemModel,
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

  @Field(() => ApplicationPackageSourceKindEnum)
  sourceKind!: ApplicationPackageSourceKindEnum;

  @Field(() => String, { nullable: true })
  sourceSummary!: string | null;

  @Field(() => Int)
  applicationCount!: number;

  @Field(() => Boolean)
  isPlatformOwned!: boolean;

  @Field(() => Boolean)
  isRemovable!: boolean;
}

@ObjectType()
export class ApplicationPackageDetails {
  @Field(() => String)
  packageId!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => ApplicationPackageSourceKindEnum)
  sourceKind!: ApplicationPackageSourceKindEnum;

  @Field(() => String, { nullable: true })
  sourceSummary!: string | null;

  @Field(() => String)
  rootPath!: string;

  @Field(() => String)
  source!: string;

  @Field(() => String, { nullable: true })
  managedInstallPath!: string | null;

  @Field(() => String, { nullable: true })
  bundledSourceRootPath!: string | null;

  @Field(() => Int)
  applicationCount!: number;

  @Field(() => Boolean)
  isPlatformOwned!: boolean;

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

const mapApplicationPackage = (pkg: ApplicationPackageListItemModel): ApplicationPackage => ({
  packageId: pkg.packageId,
  displayName: pkg.displayName,
  sourceKind: pkg.sourceKind as ApplicationPackageSourceKindEnum,
  sourceSummary: pkg.sourceSummary ?? null,
  applicationCount: pkg.applicationCount,
  isPlatformOwned: pkg.isPlatformOwned,
  isRemovable: pkg.isRemovable,
});

const mapApplicationPackageDetails = (
  pkg: ApplicationPackageDebugDetailsModel,
): ApplicationPackageDetails => ({
  packageId: pkg.packageId,
  displayName: pkg.displayName,
  sourceKind: pkg.sourceKind as ApplicationPackageSourceKindEnum,
  sourceSummary: pkg.sourceSummary ?? null,
  rootPath: pkg.rootPath,
  source: pkg.source,
  managedInstallPath: pkg.managedInstallPath,
  bundledSourceRootPath: pkg.bundledSourceRootPath,
  applicationCount: pkg.applicationCount,
  isPlatformOwned: pkg.isPlatformOwned,
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

  @Query(() => ApplicationPackageDetails, { nullable: true })
  async applicationPackageDetails(
    @Arg("packageId", () => String) packageId: string,
  ): Promise<ApplicationPackageDetails | null> {
    const service = ApplicationPackageService.getInstance();
    const packageDetails = await service.getApplicationPackageDetails(packageId);
    return packageDetails ? mapApplicationPackageDetails(packageDetails) : null;
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
