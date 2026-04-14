import type { WebContents } from 'electron'
import { WebContentsView } from 'electron'
import type { BrowserSessionProfile } from './browser-session-profile'

export const DEFAULT_BROWSER_VIEW_BOUNDS = {
  x: 0,
  y: 0,
  width: 1280,
  height: 900,
}

export class BrowserViewFactory {
  constructor(private readonly sessionProfile: BrowserSessionProfile) {}

  createBrowserView(): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        session: this.sessionProfile.getSession(),
      },
    })

    view.setBounds(DEFAULT_BROWSER_VIEW_BOUNDS)
    return view
  }

  adoptPopupWebContents(popupWebContents: WebContents): WebContentsView {
    this.sessionProfile.assertOwnedPopupWebContents(popupWebContents)

    const view = new WebContentsView({
      webContents: popupWebContents,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    view.setBounds(DEFAULT_BROWSER_VIEW_BOUNDS)
    return view
  }
}
