import { randomBytes } from 'crypto'
import type { IncomingHttpHeaders } from 'http'

const AUTH_HEADER_NAME = 'x-autobyteus-browser-token'

export class BrowserBridgeAuthRegistry {
  private embeddedToken: string | null = null

  issueEmbeddedToken(): string {
    const authToken = randomBytes(24).toString('hex')
    this.embeddedToken = authToken
    return authToken
  }

  isAuthorized(headers: IncomingHttpHeaders): boolean {
    const providedToken = headers[AUTH_HEADER_NAME]
    return typeof providedToken === 'string' && providedToken === this.embeddedToken
  }

  clear(): void {
    this.embeddedToken = null
  }
}
