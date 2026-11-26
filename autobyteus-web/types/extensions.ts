/**
 * A node's extensions as its `extensions` query answers them (extension-contract.md §6; design-spec.md, Data
 * Contract): one item per extension offered on that node, plus every installed one.
 */
export type ExtensionCatalogStatus = 'verified' | 'unverified' | 'unreachable'
export type ExtensionState = 'notAvailableHere' | 'notInstalled' | 'installing' | 'updating' | 'installed' | 'failed'

export interface ExtensionItem {
  id: string
  name: string
  description: string
  /** Optional: `{ "<locale>": { name, description } }`; the card shows the app language's entry when there is one. */
  translations: Record<string, { name: string; description: string }> | null
  platforms: string[]
  state: ExtensionState
  catalogVersion: string | null
  notAvailableReason: 'platform' | 'newerAutoByteus' | null
  progress: { message: string; percent: number | null } | null
  installedVersion: string | null
  enabled: boolean | null
  ready: boolean | null
  message: string | null
  starting: boolean
  update: 'available' | 'needsNewerAutoByteus' | 'none' | null
  failureMessage: string | null
}

export interface ExtensionList {
  catalog: ExtensionCatalogStatus
  /** The node's `<os>-<cpu>`. */
  platform: string
  extensions: ExtensionItem[]
}

/** The name and description the card shows in the app's language (contract §1, DEC-015). */
export const extensionTextOf = (item: Pick<ExtensionItem, 'name' | 'description' | 'translations'>, locale: string) => {
  const translated = item.translations?.[locale]
  return translated ? { ...translated, lang: locale } : { name: item.name, description: item.description, lang: 'en' }
}
