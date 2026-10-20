import { Arg, Field, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { UpdateNotificationService } from "../../../update-notifications/services/update-notification-service.js";
import { UpdateChecksCapabilityService } from "../../../update-notifications/services/update-checks-capability-service.js";
import type { UpdateNotificationView } from "../../../update-notifications/domain/update-notification.js";

export enum UpdateNotificationKind {
  AGENT_PACKAGE = "AGENT_PACKAGE",
  SKILL_SOURCE = "SKILL_SOURCE",
}
registerEnumType(UpdateNotificationKind, { name: "UpdateNotificationKind" });

export enum UpdateNotificationState {
  WAITING = "WAITING",
  HANDLED = "HANDLED",
}
registerEnumType(UpdateNotificationState, { name: "UpdateNotificationState" });

export enum UpdateChecksCapabilitySource {
  SERVER_SETTING = "SERVER_SETTING",
  DEFAULT_ENABLED = "DEFAULT_ENABLED",
}
registerEnumType(UpdateChecksCapabilitySource, { name: "UpdateChecksCapabilitySource" });

@ObjectType()
export class UpdateNotification {
  @Field(() => UpdateNotificationKind) kind!: UpdateNotificationKind;
  @Field(() => String) sourceId!: string;
  @Field(() => String) name!: string;
  @Field(() => String) repositoryUrl!: string;
  @Field(() => String, { nullable: true }) defaultBranch!: string | null;
  @Field(() => String) installedRevision!: string;
  @Field(() => String) latestRevision!: string;
  @Field(() => String) foundAt!: string;
  @Field(() => Boolean) read!: boolean;
  @Field(() => UpdateNotificationState) state!: UpdateNotificationState;
  @Field(() => String, { nullable: true }) handledRevision!: string | null;
  @Field(() => String, { nullable: true }) handledAt!: string | null;
}

@ObjectType()
export class UpdateChecksCapability {
  @Field(() => Boolean) enabled!: boolean;
  @Field(() => String) settingKey!: string;
  @Field(() => UpdateChecksCapabilitySource) source!: UpdateChecksCapabilitySource;
}

const toGraphql = (views: UpdateNotificationView[]): UpdateNotification[] => views.map((view) => ({
  ...view,
  kind: view.kind as UpdateNotificationKind,
  state: view.state as UpdateNotificationState,
}));

/** Transport only: the notification service owns the records and their rules. */
@Resolver()
export class UpdateNotificationResolver {
  @Query(() => [UpdateNotification])
  async updateNotifications(): Promise<UpdateNotification[]> {
    return toGraphql(await UpdateNotificationService.getInstance().listNotifications());
  }

  @Mutation(() => [UpdateNotification])
  async markUpdateNotificationsRead(): Promise<UpdateNotification[]> {
    return toGraphql(await UpdateNotificationService.getInstance().markAllRead());
  }

  @Mutation(() => [UpdateNotification])
  async clearUpdateNotification(
    @Arg("kind", () => UpdateNotificationKind) kind: UpdateNotificationKind,
    @Arg("sourceId", () => String) sourceId: string,
  ): Promise<UpdateNotification[]> {
    return toGraphql(await UpdateNotificationService.getInstance().clear(kind, sourceId));
  }

  @Query(() => UpdateChecksCapability)
  updateChecksCapability(): UpdateChecksCapability {
    const capability = UpdateChecksCapabilityService.getInstance().getCapability();
    return { ...capability, source: capability.source as UpdateChecksCapabilitySource };
  }

  @Mutation(() => UpdateChecksCapability)
  setUpdateChecksEnabled(@Arg("enabled", () => Boolean) enabled: boolean): UpdateChecksCapability {
    const capability = UpdateChecksCapabilityService.getInstance().setEnabled(enabled);
    return { ...capability, source: capability.source as UpdateChecksCapabilitySource };
  }
}
