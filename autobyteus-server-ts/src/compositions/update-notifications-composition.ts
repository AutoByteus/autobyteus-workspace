import { AgentPackageService } from "../agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../skills/services/skill-source-service.js";
import { getGitHubRateLimitGate } from "../integrations/github/github-rate-limit-gate.js";
import { UpdateNotificationService } from "../update-notifications/services/update-notification-service.js";
import { UpdateChecksCapabilityService } from "../update-notifications/services/update-checks-capability-service.js";
import { UpdateCheckScheduler } from "../update-notifications/services/update-check-scheduler.js";
import { getUpdateNotificationChangeHub } from "../update-notifications/changes/update-notification-change-messages.js";

/** The studio server's update notifications: source listeners, background checks and the change feed. */
export type UpdateNotifications = Readonly<{ close(): void }>;

/**
 * Tells the notification service whenever a source owner's GitHub update state settled, and
 * starts the background checker; it never delays startup. `close()` removes the listeners,
 * stops the checker and closes the feed's connections.
 */
export const composeUpdateNotifications = (input: {
  packages?: AgentPackageService;
  skillSources?: SkillSourceService;
  notifications?: UpdateNotificationService;
  capability?: UpdateChecksCapabilityService;
} = {}): UpdateNotifications => {
  const packages = input.packages ?? AgentPackageService.getInstance();
  const skillSources = input.skillSources ?? SkillSourceService.getInstance();
  const notifications = input.notifications ?? UpdateNotificationService.getInstance();
  const capability = input.capability ?? UpdateChecksCapabilityService.getInstance();

  // A notification problem never fails a package or skill action.
  const reconcile = (): void => {
    void notifications.reconcile().catch((error) => console.warn("UPDATE_NOTIFICATIONS_RECONCILE_FAILED", error));
  };
  packages.setGitHubSourceStateListener(reconcile);
  skillSources.setGitHubSourceStateListener(reconcile);

  const scheduler = new UpdateCheckScheduler({
    isEnabled: () => capability.isEnabled(),
    isRateLimited: () => getGitHubRateLimitGate().isBlocked(),
    owners: [
      {
        name: "agent-package",
        listGitHubSourceUpdateStates: () => packages.listGitHubSourceUpdateStates(),
        check: (packageId) => packages.checkAgentPackageUpdates([packageId]),
      },
      {
        name: "skill-source",
        listGitHubSourceUpdateStates: () => skillSources.listGitHubSourceUpdateStates(),
        check: (sourceId) => skillSources.checkGitHubSkillSourceUpdates([sourceId]),
      },
    ],
    afterPass: () => notifications.reconcile(),
  });
  scheduler.start();

  let closed = false;
  return Object.freeze({
    close: () => {
      if (closed) return;
      closed = true;
      packages.setGitHubSourceStateListener(null);
      skillSources.setGitHubSourceStateListener(null);
      scheduler.close();
      getUpdateNotificationChangeHub().closeAll();
    },
  });
};
