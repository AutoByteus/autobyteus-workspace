/**
 * The page's visibility and the browser's `online` event, for the run streams' reconnect schedulers
 * (autobyteus-434). One set of DOM listeners for the app, attached while someone listens.
 * A page resume is the page becoming visible again, or the browser reporting the network back.
 */

export type PageResumeEvent = Readonly<{
  /** How long the page was hidden before this resume; 0 for `online` while visible. */
  hiddenForMs: number
  cause: 'visible' | 'online'
}>

type PageResumeListener = (event: PageResumeEvent) => void

const listeners = new Set<PageResumeListener>()
let hiddenSince: number | null = null

const hasDocument = (): boolean => typeof document !== 'undefined'

export const isPageVisible = (): boolean => !hasDocument() || document.visibilityState !== 'hidden'

const notify = (event: PageResumeEvent): void => {
  for (const listener of [...listeners]) {
    try {
      listener(event)
    } catch (error) {
      console.error('A page resume listener failed:', error)
    }
  }
}

const handleVisibilityChange = (): void => {
  if (!isPageVisible()) {
    hiddenSince ??= Date.now()
    return
  }
  const hiddenForMs = hiddenSince === null ? 0 : Date.now() - hiddenSince
  hiddenSince = null
  notify({ hiddenForMs, cause: 'visible' })
}

const handleOnline = (): void => {
  if (isPageVisible()) notify({ hiddenForMs: 0, cause: 'online' })
}

const attach = (): void => {
  hiddenSince = isPageVisible() ? null : Date.now()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', handleOnline)
}

const detach = (): void => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('online', handleOnline)
  hiddenSince = null
}

export const subscribePageResume = (listener: PageResumeListener): (() => void) => {
  if (!hasDocument()) return () => undefined
  if (listeners.size === 0) attach()
  listeners.add(listener)
  return () => {
    if (!listeners.delete(listener)) return
    if (listeners.size === 0) detach()
  }
}
