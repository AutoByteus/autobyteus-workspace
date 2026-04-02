import type { WebContents } from 'electron';
import { WebContentsView } from 'electron';

export const DEFAULT_PREVIEW_VIEW_BOUNDS = {
  x: 0,
  y: 0,
  width: 1280,
  height: 900,
};

export type PreviewViewCreationOptions = {
  webContents?: WebContents | null;
};

export class PreviewViewFactory {
  createPreviewView(options: PreviewViewCreationOptions = {}): WebContentsView {
    const view = new WebContentsView({
      ...(options.webContents ? { webContents: options.webContents } : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    view.setBounds(DEFAULT_PREVIEW_VIEW_BOUNDS);
    return view;
  }
}
