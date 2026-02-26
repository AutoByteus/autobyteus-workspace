import { Field, ObjectType, Query, Resolver } from "type-graphql";

@ObjectType()
export class HealthStatus {
  @Field(() => String)
  status!: string;

  @Field(() => String)
  message!: string;
}

@Resolver()
export class HealthResolver {
  @Query(() => HealthStatus)
  health(): HealthStatus {
    return { status: "ok", message: "Server is running" };
  }
}
