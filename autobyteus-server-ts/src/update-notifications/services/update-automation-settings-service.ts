import { getServerSettingsService, type ServerSettingsService } from "../../services/server-settings-service.js";
import { getGitHubRateLimitGate, type GitHubRateLimitGate } from "../../integrations/github/github-rate-limit-gate.js";
import { isDesktopEmbeddedNode } from "../../config/desktop-embedded-node.js";
import { getUpdateNotificationChangeHub } from "../changes/update-notification-change-messages.js";
import { UPDATE_NOTIFICATION_KINDS, type UpdateNotificationKind } from "../domain/update-notification.js";
import {
  AUTO_UPDATE_SETTING_KEYS,
  DEFAULT_UPDATE_CHECK_INTERVAL_MINUTES,
  isValidUpdateCheckInterval,
  UPDATE_CHECK_INTERVAL_SETTING_KEYS,
} from "../domain/settings.js";

export type UpdateAutomationSettings = Readonly<{
  /** Each kind's check interval in minutes. */
  intervals: Readonly<Record<UpdateNotificationKind, number>>;
  automaticUpdates: Readonly<Record<UpdateNotificationKind, boolean>>;
  /** Until when GitHub asked this node to wait (the later of its two host families); null when it did not. */
  githubWaitUntil: Date | null;
  /** This node is the desktop's embedded node: the only one that checks and updates agent runtimes. */
  desktopEmbeddedNode: boolean;
}>;

export class UpdateCheckIntervalOutOfRangeError extends Error {
  readonly code = "UPDATE_CHECK_INTERVAL_OUT_OF_RANGE";
  constructor() {
    super("Enter a whole number from 15 minutes to 24 hours.");
    this.name = "UpdateCheckIntervalOutOfRangeError";
  }
}

type SettingsAccess = Pick<ServerSettingsService, "getSettingValue" | "updateSetting">;

const recordOf = <T>(read: (kind: UpdateNotificationKind) => T): Record<UpdateNotificationKind, T> =>
  Object.fromEntries(UPDATE_NOTIFICATION_KINDS.map((kind) => [kind, read(kind)])) as Record<UpdateNotificationKind, T>;

/**
 * The node's update automation settings: one check interval and one automatic-update switch per
 * kind, stored as app config keys (absent = the default). The one reader and writer of those
 * keys; a change is broadcast so every window of the node re-reads it.
 */
export class UpdateAutomationSettingsService {
  private static instance: UpdateAutomationSettingsService | null = null;

  static getInstance(): UpdateAutomationSettingsService {
    return UpdateAutomationSettingsService.instance ??= new UpdateAutomationSettingsService();
  }

  static resetInstance(): void {
    UpdateAutomationSettingsService.instance = null;
  }

  /** Stored values already reported as invalid (each is reported once, not at every pass). */
  private readonly reported = new Set<string>();

  constructor(private readonly deps: {
    settings?: SettingsAccess;
    gate?: () => Pick<GitHubRateLimitGate, "blockedUntil">;
    publish?: () => void;
    isDesktopEmbeddedNode?: () => boolean;
  } = {}) {}

  /** The kind's interval; a stored value that is not a whole number from 15 to 1440 reads as the default. */
  intervalMinutes(kind: UpdateNotificationKind): number {
    const key = UPDATE_CHECK_INTERVAL_SETTING_KEYS[kind];
    const stored = this.settings.getSettingValue(key);
    if (stored === null) return DEFAULT_UPDATE_CHECK_INTERVAL_MINUTES[kind];
    const minutes = Number(stored);
    if (/^\d+$/.test(stored) && isValidUpdateCheckInterval(minutes)) return minutes;
    this.reportInvalid(key, stored);
    return DEFAULT_UPDATE_CHECK_INTERVAL_MINUTES[kind];
  }

  /** Whether the kind updates automatically; a stored value other than `true`/`false` reads as off. */
  isAutomatic(kind: UpdateNotificationKind): boolean {
    const key = AUTO_UPDATE_SETTING_KEYS[kind];
    const stored = this.settings.getSettingValue(key)?.toLowerCase() ?? null;
    if (stored === null || stored === "false") return false;
    if (stored === "true") return true;
    this.reportInvalid(key, stored);
    return false;
  }

  read(): UpdateAutomationSettings {
    const gate = (this.deps.gate ?? getGitHubRateLimitGate)();
    const waits = [gate.blockedUntil("api"), gate.blockedUntil("web")].filter((time): time is Date => time !== null);
    return {
      intervals: recordOf((kind) => this.intervalMinutes(kind)),
      automaticUpdates: recordOf((kind) => this.isAutomatic(kind)),
      githubWaitUntil: waits.length ? new Date(Math.max(...waits.map((time) => time.getTime()))) : null,
      desktopEmbeddedNode: (this.deps.isDesktopEmbeddedNode ?? isDesktopEmbeddedNode)(),
    };
  }

  /** Stores the kind's interval; refuses a value outside 15..1440 minutes. */
  setInterval(kind: UpdateNotificationKind, minutes: number): UpdateAutomationSettings {
    if (!isValidUpdateCheckInterval(minutes)) throw new UpdateCheckIntervalOutOfRangeError();
    this.store(UPDATE_CHECK_INTERVAL_SETTING_KEYS[kind], String(minutes));
    return this.read();
  }

  setAutomatic(kind: UpdateNotificationKind, enabled: boolean): UpdateAutomationSettings {
    this.store(AUTO_UPDATE_SETTING_KEYS[kind], enabled ? "true" : "false");
    return this.read();
  }

  private store(key: string, value: string): void {
    const [stored, message] = this.settings.updateSetting(key, value);
    if (!stored) throw new Error(message);
    (this.deps.publish ?? (() => getUpdateNotificationChangeHub().broadcast({ type: "update_settings_changed" })))();
  }

  private reportInvalid(key: string, value: string): void {
    const entry = `${key}=${value}`;
    if (this.reported.has(entry)) return;
    this.reported.add(entry);
    console.warn(`UPDATE_AUTOMATION_SETTING_INVALID:${key}`, value);
  }

  private get settings(): SettingsAccess {
    return this.deps.settings ?? getServerSettingsService();
  }
}
