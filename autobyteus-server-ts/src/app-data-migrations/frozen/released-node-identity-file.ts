/**
 * The node identity file as released before autobyteus-290 (`ServerInstanceIdentityService`, frozen for SM-1):
 * `<app data>/remote-access/server-instance.json` holding `{ serverInstanceId, createdAt }`.
 */
export const RELEASED_NODE_IDENTITY_FILE_NAME = "server-instance.json";

export type ReleasedNodeIdentityFile = {
  serverInstanceId?: unknown;
  createdAt?: unknown;
};

/** The released writer's ID shape (`srv_` + 32 or more URL-safe characters). */
export const isReleasedNodeId = (value: unknown): value is string =>
  typeof value === "string" && /^srv_[A-Za-z0-9_-]{32,}$/.test(value);
