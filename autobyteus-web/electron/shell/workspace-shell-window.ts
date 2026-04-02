import { BrowserWindow, type Rectangle, type WebContentsView } from 'electron';

type WorkspaceShellWindowOptions = {
  nodeId: string;
  startUrl: string;
  preloadPath: string;
  iconPath: string;
};

const normalizeBounds = (bounds: Rectangle | null): Rectangle | null => {
  if (!bounds) {
    return null;
  }

  const width = Math.max(0, Math.round(bounds.width));
  const height = Math.max(0, Math.round(bounds.height));
  if (width === 0 || height === 0) {
    return null;
  }

  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width,
    height,
  };
};

export class WorkspaceShellWindow {
  readonly browserWindow: BrowserWindow;
  readonly shellId: number;
  readonly nodeId: string;
  private desiredPreviewView: WebContentsView | null = null;
  private attachedPreviewView: WebContentsView | null = null;
  private previewBounds: Rectangle | null = null;

  constructor(options: WorkspaceShellWindowOptions) {
    this.nodeId = options.nodeId;
    this.browserWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: options.iconPath,
      webPreferences: {
        preload: options.preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
      show: true,
    });

    this.browserWindow.webContents.on('will-navigate', (event) => {
      event.preventDefault();
    });
    this.shellId = this.browserWindow.webContents.id;

    this.browserWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    void this.browserWindow.loadURL(options.startUrl);

    this.browserWindow.on('closed', () => {
      this.detachAttachedPreviewView();
      this.desiredPreviewView = null;
      this.previewBounds = null;
    });
  }

  isDestroyed(): boolean {
    return this.browserWindow.isDestroyed();
  }

  send(channel: string, payload: unknown): void {
    if (this.isDestroyed()) {
      return;
    }
    this.browserWindow.webContents.send(channel, payload);
  }

  focus(): void {
    if (this.isDestroyed()) {
      return;
    }
    if (this.browserWindow.isMinimized()) {
      this.browserWindow.restore();
    }
    this.browserWindow.focus();
  }

  close(): void {
    if (this.isDestroyed()) {
      return;
    }
    this.browserWindow.close();
  }

  attachPreviewView(view: WebContentsView | null): void {
    this.desiredPreviewView = view;
    this.applyPreviewProjection();
  }

  updatePreviewHostBounds(bounds: Rectangle | null): void {
    this.previewBounds = normalizeBounds(bounds);
    this.applyPreviewProjection();
  }

  private applyPreviewProjection(): void {
    if (this.isDestroyed()) {
      return;
    }

    const nextView = this.desiredPreviewView;
    const nextBounds = this.previewBounds;

    if (!nextView || !nextBounds) {
      this.detachAttachedPreviewView();
      return;
    }

    if (this.attachedPreviewView !== nextView) {
      this.detachAttachedPreviewView();
      this.browserWindow.contentView.addChildView(nextView);
      this.attachedPreviewView = nextView;
    }

    nextView.setBounds(nextBounds);
  }

  private detachAttachedPreviewView(): void {
    if (!this.attachedPreviewView || this.isDestroyed()) {
      this.attachedPreviewView = null;
      return;
    }

    this.browserWindow.contentView.removeChildView(this.attachedPreviewView);
    this.attachedPreviewView = null;
  }
}
