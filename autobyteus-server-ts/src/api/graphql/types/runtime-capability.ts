import { Field, ObjectType, Query, Resolver } from "type-graphql";
import {
  getRuntimeCapabilityService,
  type RuntimeCapability,
} from "../../../runtime-management/runtime-capability-service.js";

@ObjectType()
export class RuntimeCapabilityObject {
  @Field(() => String)
  runtimeKind!: string;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  reason!: string | null;
}

const toGraphqlRuntimeCapability = (
  capability: RuntimeCapability,
): RuntimeCapabilityObject => ({
  runtimeKind: capability.runtimeKind,
  enabled: capability.enabled,
  reason: capability.reason,
});

@Resolver()
export class RuntimeCapabilityResolver {
  private readonly runtimeCapabilityService = getRuntimeCapabilityService();

  @Query(() => [RuntimeCapabilityObject])
  runtimeCapabilities(): RuntimeCapabilityObject[] {
    return this.runtimeCapabilityService
      .listRuntimeCapabilities()
      .map(toGraphqlRuntimeCapability);
  }
}
