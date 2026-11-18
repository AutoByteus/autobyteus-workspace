import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

/**
 * A saved run's model menus list the options the server allows for that run (its runtime's current models). The
 * editor that owns those options provides this to the menus under it; a menu asks for a re-read when it opens and on
 * "Refresh models", and shows the busy and failed states. The menu keeps its last options while the read runs and
 * when it fails (REQ-010, QR-001).
 */
export type LockedModelOptionsRefresh = Readonly<{
  refresh: () => Promise<void>
  refreshing: Readonly<Ref<boolean>>
  failed: Readonly<Ref<boolean>>
}>

const lockedModelOptionsRefreshKey: InjectionKey<LockedModelOptionsRefresh> = Symbol('lockedModelOptionsRefresh')

/** `reload` re-reads the options and answers whether it could; concurrent calls share one read. */
export const provideLockedModelOptionsRefresh = (reload: () => Promise<boolean>): LockedModelOptionsRefresh => {
  const refreshing = ref(false)
  const failed = ref(false)
  let inFlight: Promise<void> | null = null
  const refresh = (): Promise<void> => {
    if (inFlight) return inFlight
    refreshing.value = true
    failed.value = false
    inFlight = reload().then((ok) => { failed.value = !ok }, () => { failed.value = true }).finally(() => {
      refreshing.value = false
      inFlight = null
    })
    return inFlight
  }
  const provided = { refresh, refreshing, failed }
  provide(lockedModelOptionsRefreshKey, provided)
  return provided
}

/** The refresh the enclosing saved-run editor provides, or null when the menu is not inside one. */
export const injectLockedModelOptionsRefresh = (): LockedModelOptionsRefresh | null =>
  inject(lockedModelOptionsRefreshKey, null)
