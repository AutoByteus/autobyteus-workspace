import { BrowserWindow } from 'electron'
import { logger } from '../logger'

type PreviewWindowFactoryOptions = {
  iconPath?: string | null
}

export class PreviewWindowFactory {
  constructor(private readonly options: PreviewWindowFactoryOptions = {}) {}

  createPreviewWindow(title: string | null = null): BrowserWindow {
    const window = new BrowserWindow({
      width: 1280,
      height: 900,
      autoHideMenuBar: true,
      ...(this.options.iconPath ? { icon: this.options.iconPath } : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
      show: true,
    })

    if (title) {
      window.setTitle(title)
    }

    window.webContents.setWindowOpenHandler(({ url }) => {
      logger.warn(`Blocked preview popup request: ${url}`)
      return { action: 'deny' }
    })

    return window
  }
}
