import { WebContentsView } from 'electron';
import { logger } from '../logger';

export const DEFAULT_PREVIEW_VIEW_BOUNDS = {
  x: 0,
  y: 0,
  width: 1280,
  height: 900,
};

export class PreviewViewFactory {
  createPreviewView(): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    view.setBounds(DEFAULT_PREVIEW_VIEW_BOUNDS);
    view.webContents.setWindowOpenHandler(({ url }) => {
      logger.warn(`Blocked preview popup request: ${url}`);
      return { action: 'deny' };
    });

    return view;
  }
}

