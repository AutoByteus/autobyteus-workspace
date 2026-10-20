import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composeUpdateNotifications } from "../../../src/compositions/update-notifications-composition.js";
import type { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import type { SkillSourceService } from "../../../src/skills/services/skill-source-service.js";
import type { UpdateNotificationService } from "../../../src/update-notifications/services/update-notification-service.js";
import type { UpdateChecksCapabilityService } from "../../../src/update-notifications/services/update-checks-capability-service.js";
import { INITIAL_DELAY_MS } from "../../../src/update-notifications/services/update-check-scheduler.js";
import {
  GitHubRateLimitGate,
  setGitHubRateLimitGateForTests,
} from "../../../src/integrations/github/github-rate-limit-gate.js";
import {
  getUpdateNotificationChangeHub,
  resetUpdateNotificationChangeHubForTests,
} from "../../../src/update-notifications/changes/update-notification-change-messages.js";

const owner = () => {
  let listener: (() => void) | null = null;
  return {
    get listener() { return listener; },
    setGitHubSourceStateListener: vi.fn((next: (() => void) | null) => { listener = next; }),
    listGitHubSourceUpdateStates: vi.fn(async () => [{
      sourceId: "s1", displayName: "acme/s1", repositoryUrl: "https://github.com/acme/s1", defaultBranch: "main",
      installedRevision: "a".repeat(40), latestRevision: "a".repeat(40), lastCheckedAt: null,
    }]),
    checkAgentPackageUpdates: vi.fn(async () => []),
    checkGitHubSkillSourceUpdates: vi.fn(async () => ({ sources: [], warnings: [] })),
  };
};

describe("composeUpdateNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => "/nonexistent/rate-limit.json"));
  });
  afterEach(() => {
    vi.useRealTimers();
    setGitHubRateLimitGateForTests(null);
    resetUpdateNotificationChangeHubForTests();
  });

  it("reconciles when an owner announces a change, runs background checks through the owners, and closes cleanly", async () => {
    const packages = owner();
    const skills = owner();
    const notifications = { reconcile: vi.fn(async () => []) };
    const closeFeed = vi.fn();
    getUpdateNotificationChangeHub().connect({ send: () => undefined, close: closeFeed });
    const composed = composeUpdateNotifications({
      packages: packages as unknown as AgentPackageService,
      skillSources: skills as unknown as SkillSourceService,
      notifications: notifications as unknown as UpdateNotificationService,
      capability: { isEnabled: () => true } as unknown as UpdateChecksCapabilityService,
    });

    packages.listener!();
    skills.listener!();
    expect(notifications.reconcile).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(INITIAL_DELAY_MS);
    expect(packages.checkAgentPackageUpdates).toHaveBeenCalledWith(["s1"]);
    expect(skills.checkGitHubSkillSourceUpdates).toHaveBeenCalledWith(["s1"]);

    composed.close();
    expect(packages.listener).toBeNull();
    expect(skills.listener).toBeNull();
    expect(closeFeed).toHaveBeenCalledWith(1001);
  });

  it("a failing reconcile is logged and never reaches the source owner", async () => {
    const packages = owner();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const composed = composeUpdateNotifications({
      packages: packages as unknown as AgentPackageService,
      skillSources: owner() as unknown as SkillSourceService,
      notifications: { reconcile: vi.fn(async () => { throw new Error("disk full"); }) } as unknown as UpdateNotificationService,
      capability: { isEnabled: () => false } as unknown as UpdateChecksCapabilityService,
    });
    expect(() => packages.listener!()).not.toThrow();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("UPDATE_NOTIFICATIONS_RECONCILE_FAILED", expect.any(Error)));
    composed.close();
    warn.mockRestore();
  });
});
