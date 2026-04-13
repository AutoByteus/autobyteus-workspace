import { Arg, Field, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { ApplicationBundleService } from "../../../application-bundles/services/application-bundle-service.js";

export enum ApplicationRuntimeTargetKind {
  AGENT = "AGENT",
  AGENT_TEAM = "AGENT_TEAM",
}

registerEnumType(ApplicationRuntimeTargetKind, {
  name: "ApplicationRuntimeTargetKind",
});

@ObjectType()
export class ApplicationRuntimeTarget {
  @Field(() => ApplicationRuntimeTargetKind)
  kind!: ApplicationRuntimeTargetKind;

  @Field(() => String)
  localId!: string;

  @Field(() => String)
  definitionId!: string;
}

@ObjectType()
export class Application {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  localApplicationId!: string;

  @Field(() => String)
  packageId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  iconAssetPath?: string | null;

  @Field(() => String)
  entryHtmlAssetPath!: string;

  @Field(() => Boolean)
  writable!: boolean;

  @Field(() => ApplicationRuntimeTarget)
  runtimeTarget!: ApplicationRuntimeTarget;
}

@Resolver()
export class ApplicationResolver {
  private readonly service = ApplicationBundleService.getInstance();

  @Query(() => [Application])
  async listApplications(): Promise<Application[]> {
    return (await this.service.listApplications()).map((application) => ({
      id: application.id,
      localApplicationId: application.localApplicationId,
      packageId: application.packageId,
      name: application.name,
      description: application.description,
      iconAssetPath: application.iconAssetPath,
      entryHtmlAssetPath: application.entryHtmlAssetPath,
      writable: application.writable,
      runtimeTarget: {
        kind:
          application.runtimeTarget.kind === "AGENT"
            ? ApplicationRuntimeTargetKind.AGENT
            : ApplicationRuntimeTargetKind.AGENT_TEAM,
        localId: application.runtimeTarget.localId,
        definitionId: application.runtimeTarget.definitionId,
      },
    }));
  }

  @Query(() => Application, { nullable: true })
  async application(@Arg("id", () => String) id: string): Promise<Application | null> {
    const application = await this.service.getApplicationById(id);
    if (!application) {
      return null;
    }

    return {
      id: application.id,
      localApplicationId: application.localApplicationId,
      packageId: application.packageId,
      name: application.name,
      description: application.description,
      iconAssetPath: application.iconAssetPath,
      entryHtmlAssetPath: application.entryHtmlAssetPath,
      writable: application.writable,
      runtimeTarget: {
        kind:
          application.runtimeTarget.kind === "AGENT"
            ? ApplicationRuntimeTargetKind.AGENT
            : ApplicationRuntimeTargetKind.AGENT_TEAM,
        localId: application.runtimeTarget.localId,
        definitionId: application.runtimeTarget.definitionId,
      },
    };
  }
}
