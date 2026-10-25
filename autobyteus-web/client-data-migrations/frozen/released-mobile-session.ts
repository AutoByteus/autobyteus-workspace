/**
 * The phone's paired session as released before autobyteus-290 (frozen; `origin/personal` c78ffb15a2,
 * `utils/remoteAccess/mobileCredentialStorage.ts`). Only migrations import this file.
 */

export const RELEASED_MOBILE_SESSION_STORAGE_KEY = 'autobyteus.remote_access.mobile_session.v1';

/** `nodeId` was the window's entry ID for the paired node (`'mobile-paired-node'`), not a node's ID. */
export type ReleasedMobileSession = {
  version: 1;
  nodeId: string;
  serverBaseUrl: string;
  credential: string;
  device: { deviceId: string; [field: string]: unknown };
  pairedAt: string;
};
