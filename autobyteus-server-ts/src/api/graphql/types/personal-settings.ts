import { registerEnumType } from "type-graphql";
import type { PersonalSettingsView } from "../../../personal-settings/services/personal-settings-service.js";
import type { PersonalSetting as DomainPersonalSetting } from "../../../personal-settings/domain/personal-setting-record.js";

/** One of the settings a definition from a package (or a built-in agent) can hold as a personal setting. */
export enum PersonalSetting {
  TOOLS = "TOOLS",
  SKILLS = "SKILLS",
  AVATAR = "AVATAR",
  DEFAULT_LAUNCH_CONFIG = "DEFAULT_LAUNCH_CONFIG",
  SEMANTIC_MEMORY = "SEMANTIC_MEMORY",
}
registerEnumType(PersonalSetting, { name: "PersonalSetting" });

/** The base the personal settings sit on: a package's files, or a built-in agent's template (the editor's wording). */
export enum PersonalSettingsBase {
  PACKAGE = "PACKAGE",
  BUILT_IN = "BUILT_IN",
}
registerEnumType(PersonalSettingsBase, { name: "PersonalSettingsBase" });

/** The two GraphQL fields of a definition; none when personal settings do not apply. */
export const toGraphqlPersonalSettings = (view: PersonalSettingsView | null): {
  personalSettings: PersonalSetting[];
  personalSettingsBase: PersonalSettingsBase | null;
} => ({
  personalSettings: (view?.settings ?? []).map((setting) => PersonalSetting[setting]),
  personalSettingsBase: view?.base ? PersonalSettingsBase[view.base] : null,
});

export const toDomainPersonalSetting = (setting: PersonalSetting): DomainPersonalSetting => setting;
