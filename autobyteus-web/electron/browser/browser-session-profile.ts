import type { Session, WebContents } from 'electron'
import { session } from 'electron'
import { isFileDocumentRequest } from './browser-file-document-request'
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

  /**
   * The Browser session's request policy: a request made by a `file://` document carries `Origin: null`,
   * so nodes refuse it as a foreign page's (autobyteus-416 D6). Every other request passes unchanged.
   */
  private applySessionPolicy(browserSession: Session): void {
    browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = isFileDocumentRequest(details)
        ? { ...details.requestHeaders, Origin: 'null' }
        : details.requestHeaders
      callback({ requestHeaders })
    })
  }
}
