import { GraphQLError } from "graphql";
import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { UpdateNotificationService } from "../../../update-notifications/services/update-notification-service.js";
import { UpdateChecksCapabilityService } from "../../../update-notifications/services/update-checks-capability-service.js";
import {
  UpdateAutomationSettingsService,
  UpdateCheckIntervalOutOfRangeError,
  type UpdateAutomationSettings as UpdateAutomationSettingsView,
} from "../../../update-notifications/services/update-automation-settings-service.js";
import type { UpdateNotificationView } from "../../../update-notifications/domain/update-notification.js";

export enum UpdateNotificationKind {
  AGENT_PACKAGE = "AGENT_PACKAGE",
  SKILL_SOURCE = "SKILL_SOURCE",
  AGENT_RUNTIME = "AGENT_RUNTIME",
}
registerEnumType(UpdateNotificationKind, { name: "UpdateNotificationKind" });

export enum UpdateOutcome {
  AUTO_UPDATED = "AUTO_UPDATED",
  AUTO_FAILED = "AUTO_FAILED",
  AUTO_WAITING = "AUTO_WAITING",
}
registerEnumType(UpdateOutcome, { name: "UpdateOutcome" });

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
  /** Null for agent runtimes. */
  @Field(() => String, { nullable: true }) repositoryUrl!: string | null;
  @Field(() => String, { nullable: true }) defaultBranch!: string | null;
  @Field(() => String) installedRevision!: string;
  @Field(() => String) latestRevision!: string;
  @Field(() => String) foundAt!: string;
  @Field(() => Boolean) read!: boolean;
  @Field(() => UpdateNotificationState) state!: UpdateNotificationState;
  @Field(() => String, { nullable: true }) handledRevision!: string | null;
  @Field(() => String, { nullable: true }) handledAt!: string | null;
  @Field(() => UpdateOutcome, { nullable: true }) outcome!: UpdateOutcome | null;
  @Field(() => String, { nullable: true }) outcomeReason!: string | null;
  @Field(() => String, { nullable: true }) outcomeAt!: string | null;
}

@ObjectType()
export class UpdateCheckIntervals {
  @Field(() => Int) agentPackages!: number;
  @Field(() => Int) skillSources!: number;
  @Field(() => Int) agentRuntimes!: number;
}

@ObjectType()
export class AutomaticUpdates {
  @Field(() => Boolean) agentPackages!: boolean;
  @Field(() => Boolean) skillSources!: boolean;
  @Field(() => Boolean) agentRuntimes!: boolean;
}

@ObjectType()
export class UpdateAutomationSettings {
  /** Minutes. */
  @Field(() => UpdateCheckIntervals) intervals!: UpdateCheckIntervals;
  @Field(() => AutomaticUpdates) automaticUpdates!: AutomaticUpdates;
  /** ISO time until when GitHub asked this node to wait; null when it did not. */
  @Field(() => String, { nullable: true }) githubWaitUntil!: string | null;
  /** This node is the desktop's embedded node (the only one with agent runtime updates). */
  @Field(() => Boolean) desktopEmbeddedNode!: boolean;
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
  outcome: view.outcome as UpdateOutcome | null,
}));

const toSettings = (settings: UpdateAutomationSettingsView): UpdateAutomationSettings => ({
  intervals: {
    agentPackages: settings.intervals.AGENT_PACKAGE,
    skillSources: settings.intervals.SKILL_SOURCE,
    agentRuntimes: settings.intervals.AGENT_RUNTIME,
  },
  automaticUpdates: {
    agentPackages: settings.automaticUpdates.AGENT_PACKAGE,
    skillSources: settings.automaticUpdates.SKILL_SOURCE,
    agentRuntimes: settings.automaticUpdates.AGENT_RUNTIME,
  },
  githubWaitUntil: settings.githubWaitUntil?.toISOString() ?? null,
  desktopEmbeddedNode: settings.desktopEmbeddedNode,
});

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

  @Query(() => UpdateAutomationSettings)
  updateAutomationSettings(): UpdateAutomationSettings {
    return toSettings(UpdateAutomationSettingsService.getInstance().read());
  }

  @Mutation(() => UpdateAutomationSettings)
  setUpdateCheckInterval(
    @Arg("kind", () => UpdateNotificationKind) kind: UpdateNotificationKind,
    @Arg("minutes", () => Int) minutes: number,
  ): UpdateAutomationSettings {
    try {
      return toSettings(UpdateAutomationSettingsService.getInstance().setInterval(kind, minutes));
    } catch (error) {
      if (error instanceof UpdateCheckIntervalOutOfRangeError) {
        throw new GraphQLError(error.message, { extensions: { code: error.code } });
      }
      throw error;
    }
  }

  @Mutation(() => UpdateAutomationSettings)
  setAutomaticUpdates(
    @Arg("kind", () => UpdateNotificationKind) kind: UpdateNotificationKind,
    @Arg("enabled", () => Boolean) enabled: boolean,
  ): UpdateAutomationSettings {
    return toSettings(UpdateAutomationSettingsService.getInstance().setAutomatic(kind, enabled));
  }
}
