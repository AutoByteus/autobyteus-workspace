import { Field, ObjectType, Query, Resolver } from "type-graphql";
import {
  getRuntimeAvailabilityService,
  type RuntimeAvailability,
} from "../../../runtime-management/runtime-availability-service.js";

@ObjectType()
export class RuntimeAvailabilityObject {
  @Field(() => String)
  runtimeKind!: string;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  reason!: string | null;
}

const toGraphqlRuntimeAvailability = (
  availability: RuntimeAvailability,
): RuntimeAvailabilityObject => ({
  runtimeKind: availability.runtimeKind,
  enabled: availability.enabled,
  reason: availability.reason,
});

@Resolver()
export class RuntimeAvailabilityResolver {
  private readonly runtimeAvailabilityService = getRuntimeAvailabilityService();

  @Query(() => [RuntimeAvailabilityObject])
  runtimeAvailabilities(): RuntimeAvailabilityObject[] {
    return this.runtimeAvailabilityService
      .listRuntimeAvailabilities()
      .map(toGraphqlRuntimeAvailability);
  }
}
