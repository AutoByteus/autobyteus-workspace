import type { Session, WebContents } from 'electron'
import { session } from 'electron'
import { BrowserTabError } from './browser-tab-types'

export const BROWSER_SESSION_PARTITION = 'persist:autobyteus-browser'

export class BrowserSessionProfile {
  private resolvedSession: Session | null = null
  private sessionPolicyApplied = false

  getSession(): Session {
    if (!this.resolvedSession) {
      this.resolvedSession = session.fromPartition(BROWSER_SESSION_PARTITION)
    }

    if (!this.sessionPolicyApplied) {
      this.applySessionPolicy(this.resolvedSession)
      this.sessionPolicyApplied = true
    }

    return this.resolvedSession
  }

  assertOwnedPopupWebContents(popupWebContents: WebContents): void {
    if (popupWebContents.session === this.getSession()) {
      return
    }

    throw new BrowserTabError(
      'browser_popup_session_mismatch',
      `Popup webContents does not belong to Browser session partition '${BROWSER_SESSION_PARTITION}'.`,
    )
  }

  private applySessionPolicy(_session: Session): void {
    // Browser-only session policy belongs here when compatibility hardening is added.
  }
}
