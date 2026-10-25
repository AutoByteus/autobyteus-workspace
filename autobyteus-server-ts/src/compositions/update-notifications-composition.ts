import { AgentPackageService } from "../agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../skills/services/skill-source-service.js";
import type { AgentRuntimeStatusService } from "../runtime-management/agent-runtimes/agent-runtime-status-service.js";
import { getGitHubRateLimitGate } from "../integrations/github/github-rate-limit-gate.js";
import { isDesktopEmbeddedNode } from "../config/desktop-embedded-node.js";
import { UpdateNotificationService } from "../update-notifications/services/update-notification-service.js";
import { UpdateChecksCapabilityService } from "../update-notifications/services/update-checks-capability-service.js";
import { UpdateAutomationSettingsService } from "../update-notifications/services/update-automation-settings-service.js";
import { UpdateCheckScheduler } from "../update-notifications/services/update-check-scheduler.js";
import { UpdatePass } from "../update-notifications/services/update-pass.js";
import { runtimeUpdateSource } from "../update-notifications/services/runtime-update-source.js";
import { getUpdateNotificationChangeHub } from "../update-notifications/changes/update-notification-change-messages.js";

/** The studio server's update notifications: source listeners, the background pass and the change feed. */
export type UpdateNotifications = Readonly<{ close(): void }>;

/**
 * Tells the notification service whenever a source owner's update state settled, and starts the
 * scheduler of the background pass; it never delays startup. Agent runtimes take part only on
 * the desktop's embedded node (AR-005), with the studio server's runtime status service itself
 * (AR-006). `close()` removes the listeners, stops the pass and closes the feed's connections.
 */
export const composeUpdateNotifications = (input: {
  runtimes: AgentRuntimeStatusService | null;
  packages?: AgentPackageService;
  skillSources?: SkillSourceService;
  notifications?: UpdateNotificationService;
  capability?: UpdateChecksCapabilityService;
  settings?: UpdateAutomationSettingsService;
}): UpdateNotifications => {
  const packages = input.packages ?? AgentPackageService.getInstance();
  const skillSources = input.skillSources ?? SkillSourceService.getInstance();
  const notifications = input.notifications ?? UpdateNotificationService.getInstance();
  const capability = input.capability ?? UpdateChecksCapabilityService.getInstance();
  const settings = input.settings ?? UpdateAutomationSettingsService.getInstance();
  const runtimes = isDesktopEmbeddedNode() ? input.runtimes : null;

  // A notification problem never fails a package, skill or runtime action.
  const reconcile = (): void => {
    void notifications.reconcile().catch((error) => console.warn("UPDATE_NOTIFICATIONS_RECONCILE_FAILED", error));
  };
  packages.setGitHubSourceStateListener(reconcile);
  skillSources.setGitHubSourceStateListener(reconcile);
  if (runtimes) {
    notifications.setRuntimeSource(runtimeUpdateSource(runtimes));
    runtimes.setUpdateStateListener(reconcile);
  }

  const pass = new UpdatePass({
    packages, skillSources, runtimes, notifications, settings, checks: capability, gate: getGitHubRateLimitGate(),
  });
  const scheduler = new UpdateCheckScheduler({ pass });
  scheduler.start();

  let closed = false;
  return Object.freeze({
    close: () => {
      if (closed) return;
      closed = true;
      packages.setGitHubSourceStateListener(null);
      skillSources.setGitHubSourceStateListener(null);
      runtimes?.setUpdateStateListener(null);
      notifications.setRuntimeSource(null);
      scheduler.close();
      pass.close();
      getUpdateNotificationChangeHub().closeAll();
    },
  });
};
