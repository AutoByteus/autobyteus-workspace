import type { GitHubSourceUpdateState } from "../../integrations/github/github-source-update-state.js";

/** The kinds of node update notifications. A new kind adds a source to `UpdateNotificationService`. */
export const UPDATE_NOTIFICATION_KINDS = ["AGENT_PACKAGE", "SKILL_SOURCE"] as const;
export type UpdateNotificationKind = (typeof UPDATE_NOTIFICATION_KINDS)[number];

/**
 * The persisted record of a found update: the revision found, the installed revision when it was
 * found, and the user's reading of it. A record with a handled revision is handled; otherwise it
 * is waiting. Display facts are not stored; they come from the source owner.
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
};

export type UpdateNotificationState = "WAITING" | "HANDLED";

export type UpdateNotificationView = {
  kind: UpdateNotificationKind;
  sourceId: string;
  name: string;
  repositoryUrl: string;
  defaultBranch: string | null;
  installedRevision: string;
  latestRevision: string;
  foundAt: string;
  read: boolean;
  state: UpdateNotificationState;
  handledRevision: string | null;
  handledAt: string | null;
};

/** One source owner seen by the notifications: its kind and its update facts. */
export type UpdateNotificationSource = Readonly<{
  kind: UpdateNotificationKind;
  listGitHubSourceUpdateStates(): GitHubSourceUpdateState[] | Promise<GitHubSourceUpdateState[]>;
}>;

export const notificationKey = (kind: UpdateNotificationKind, sourceId: string): string => `${kind}:${sourceId}`;
