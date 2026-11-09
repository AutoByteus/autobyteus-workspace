/**
 * Personal settings of a definition from an agent package (or of a built-in agent): tools, skills
 * (agents only), avatar and default runtime/model kept on this computer, on top of the base value in
 * the definition's files. The server owns them; the editors show which are personal and offer reset.
 */
export type PersonalSetting = 'TOOLS' | 'SKILLS' | 'AVATAR' | 'DEFAULT_LAUNCH_CONFIG'

/** What the personal settings sit on: a package's files, or a built-in agent's template. */
export type PersonalSettingsBase = 'PACKAGE' | 'BUILT_IN'

/** The two fields every agent, Team and Org definition carries (no personal settings: `[]` and `null`). */
export interface PersonalSettingsFields {
  personalSettings?: PersonalSetting[]
  personalSettingsBase?: PersonalSettingsBase | null
}
