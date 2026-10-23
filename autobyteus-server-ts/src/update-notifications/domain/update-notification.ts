/** The kinds of node update notifications. A new kind adds a source to `UpdateNotificationService`. */
export const UPDATE_NOTIFICATION_KINDS = ["AGENT_PACKAGE", "SKILL_SOURCE", "AGENT_RUNTIME"] as const;
export type UpdateNotificationKind = (typeof UPDATE_NOTIFICATION_KINDS)[number];

/** The kinds whose sources live on GitHub; their checks and updates obey GitHub's `web` gate. */
export const GITHUB_UPDATE_NOTIFICATION_KINDS: ReadonlySet<UpdateNotificationKind> = new Set(["AGENT_PACKAGE", "SKILL_SOURCE"]);

/**
 * What an automatic update did to a record: updated it (the record is handled), failed (the
 * record stays waiting), or waits (a runtime whose agents run).
 */
export const UPDATE_OUTCOMES = ["AUTO_UPDATED", "AUTO_FAILED", "AUTO_WAITING"] as const;
export type UpdateOutcome = (typeof UPDATE_OUTCOMES)[number];

/**
 * The persisted record of a found update: the revision found, the installed revision when it was
 * found, the user's reading of it and the last automatic outcome. A record with a handled
 * revision is handled; otherwise it is waiting. Display facts are not stored; they come from the
 * source owner.
 *
 * `latestRevision`, `fromRevision` and `handledRevision` hold the source's version identifier: a
 * commit SHA for GitHub kinds, a version (`0.164.0`) for agent runtimes.
 */
export type UpdateNotificationRecord = {
  kind: UpdateNotificationKind;
  sourceId: string;
  latestRevision: string;
  fromRevision: string;
  foundAt: string;
  read: boolean;
  handledRevision: string | null;
  handledAt: string | null;
  outcome: UpdateOutcome | null;
  /** The failure or waiting reason of `AUTO_FAILED` / `AUTO_WAITING`. */
  outcomeReason: string | null;
  outcomeAt: string | null;
};

export type UpdateNotificationState = "WAITING" | "HANDLED";

export type UpdateNotificationView = {
  kind: UpdateNotificationKind;
  sourceId: string;
  /** The source's name; for agent runtimes their kind (`codex_app_server`), which the web names. */
  name: string;
  /** Null for agent runtimes. */
  repositoryUrl: string | null;
  defaultBranch: string | null;
  installedRevision: string;
  latestRevision: string;
  foundAt: string;
  read: boolean;
  state: UpdateNotificationState;
  handledRevision: string | null;
  handledAt: string | null;
  outcome: UpdateOutcome | null;
  outcomeReason: string | null;
  outcomeAt: string | null;
};

/**
 * One source's update facts, for every kind: no status. `latestRevision` is the newest known
 * revision or version (null when unknown, e.g. after a failed check); `installedRevision` is null
 * while it is not known. The repository fields are null for agent runtimes.
 */
export type UpdateSourceState = Readonly<{
  sourceId: string;
  displayName: string;
  installedRevision: string | null;
  latestRevision: string | null;
  lastCheckedAt: string | null;
  repositoryUrl: string | null;
  defaultBranch: string | null;
}>;

/** One source owner seen by the notifications: its kind and its sources' update facts. */
export type UpdateNotificationSource = Readonly<{
  kind: UpdateNotificationKind;
  listUpdateStates(): UpdateSourceState[] | Promise<UpdateSourceState[]>;
}>;

export const notificationKey = (kind: UpdateNotificationKind, sourceId: string): string => `${kind}:${sourceId}`;
