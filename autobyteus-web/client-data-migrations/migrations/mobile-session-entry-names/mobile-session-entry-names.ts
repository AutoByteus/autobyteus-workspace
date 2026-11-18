import { RELEASED_MOBILE_SESSION_STORAGE_KEY } from '../../frozen/released-mobile-session';

/**
 * autobyteus-290 SM-8: the phone's paired session says `entryId` for the window's entry, under an unversioned key,
 * without the schema `version` field (Data Migration Guideline § 3). Every other field is copied as it is.
 */
export const MOBILE_SESSION_ENTRY_NAMES = {
  sourceStorageKey: RELEASED_MOBILE_SESSION_STORAGE_KEY,
  targetStorageKey: 'autobyteus.remote_access.mobile_session',
} as const;

export type MobileSessionConversion = { ok: true; text: string } | { ok: false; reason: string };

/** Fails only when the text is not readable JSON; a value that is not an object is copied unchanged. */
export const convertMobileSessionText = (text: string): MobileSessionConversion => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: `not readable JSON (${error instanceof Error ? error.message : String(error)})` };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: true, text: JSON.stringify(parsed) };
  }
  const { version: _version, nodeId, ...rest } = parsed as Record<string, unknown>;
  const converted = 'nodeId' in parsed ? { entryId: nodeId, ...rest } : rest;
  return { ok: true, text: JSON.stringify(converted) };
};
