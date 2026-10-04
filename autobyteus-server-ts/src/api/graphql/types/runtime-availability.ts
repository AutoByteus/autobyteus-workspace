import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import {
  getRuntimeAvailabilityService,
  type RuntimeAvailability,
} from "../../../runtime-management/runtime-availability-service.js";

import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

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

  @Query(() => [String])
  runtimeAvailabilityKinds(): string[] {
    return this.runtimeAvailabilityService.listRuntimeKinds();
  }

  @Query(() => RuntimeAvailabilityObject)
  async runtimeAvailability(@Arg("runtimeKind", () => String) runtimeKind: string): Promise<RuntimeAvailabilityObject> {
    const kind = runtimeKind.trim();
    if (!kind) throw new Error("runtimeKind is required.");
    return toGraphqlRuntimeAvailability(await this.runtimeAvailabilityService.getRuntimeAvailability(kind as RuntimeKind));
  }
}
