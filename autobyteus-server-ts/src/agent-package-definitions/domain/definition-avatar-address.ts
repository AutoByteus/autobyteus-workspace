import type { AgentPackageDefinitionKind } from "./agent-package-definition-types.js";
import type { PackageAvatar } from "./definition-avatar-file.js";

/**
 * The one owner of a definition's picture addresses and the user's picture (autobyteus-669 S-2). The order
 * (REQ-003): the user's picture, then the package's, then the client's fallback.
 *
 * - `avatarUrl` (output): what every client shows. Display only: never saved back as the user's picture.
 * - `userAvatarUrl` (output): the user's own picture: the personal setting of a package or built-in definition, the
 *   config `avatarUrl` of the user's own definition. A package definition's config `avatarUrl` is the package's.
 * - The input `avatarUrl` of the create, update and personal-settings mutations means the user's picture.
 */

/** The route that serves a definition's package picture; a kind is one of `AgentPackageDefinitionKind`. */
export const DEFINITION_AVATAR_ROUTE_PREFIX = "/rest/definition-avatars/";

/** `/rest/definition-avatars/<kind>/<id>?v=<version>`: node-relative, resolved by each client against its node. */
export const definitionAvatarAddress = (kind: AgentPackageDefinitionKind, definitionId: string, avatar: PackageAvatar): string =>
  `${DEFINITION_AVATAR_ROUTE_PREFIX}${kind}/${encodeURIComponent(definitionId)}?v=${avatar.version}`;

/**
 * Whether an address is a definition's package picture: by its path, with any version and any origin. Such an address
 * is never the user's picture, so no save can pin the package's picture as the user's (SR-002, AR-001).
 */
export const isDefinitionAvatarAddress = (value: string | null | undefined): boolean => {
  const text = value?.trim();
  if (!text) return false;
  let pathname: string;
  try {
    pathname = new URL(text, "http://node.invalid").pathname;
  } catch {
    return false;
  }
  return pathname.startsWith(DEFINITION_AVATAR_ROUTE_PREFIX);
};

/**
 * The user's picture as a mutation gives it: `undefined` leaves it as it is; `null`, `''` and a definition-avatar
 * address clear it (nothing stored, never `''`); any other value is the picture, trimmed.
 */
export const userAvatarInput = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) return undefined;
  const text = value?.trim() || null;
  return text === null || isDefinitionAvatarAddress(text) ? null : text;
};

/**
 * The address a client shows: the user's or the config's picture (`avatarUrl`, the personal setting already applied)
 * when set, else the package picture's address, else null (the client's fallback).
 */
export const effectiveBaseAvatarUrl = (
  avatarUrl: string | null | undefined,
  packageAvatar: PackageAvatar | null | undefined,
  kind: AgentPackageDefinitionKind,
  definitionId: string | null | undefined,
): string | null => {
  const own = avatarUrl?.trim() || null;
  if (own) return own;
  return packageAvatar && definitionId ? definitionAvatarAddress(kind, definitionId, packageAvatar) : null;
};

/**
 * The user's own picture of a definition read with `avatarUrl` (the personal setting applied when there is one):
 * where personal settings apply (`personalAvatarSet` is defined), only the personal setting; otherwise (the user's own
 * definition) its config `avatarUrl`. A definition-avatar address is never the user's.
 */
export const userAvatarUrlOf = (avatarUrl: string | null | undefined, personalAvatarSet: boolean | null): string | null => {
  const value = avatarUrl?.trim() || null;
  if (value === null || isDefinitionAvatarAddress(value)) return null;
  return personalAvatarSet === false ? null : value;
};
