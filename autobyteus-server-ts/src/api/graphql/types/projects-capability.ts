import { Arg, Field, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import {
  getProjectsCapabilityService,
  type ProjectsCapability as ProjectsCapabilityModel,
} from "../../../projects/services/projects-capability-service.js";

export enum ProjectsCapabilitySource {
  SERVER_SETTING = "SERVER_SETTING",
  INITIALIZED_DISABLED = "INITIALIZED_DISABLED",
}

registerEnumType(ProjectsCapabilitySource, {
  name: "ProjectsCapabilitySource",
});

@ObjectType()
export class ProjectsCapability {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String)
  settingKey!: string;

  @Field(() => ProjectsCapabilitySource)
  source!: ProjectsCapabilitySource;
}

const toGraphqlCapability = (capability: ProjectsCapabilityModel): ProjectsCapability => ({
  enabled: capability.enabled,
  settingKey: capability.settingKey,
  source: capability.source as ProjectsCapabilitySource,
});

@Resolver()
export class ProjectsCapabilityResolver {
  @Query(() => ProjectsCapability)
  async projectsCapability(): Promise<ProjectsCapability> {
    return toGraphqlCapability(await getProjectsCapabilityService().getCapability());
  }

  @Mutation(() => ProjectsCapability)
  async setProjectsEnabled(
    @Arg("enabled", () => Boolean) enabled: boolean,
  ): Promise<ProjectsCapability> {
    return toGraphqlCapability(await getProjectsCapabilityService().setEnabled(enabled));
  }
}
