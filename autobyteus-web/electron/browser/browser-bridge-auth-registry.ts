import { randomBytes } from 'crypto'
import type { IncomingHttpHeaders } from 'http'
import type { RemoteBrowserBridgeDescriptor } from '../nodeRegistryTypes'

const AUTH_HEADER_NAME = 'x-autobyteus-browser-token'

type RemoteNodeBinding = {
  nodeId: string
  authToken: string
  expiresAt: string
}

type AuthorizedBinding =
  | {
      type: 'embedded'
      authToken: string
    }
  | {
      type: 'remote'
      authToken: string
      nodeId: string
      expiresAt: string
    }

export class BrowserBridgeAuthRegistry {
  private embeddedToken: string | null = null
  private remoteBindingsByNodeId = new Map<string, RemoteNodeBinding>()
  private tokenIndex = new Map<string, AuthorizedBinding>()

  issueEmbeddedToken(): string {
    if (this.embeddedToken) {
      this.tokenIndex.delete(this.embeddedToken)
    }

    const authToken = randomBytes(24).toString('hex')
    this.embeddedToken = authToken
    this.tokenIndex.set(authToken, {
      type: 'embedded',
      authToken,
    })
    return authToken
  }

  issueRemoteNodeBinding(input: {
    nodeId: string
    baseUrl: string
    expiresAt: string
  }): RemoteBrowserBridgeDescriptor {
    this.revokeRemoteNodeBinding(input.nodeId)

    const authToken = randomBytes(24).toString('hex')
    const binding: RemoteNodeBinding = {
      nodeId: input.nodeId,
      authToken,
      expiresAt: input.expiresAt,
    }

    this.remoteBindingsByNodeId.set(input.nodeId, binding)
    this.tokenIndex.set(authToken, {
      type: 'remote',
      authToken,
      nodeId: input.nodeId,
      expiresAt: input.expiresAt,
    })

    return {
      baseUrl: input.baseUrl,
      authToken,
      expiresAt: input.expiresAt,
    }
  }

  revokeRemoteNodeBinding(nodeId: string): void {
    const existing = this.remoteBindingsByNodeId.get(nodeId)
    if (!existing) {
      return
    }

    this.remoteBindingsByNodeId.delete(nodeId)
    this.tokenIndex.delete(existing.authToken)
  }

  isAuthorized(headers: IncomingHttpHeaders): boolean {
    const providedToken = headers[AUTH_HEADER_NAME]
    if (typeof providedToken !== 'string' || !providedToken) {
      return false
    }

    const binding = this.tokenIndex.get(providedToken)
    if (!binding) {
      return false
    }

    if (binding.type === 'remote' && Date.parse(binding.expiresAt) <= Date.now()) {
      this.revokeRemoteNodeBinding(binding.nodeId)
      return false
    }

    return true
  }

  clear(): void {
    this.embeddedToken = null
    this.remoteBindingsByNodeId.clear()
    this.tokenIndex.clear()
  }
}
