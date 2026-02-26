import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";
import { getApplicationService } from "../../../services/application-service.js";

@ObjectType()
export class ApplicationManifest {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => String, { nullable: true })
  teamDefinitionName?: string;
}

@Resolver()
export class ApplicationResolver {
  private get applicationService() {
    return getApplicationService();
  }

  @Query(() => [ApplicationManifest])
  listApplications(): ApplicationManifest[] {
    try {
      const manifests = this.applicationService.listApplications();
      return manifests.map((manifest) => ({
        id: String(manifest.id ?? ""),
        name: String(manifest.name ?? ""),
        description: manifest.description ? String(manifest.description) : undefined,
        icon: manifest.icon ? String(manifest.icon) : undefined,
        type: manifest.type ? String(manifest.type) : undefined,
        teamDefinitionName: manifest.teamDefinitionName
          ? String(manifest.teamDefinitionName)
          : undefined,
      }));
    } catch (error) {
      throw new Error("Unable to fetch applications at this time.");
    }
  }

  @Mutation(() => GraphQLJSONObject)
  async runApplication(
    @Arg("appId", () => String) appId: string,
    @Arg("input", () => GraphQLJSONObject) input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      return (await this.applicationService.runApplication(appId, input)) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(
        `An unexpected error occurred while running the application '${appId}'.`,
      );
    }
  }
}
