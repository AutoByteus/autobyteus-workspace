import { EventEmitter } from "events";
import { describe, expect, it } from "vitest";
import { PreviewSessionManager } from "../preview-session-manager";
import { PreviewShellController } from "../preview-shell-controller";

class FakeWebContents extends EventEmitter {
  private readonly pendingLoads = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();

  async loadURL(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pendingLoads.set(url, { resolve, reject });
    });
  }

  finishLoad(url: string): void {
    this.emit("did-finish-load");
    this.pendingLoads.get(url)?.resolve();
    this.pendingLoads.delete(url);
  }

  getTitle(): string {
    return "Preview";
  }

  async capturePage() {
    return {
      toPNG: () => Buffer.from("png"),
    };
  }

  async executeJavaScript() {
    return { width: 1200, height: 800 };
  }

  close(): void {
    this.emit("destroyed");
  }

  isDestroyed(): boolean {
    return false;
  }

  focus(): void {}
}

class FakeWebContentsView {
  readonly webContents = new FakeWebContents();
  bounds = { x: 0, y: 0, width: 0, height: 0 };

  setBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.bounds = { ...bounds };
  }
}

class FakeShellWindow {
  readonly browserWindow = new EventEmitter();
  readonly nodeId = "embedded-local";
  constructor(readonly shellId: number) {}
  attachedView: FakeWebContentsView | null = null;
  lastBounds: { x: number; y: number; width: number; height: number } | null = null;
  lastSnapshot: unknown = null;

  attachPreviewView(view: FakeWebContentsView | null): void {
    this.attachedView = view;
  }

  updatePreviewHostBounds(bounds: { x: number; y: number; width: number; height: number } | null): void {
    this.lastBounds = bounds ? { ...bounds } : null;
  }

  send(_channel: string, payload: unknown): void {
    this.lastSnapshot = payload;
  }
}

describe("PreviewShellController", () => {
  it("attaches the active preview session into the shell host and publishes a snapshot", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: () => {
          const view = new FakeWebContentsView();
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });
    const controller = new PreviewShellController(manager);
    const shell = new FakeShellWindow(99);
    controller.registerShell(shell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    const snapshot = controller.focusSession(shell.shellId, opened.preview_session_id);
    controller.updateHostBounds(shell.shellId, { x: 10, y: 20, width: 320, height: 480 });

    expect(snapshot.previewVisible).toBe(true);
    expect(snapshot.activePreviewSessionId).toBe(opened.preview_session_id);
    expect(shell.attachedView).toBe(views[0]);
    expect(shell.lastBounds).toEqual({ x: 10, y: 20, width: 320, height: 480 });
  });

  it("removes the preview tab state when the last session closes", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: () => {
          const view = new FakeWebContentsView();
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });
    const controller = new PreviewShellController(manager);
    const shell = new FakeShellWindow(100);
    controller.registerShell(shell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    controller.focusSession(shell.shellId, opened.preview_session_id);
    controller.updateHostBounds(shell.shellId, { x: 0, y: 0, width: 300, height: 400 });
    await controller.closeSession(shell.shellId, opened.preview_session_id);

    expect(controller.getSnapshot(shell.shellId)).toEqual({
      previewVisible: false,
      activePreviewSessionId: null,
      sessions: [],
    });
  });
});
