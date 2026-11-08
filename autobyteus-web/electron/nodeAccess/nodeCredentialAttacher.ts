import type { Session } from 'electron'

/** The origin a request goes to, with `ws:`/`wss:` as `http:`/`https:` (one credential per node origin). */
export const requestOrigin = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    const protocol = parsed.protocol === 'ws:' ? 'http:' : parsed.protocol === 'wss:' ? 'https:' : parsed.protocol
    if (protocol !== 'http:' && protocol !== 'https:') return null
    return `${protocol}//${parsed.host}`.toLowerCase()
  } catch {
    return null
  }
}

const NODE_URLS = ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*']

/**
 * Adds the node's credential to every request the app window's session sends to a node this desktop holds a
 * credential for (node access model NA-8; design DS-002): fetch, WebSocket upgrades, images, iframes and their
 * subresources (PROBE-03). Pages, the renderer and agents never see the credential. Only `session.defaultSession` (the
 * app windows) gets it; the in-app browser's and the agents' browser partitions get none (NAS-16). A node's
 * `Authorization` header is reserved for the node's credential, so it replaces one a page set.
 */
export class NodeCredentialAttacher {
  private credentialsByOrigin = new Map<string, string>()

  constructor(private readonly session: Pick<Session, 'webRequest'>) {}

  install(): void {
    this.session.webRequest.onBeforeSendHeaders({ urls: NODE_URLS }, (details, callback) => {
      const origin = requestOrigin(details.url)
      const credential = origin ? this.credentialsByOrigin.get(origin) : undefined
      if (!credential) {
        callback({ requestHeaders: details.requestHeaders })
        return
      }
      const requestHeaders = Object.fromEntries(
        Object.entries(details.requestHeaders).filter(([name]) => name.toLowerCase() !== 'authorization'),
      )
      requestHeaders.Authorization = `Bearer ${credential}`
      callback({ requestHeaders })
    })
  }

  /** Replaces the node origins and their credentials (the embedded node, and each connected remote node). */
  setCredentials(credentialsByBaseUrl: ReadonlyArray<Readonly<{ baseUrl: string; credential: string }>>): void {
    const next = new Map<string, string>()
    for (const { baseUrl, credential } of credentialsByBaseUrl) {
      const origin = requestOrigin(baseUrl)
      if (origin) next.set(origin, credential)
    }
    this.credentialsByOrigin = next
  }
}
