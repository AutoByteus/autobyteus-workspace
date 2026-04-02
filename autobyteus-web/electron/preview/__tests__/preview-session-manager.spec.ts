import { EventEmitter } from "events";
import { describe, expect, it } from "vitest";
import {
  PreviewSessionError,
  PreviewSessionManager,
} from "../preview-session-manager";

class FakeWebContents extends EventEmitter {
  private title = "";
  private destroyed = false;
  private readonly pendingLoads = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  private readonly html = "<html><body><main>Demo</main><button>Run</button></body></html>";

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

  async executeJavaScript(script: string) {
    if (script.includes("document.documentElement?.outerHTML")) {
      return this.html;
    }
    if (script.includes("autobyteus-preview-dom-snapshot-v1")) {
      return {
        schema_version: "autobyteus-preview-dom-snapshot-v1",
        total_candidates: 1,
        returned_elements: 1,
        truncated: false,
        elements: [
          {
            element_id: "e1",
            tag_name: "button",
            dom_id: null,
            css_selector: "button:nth-of-type(1)",
            role: null,
            name: null,
            text: "Run",
            href: null,
            value: null,
            bounding_box: { x: 10, y: 20, width: 100, height: 30 },
          },
        ],
      };
    }
    return { width: 1200, height: 800 };
  }

  close(): void {
    this.destroyed = true;
    this.emit("destroyed");
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }
}

class FakeWebContentsView {
  readonly webContents = new FakeWebContents();
  bounds = { x: 0, y: 0, width: 0, height: 0 };

  setBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.bounds = { ...bounds };
  }
}

describe("PreviewSessionManager", () => {
  it("waits for an opening session before reusing it", async () => {
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
    expect(views).toHaveLength(1);

    views[0]!.webContents.finishLoad(new URL(url).toString());

    const [firstResult, secondResult] = await Promise.all([firstOpenPromise, secondOpenPromise]);
    expect(firstResult.status).toBe("opened");
    expect(firstResult.preview_session_id).toHaveLength(6);
    expect(secondResult.status).toBe("reused");
    expect(secondResult.preview_session_id).toBe(firstResult.preview_session_id);
  });

  it("evicts the oldest closed-session tombstones once the retention cap is exceeded", async () => {
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: () => {
          const view = new FakeWebContentsView();
          const originalLoadURL = view.webContents.loadURL.bind(view.webContents);
          view.webContents.loadURL = async (url: string) => {
            const loadPromise = originalLoadURL(url);
            view.webContents.finishLoad(url);
            return loadPromise;
          };
          return view as any;
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

    await expect(
      manager.readPage({ preview_session_id: closedSessionIds[0]!, cleaning_mode: "thorough" }),
    ).rejects.toThrowError(/was not found/);

    try {
      await manager.readPage({
        preview_session_id: closedSessionIds[closedSessionIds.length - 1]!,
        cleaning_mode: "thorough",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewSessionError);
      expect((error as PreviewSessionError).code).toBe("preview_session_closed");
      return;
    }

    throw new Error("Expected the most recently closed preview session to retain closed-session semantics.");
  });

  it("does not reuse a session that is already leased to a shell", async () => {
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

    const url = "http://localhost:3000/leased";
    const normalizedUrl = new URL(url).toString();
    const firstOpenPromise = manager.openSession({ url, wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad(normalizedUrl);
    const firstResult = await firstOpenPromise;

    manager.claimSessionLease(firstResult.preview_session_id, 11);

    const secondOpenPromise = manager.openSession({
      url,
      reuse_existing: true,
      wait_until: "load",
    });
    await Promise.resolve();

    expect(views).toHaveLength(2);
    views[1]!.webContents.finishLoad(normalizedUrl);
    const secondResult = await secondOpenPromise;

    expect(secondResult.status).toBe("opened");
    expect(secondResult.preview_session_id).not.toBe(firstResult.preview_session_id);
  });

  it("lists sessions and supports read-page plus dom-snapshot actions", async () => {
    const view = new FakeWebContentsView();
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: () => {
          const originalLoadURL = view.webContents.loadURL.bind(view.webContents);
          view.webContents.loadURL = async (url: string) => {
            const loadPromise = originalLoadURL(url);
            view.webContents.finishLoad(url);
            return loadPromise;
          };
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });

    const opened = await manager.openSession({
      url: "http://localhost:3000/demo",
      wait_until: "load",
    });

    expect(manager.listSessions()).toEqual({
      sessions: [
        {
          preview_session_id: opened.preview_session_id,
          title: "http://localhost:3000/demo",
          url: "http://localhost:3000/demo",
        },
      ],
    });

    await expect(
      manager.readPage({
        preview_session_id: opened.preview_session_id,
        cleaning_mode: "thorough",
      }),
    ).resolves.toMatchObject({
      preview_session_id: opened.preview_session_id,
      url: "http://localhost:3000/demo",
      cleaning_mode: "thorough",
    });

    await expect(
      manager.domSnapshot({
        preview_session_id: opened.preview_session_id,
      }),
    ).resolves.toMatchObject({
      preview_session_id: opened.preview_session_id,
      schema_version: "autobyteus-preview-dom-snapshot-v1",
      returned_elements: 1,
    });
  });
});
