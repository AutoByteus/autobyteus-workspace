import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composeUpdateNotifications } from "../../../src/compositions/update-notifications-composition.js";
import type { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import type { SkillSourceService } from "../../../src/skills/services/skill-source-service.js";
import type { AgentRuntimeStatusService } from "../../../src/runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { UpdateNotificationService } from "../../../src/update-notifications/services/update-notification-service.js";
import type { UpdateChecksCapabilityService } from "../../../src/update-notifications/services/update-checks-capability-service.js";
import type { UpdateAutomationSettingsService } from "../../../src/update-notifications/services/update-automation-settings-service.js";
import { FIRST_TICK_DELAY_MS } from "../../../src/update-notifications/services/update-check-scheduler.js";
import { DESKTOP_EMBEDDED_NODE_ENV, resetDesktopEmbeddedNodeForTests } from "../../../src/config/desktop-embedded-node.js";
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

const runtimeService = () => {
  let listener: (() => void) | null = null;
  return {
    get listener() { return listener; },
    setUpdateStateListener: vi.fn((next: (() => void) | null) => { listener = next; }),
    listUpdateStates: vi.fn(() => [{ runtimeKind: "codex_app_server", checked: false, installedVersion: null,
      latestVersion: null, checkFailed: false, lastCheckedAt: null }]),
    checkInBackground: vi.fn(async () => undefined),
    runUpdate: vi.fn(),
  };
};

const notificationsFake = () => ({
  reconcile: vi.fn(async () => []),
  setRuntimeSource: vi.fn(),
  listAutomationCandidates: vi.fn(async () => []),
  recordOutcome: vi.fn(),
});

const settings = { intervalMinutes: () => 30, isAutomatic: () => false } as unknown as UpdateAutomationSettingsService;

describe("composeUpdateNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDesktopEmbeddedNodeForTests();
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => "/nonexistent/rate-limit.json"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    resetDesktopEmbeddedNodeForTests();
    setGitHubRateLimitGateForTests(null);
    resetUpdateNotificationChangeHubForTests();
  });

  it("reconciles when an owner announces a change, runs the pass through the owners, and closes cleanly", async () => {
    vi.stubEnv(DESKTOP_EMBEDDED_NODE_ENV, "1");
    const packages = owner();
    const skills = owner();
    const runtimes = runtimeService();
    const notifications = notificationsFake();
    const closeFeed = vi.fn();
    getUpdateNotificationChangeHub().connect({ send: () => undefined, close: closeFeed });
    const composed = composeUpdateNotifications({
      runtimes: runtimes as unknown as AgentRuntimeStatusService,
      packages: packages as unknown as AgentPackageService,
      skillSources: skills as unknown as SkillSourceService,
      notifications: notifications as unknown as UpdateNotificationService,
      capability: { isEnabled: () => true } as unknown as UpdateChecksCapabilityService,
      settings,
    });

    expect(notifications.setRuntimeSource).toHaveBeenCalledWith(expect.objectContaining({ kind: "AGENT_RUNTIME" }));
    packages.listener!();
    skills.listener!();
    runtimes.listener!();
    expect(notifications.reconcile).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS * 2);
    expect(packages.checkAgentPackageUpdates).toHaveBeenCalledWith(["s1"]);
    expect(skills.checkGitHubSkillSourceUpdates).toHaveBeenCalledWith(["s1"]);
    expect(runtimes.checkInBackground).toHaveBeenCalledWith("codex_app_server");

    composed.close();
    expect(packages.listener).toBeNull();
    expect(skills.listener).toBeNull();
    expect(runtimes.listener).toBeNull();
    expect(notifications.setRuntimeSource).toHaveBeenLastCalledWith(null);
    expect(closeFeed).toHaveBeenCalledWith(1001);
    const calls = packages.checkAgentPackageUpdates.mock.calls.length;
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS * 10);
    expect(packages.checkAgentPackageUpdates).toHaveBeenCalledTimes(calls);
  });

  it("leaves agent runtimes out on a node that is not the desktop's embedded node (AR-005)", async () => {
    vi.stubEnv(DESKTOP_EMBEDDED_NODE_ENV, "");
    const runtimes = runtimeService();
    const notifications = notificationsFake();
    const composed = composeUpdateNotifications({
      runtimes: runtimes as unknown as AgentRuntimeStatusService,
      packages: owner() as unknown as AgentPackageService,
      skillSources: owner() as unknown as SkillSourceService,
      notifications: notifications as unknown as UpdateNotificationService,
      capability: { isEnabled: () => true } as unknown as UpdateChecksCapabilityService,
      settings,
    });
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS * 2);
    expect(notifications.setRuntimeSource).not.toHaveBeenCalledWith(expect.objectContaining({ kind: "AGENT_RUNTIME" }));
    expect(runtimes.setUpdateStateListener).not.toHaveBeenCalled();
    expect(runtimes.checkInBackground).not.toHaveBeenCalled();
    composed.close();
  });

  it("a failing reconcile is logged and never reaches the source owner", async () => {
    const packages = owner();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const composed = composeUpdateNotifications({
      runtimes: null,
      packages: packages as unknown as AgentPackageService,
      skillSources: owner() as unknown as SkillSourceService,
      notifications: { ...notificationsFake(), reconcile: vi.fn(async () => { throw new Error("disk full"); }) } as unknown as UpdateNotificationService,
      capability: { isEnabled: () => false } as unknown as UpdateChecksCapabilityService,
      settings,
    });
    expect(() => packages.listener!()).not.toThrow();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("UPDATE_NOTIFICATIONS_RECONCILE_FAILED", expect.any(Error)));
    composed.close();
    warn.mockRestore();
  });
});
