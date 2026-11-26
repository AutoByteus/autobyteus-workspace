/**
 * The AutoByteus side of an extension page's message bridge (extension-contract.md §5). The page runs in a sandboxed
 * frame with an opaque origin, so the bridge accepts a message only when its `event.source` is that frame's window and
 * replies to that window. `{ id, call, input }` becomes one action call; `{ resize: { height } }` (no id, no reply)
 * sets the frame's height, clamped to 48–2000 px; the app's language is sent once, as `{ locale }`, when the page loads.
 */
export const EXTENSION_PAGE_MIN_HEIGHT = 48
export const EXTENSION_PAGE_MAX_HEIGHT = 2000

export type ExtensionPageBridge = Readonly<{
  /** Call when the frame's document has loaded. */
  pageLoaded(locale: string): void
  dispose(): void
}>

export const connectExtensionPage = (input: Readonly<{
  frame: () => HTMLIFrameElement | null
  call: (action: string, actionInput: unknown) => Promise<unknown>
  resize: (height: number) => void
}>): ExtensionPageBridge => {
  const onMessage = async (event: MessageEvent): Promise<void> => {
    const page = input.frame()?.contentWindow
    if (!page || event.source !== page) return
    const message = event.data as { id?: unknown; call?: unknown; input?: unknown; resize?: { height?: unknown } } | null
    if (!message || typeof message !== 'object') return
    if (message.id === undefined && message.resize) {
      const height = Number(message.resize.height)
      if (Number.isFinite(height) && height > 0) {
        input.resize(Math.min(Math.max(Math.round(height), EXTENSION_PAGE_MIN_HEIGHT), EXTENSION_PAGE_MAX_HEIGHT))
      }
      return
    }
    if (typeof message.id !== 'string' || typeof message.call !== 'string') return
    try {
      const output = await input.call(message.call, message.input ?? null)
      page.postMessage({ id: message.id, ok: true, output: JSON.parse(JSON.stringify(output ?? null)) }, '*')
    } catch (cause) {
      page.postMessage({ id: message.id, ok: false, error: cause instanceof Error ? cause.message : String(cause) }, '*')
    }
  }
  window.addEventListener('message', onMessage)
  return Object.freeze({
    pageLoaded: (locale: string) => input.frame()?.contentWindow?.postMessage({ locale }, '*'),
    dispose: () => window.removeEventListener('message', onMessage),
  })
}
