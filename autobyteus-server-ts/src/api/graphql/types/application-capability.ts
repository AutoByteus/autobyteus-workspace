import { Arg, Field, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { ApplicationCapabilityService } from "../../../application-capability/services/application-capability-service.js";

export enum ApplicationsCapabilityScope {
  BOUND_NODE = "BOUND_NODE",
}

registerEnumType(ApplicationsCapabilityScope, {
  name: "ApplicationsCapabilityScope",
});

export enum ApplicationsCapabilitySource {
  SERVER_SETTING = "SERVER_SETTING",
  INITIALIZED_FROM_DISCOVERED_APPLICATIONS = "INITIALIZED_FROM_DISCOVERED_APPLICATIONS",
  INITIALIZED_EMPTY_CATALOG = "INITIALIZED_EMPTY_CATALOG",
}

registerEnumType(ApplicationsCapabilitySource, {
  name: "ApplicationsCapabilitySource",
});

@ObjectType()
export class ApplicationsCapability {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => ApplicationsCapabilityScope)
  scope!: ApplicationsCapabilityScope;

  @Field(() => String)
  settingKey!: string;

  @Field(() => ApplicationsCapabilitySource)
  source!: ApplicationsCapabilitySource;
}

@Resolver()
export class ApplicationCapabilityResolver {
  private readonly service = ApplicationCapabilityService.getInstance();

  @Query(() => ApplicationsCapability)
  async applicationsCapability(): Promise<ApplicationsCapability> {
    const capability = await this.service.getCapability();
    return {
      enabled: capability.enabled,
      scope: ApplicationsCapabilityScope.BOUND_NODE,
      settingKey: capability.settingKey,
      source: capability.source as ApplicationsCapabilitySource,
    };
  }

  @Mutation(() => ApplicationsCapability)
  async setApplicationsEnabled(
    @Arg("enabled", () => Boolean) enabled: boolean,
  ): Promise<ApplicationsCapability> {
    const capability = await this.service.setEnabled(enabled);
    return {
      enabled: capability.enabled,
      scope: ApplicationsCapabilityScope.BOUND_NODE,
      settingKey: capability.settingKey,
      source: capability.source as ApplicationsCapabilitySource,
    };
  }
}
