/** Test control of `document.visibilityState` and the page's `visibilitychange` / `online` events. */
let visibility: DocumentVisibilityState = 'visible'

export const installPageVisibilityControl = (): void => {
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
}

export const removePageVisibilityControl = (): void => {
  delete (document as { visibilityState?: unknown }).visibilityState
}

export const hidePage = (): void => {
  visibility = 'hidden'
  document.dispatchEvent(new Event('visibilitychange'))
}

export const showPage = (): void => {
  visibility = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
}

export const reportOnline = (): void => {
  window.dispatchEvent(new Event('online'))
}
