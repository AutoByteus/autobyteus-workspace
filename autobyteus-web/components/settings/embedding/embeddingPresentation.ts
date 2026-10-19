import { nextTick } from 'vue'

/** Bytes as whole decimal megabytes (the catalog's sizes: 55, 24 and 346 MB). */
export const toMb = (bytes: number | null | undefined): number => Math.round((bytes ?? 0) / 1e6)

/** Whole percent of `done` in `total`; 0 when the total is not known yet. */
export const percentOf = (done: number | null | undefined, total: number | null | undefined): number =>
  total ? Math.min(100, Math.round(((done ?? 0) / total) * 100)) : 0

/** The localization key of a model's language label, or null when the catalog gives none we label. */
export const languageLabelKey = (languages: readonly string[]): string | null => {
  if (languages.includes('multilingual')) return 'settings.search.facts.languagesValue.multilingual'
  if (languages.includes('en')) return 'settings.search.facts.languagesValue.en'
  return null
}

/** Moves focus to the element with this test id after the next render (focus follows confirmations and switches). */
export const focusTestId = async (testId: string): Promise<void> => {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.focus()
}
