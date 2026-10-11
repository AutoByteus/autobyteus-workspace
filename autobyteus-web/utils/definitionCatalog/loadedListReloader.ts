/**
 * Background reload of a list a store has already loaded, for catalog change notifications:
 * nothing happens before the first load; overlapping requests share one in-flight reload plus at
 * most one follow-up (so a change during a reload is never missed); a failed reload keeps the
 * previous list and is only logged.
 */
export const createLoadedListReloader = (label: string, reload: () => Promise<void>) => {
  let loaded = false
  let inFlight: Promise<void> | null = null
  let again = false

  const run = async (): Promise<void> => {
    do {
      again = false
      try {
        await reload()
      } catch (cause) {
        console.error(`Failed to reload ${label}:`, cause)
      }
    } while (again)
  }

  return {
    /** The store has loaded its list; later change notifications reload it. */
    markLoaded(): void { loaded = true },
    /** The list was cleared; it is not reloaded until it is loaded again. */
    markUnloaded(): void { loaded = false },
    isLoaded(): boolean { return loaded },
    reloadIfLoaded(): Promise<void> {
      if (!loaded) return Promise.resolve()
      if (inFlight) { again = true; return inFlight }
      inFlight = run().finally(() => { inFlight = null })
      return inFlight
    },
  }
}
