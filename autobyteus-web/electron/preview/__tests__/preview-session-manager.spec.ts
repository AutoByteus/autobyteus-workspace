import { EventEmitter } from "events";
import { describe, expect, it } from "vitest";
import {
  PreviewSessionError,
  PreviewSessionManager,
} from "../preview-session-manager";

class FakeWebContents extends EventEmitter {
  private title = "";
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

  failLoad(url: string, errorDescription: string): void {
    this.emit("did-fail-load", {}, -1, errorDescription, url, true, 0, 0);
    this.pendingLoads.get(url)?.reject(new Error(errorDescription));
    this.pendingLoads.delete(url);
  }

  getTitle(): string {
    return this.title;
  }

  setTitle(value: string): void {
    this.title = value;
  }

  async capturePage() {
    return {
      toPNG: () => Buffer.from("png"),
    };
  }

  async executeJavaScript() {
    return { width: 1200, height: 800 };
  }
}

class FakeBrowserWindow extends EventEmitter {
  readonly webContents = new FakeWebContents();
  private destroyed = false;
  private minimized = false;

  isDestroyed(): boolean {
    return this.destroyed;
  }

  isMinimized(): boolean {
    return this.minimized;
  }

  restore(): void {
    this.minimized = false;
  }

  show(): void {}

  focus(): void {}

  setTitle(title: string): void {
    this.webContents.setTitle(title);
  }

  async loadURL(url: string): Promise<void> {
    return this.webContents.loadURL(url);
  }

  getContentBounds() {
    return { width: 1200, height: 800, x: 0, y: 0 };
  }

  setContentSize(): void {}

  close(): void {
    this.destroyed = true;
    this.emit("closed");
  }

  destroy(): void {
    this.close();
  }
}

describe("PreviewSessionManager", () => {
  it("waits for an opening session before reusing it", async () => {
    const windows: FakeBrowserWindow[] = [];
    const manager = new PreviewSessionManager({
      windowFactory: {
        createPreviewWindow: () => {
          const window = new FakeBrowserWindow();
          windows.push(window);
          return window as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });

    const url = "http://localhost:3000/demo";
    const firstOpenPromise = manager.openSession({ url, wait_until: "load" });
    await Promise.resolve();

    let secondResolved = false;
    const secondOpenPromise = manager
      .openSession({ url, reuse_existing: true, wait_until: "load" })
      .then((result) => {
        secondResolved = true;
        return result;
      });

    await Promise.resolve();
    expect(secondResolved).toBe(false);
    expect(windows).toHaveLength(1);

    windows[0]!.webContents.finishLoad(new URL(url).toString());

    const [firstResult, secondResult] = await Promise.all([firstOpenPromise, secondOpenPromise]);
    expect(firstResult.status).toBe("opened");
    expect(secondResult.status).toBe("reused");
    expect(secondResult.preview_session_id).toBe(firstResult.preview_session_id);
  });

  it("evicts the oldest closed-session tombstones once the retention cap is exceeded", async () => {
    const manager = new PreviewSessionManager({
      windowFactory: {
        createPreviewWindow: () => {
          const window = new FakeBrowserWindow();
          const originalLoadURL = window.loadURL.bind(window);
          window.loadURL = async (url: string) => {
            const loadPromise = originalLoadURL(url);
            window.webContents.finishLoad(url);
            return loadPromise;
          };
          return window as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });

    const closedSessionIds: string[] = [];
    for (let index = 0; index < 300; index += 1) {
      const opened = await manager.openSession({
        url: `http://localhost:3000/demo-${index}`,
        wait_until: "load",
      });
      closedSessionIds.push(opened.preview_session_id);
      await manager.closeSession({ preview_session_id: opened.preview_session_id });
    }

    expect(() =>
      manager.getConsoleLogs({ preview_session_id: closedSessionIds[0]!, since_sequence: null }),
    ).toThrowError(/was not found/);

    try {
      manager.getConsoleLogs({
        preview_session_id: closedSessionIds[closedSessionIds.length - 1]!,
        since_sequence: null,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewSessionError);
      expect((error as PreviewSessionError).code).toBe("preview_session_closed");
      return;
    }

    throw new Error("Expected the most recently closed preview session to retain closed-session semantics.");
  });
});
