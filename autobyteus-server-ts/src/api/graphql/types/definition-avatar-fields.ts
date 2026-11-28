import type { AgentPackageDefinitionKind } from "../../../agent-package-definitions/domain/agent-package-definition-types.js";
import type { PackageAvatar } from "../../../agent-package-definitions/domain/definition-avatar-file.js";
import { effectiveBaseAvatarUrl, userAvatarUrlOf } from "../../../agent-package-definitions/domain/definition-avatar-address.js";
import type { PersonalSettingsView } from "../../../personal-settings/services/personal-settings-service.js";

/**
 * A definition's two picture fields (autobyteus-669 S-2): `avatarUrl`, what a client shows (the user's picture, else
 * the package's, else null for the fallback), and `userAvatarUrl`, the user's own picture, the one the forms edit.
 * `view` is the definition's personal-settings view; null where personal settings do not apply (created, template).
 */
export const toGraphqlDefinitionAvatar = (
  kind: AgentPackageDefinitionKind,
  definition: Readonly<{ id?: string | null; avatarUrl?: string | null; packageAvatar?: PackageAvatar | null }>,
  view: PersonalSettingsView | null,
): { avatarUrl: string | null; userAvatarUrl: string | null } => ({
  avatarUrl: effectiveBaseAvatarUrl(definition.avatarUrl, definition.packageAvatar, kind, definition.id),
  userAvatarUrl: userAvatarUrlOf(definition.avatarUrl, view?.base ? view.settings.includes("AVATAR") : null),
});
