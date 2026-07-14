import { Field, ObjectType, Query, Resolver } from "type-graphql";
import { defaultWorkingContextCompactionStrategyRegistry } from "autobyteus-ts/memory/compaction/default-working-context-compaction-strategy-registry.js";
import { getServerSettingsService } from "../../../services/server-settings-service.js";

@ObjectType()
export class WorkingContextCompactionStrategyOption {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;
}

@Resolver()
export class WorkingContextCompactionStrategyResolver {
  @Query(() => [WorkingContextCompactionStrategyOption])
  getWorkingContextCompactionStrategies(): WorkingContextCompactionStrategyOption[] {
    return defaultWorkingContextCompactionStrategyRegistry
      .list()
      .map(({ id, name }) => ({ id, name }));
  }

  @Query(() => String)
  getEffectiveWorkingContextCompactionStrategyId(): string {
    return getServerSettingsService().getEffectiveWorkingContextCompactionStrategyId();
  }
}
