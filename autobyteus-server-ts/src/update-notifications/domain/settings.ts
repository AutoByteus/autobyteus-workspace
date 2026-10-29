import type { UpdateNotificationKind } from "./update-notification.js";

/** The node's "Update checks" setting: background checks and automatic updates. Absent = on. */
export const UPDATE_CHECKS_SETTING_KEY = "ENABLE_UPDATE_CHECKS";

/** Each kind's check interval in minutes (absent = the default). */
export const UPDATE_CHECK_INTERVAL_SETTING_KEYS: Readonly<Record<UpdateNotificationKind, string>> = {
  AGENT_PACKAGE: "UPDATE_CHECK_INTERVAL_AGENT_PACKAGES_MINUTES",
  SKILL_SOURCE: "UPDATE_CHECK_INTERVAL_SKILL_SOURCES_MINUTES",
  AGENT_RUNTIME: "UPDATE_CHECK_INTERVAL_AGENT_RUNTIMES_MINUTES",
};

/** Each kind's automatic-update switch (absent = off). */
export const AUTO_UPDATE_SETTING_KEYS: Readonly<Record<UpdateNotificationKind, string>> = {
  AGENT_PACKAGE: "AUTO_UPDATE_AGENT_PACKAGES",
  SKILL_SOURCE: "AUTO_UPDATE_SKILL_SOURCES",
  AGENT_RUNTIME: "AUTO_UPDATE_AGENT_RUNTIMES",
};

export const DEFAULT_UPDATE_CHECK_INTERVAL_MINUTES: Readonly<Record<UpdateNotificationKind, number>> = {
  AGENT_PACKAGE: 30,
  SKILL_SOURCE: 30,
  AGENT_RUNTIME: 60,
};

export const MIN_UPDATE_CHECK_INTERVAL_MINUTES = 15;
export const MAX_UPDATE_CHECK_INTERVAL_MINUTES = 1440;

export const isValidUpdateCheckInterval = (minutes: number): boolean =>
  Number.isInteger(minutes) && minutes >= MIN_UPDATE_CHECK_INTERVAL_MINUTES && minutes <= MAX_UPDATE_CHECK_INTERVAL_MINUTES;
