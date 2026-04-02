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
  private windowOpenHandler: ((details: any) => any) | null = null;

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

  setWindowOpenHandler(handler: (details: any) => any): void {
    this.windowOpenHandler = handler;
  }

  openWindow(url: string): any {
    if (!this.windowOpenHandler) {
      throw new Error("window open handler is not installed");
    }

    const response = this.windowOpenHandler({
      url,
      frameName: "",
      features: "",
      disposition: "new-window",
      referrer: { url: "", policy: "strict-origin-when-cross-origin" },
      postBody: null,
    });

    if (response.action !== "allow" || typeof response.createWindow !== "function") {
      return response;
    }

    const popupWebContents = new FakeWebContents();
    const createdWebContents = response.createWindow({ webContents: popupWebContents });
    if (createdWebContents !== popupWebContents) {
      throw new Error(
        "Invalid webContents. Created window should be connected to webContents passed with options object.",
      );
    }

    return {
      ...response,
      createdWebContents,
    };
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }
}

class FakeWebContentsView {
  readonly webContents: FakeWebContents;
  bounds = { x: 0, y: 0, width: 0, height: 0 };

  constructor(webContents?: FakeWebContents) {
    this.webContents = webContents ?? new FakeWebContents();
  }

  setBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.bounds = { ...bounds };
  }
}

describe("PreviewSessionManager", () => {
  it("waits for an opening session before reusing it", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
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
        createPreviewView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
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
        createPreviewView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
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
        createPreviewView: (_options?: { webContents?: FakeWebContents | null }) => {
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

  it("creates a popup child session and emits a popup-opened event", async () => {
    const views: FakeWebContentsView[] = [];
    const popupEvents: Array<{
      opener_preview_session_id: string;
      preview_session_id: string;
      url: string;
      title: string | null;
    }> = [];
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });
    manager.onPopupOpened((event) => {
      popupEvents.push(event);
    });

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    const opener = await openPromise;
    manager.claimSessionLease(opener.preview_session_id, 41);

    const popupResponse = views[0]!.webContents.openWindow(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    expect(popupResponse.action).toBe("allow");
    expect(typeof popupResponse.createWindow).toBe("function");
    expect(views).toHaveLength(2);
    expect(popupEvents).toHaveLength(1);
    expect(popupEvents[0]).toMatchObject({
      opener_preview_session_id: opener.preview_session_id,
      url: "https://accounts.google.com/o/oauth2/v2/auth",
    });

    const childSessions = manager
      .listSessions()
      .sessions.filter((session) => session.preview_session_id !== opener.preview_session_id);
    expect(childSessions).toHaveLength(1);
    expect(childSessions[0]!.preview_session_id).toHaveLength(6);
    expect(popupEvents[0]!.preview_session_id).toBe(childSessions[0]!.preview_session_id);
    expect(popupResponse.createdWebContents).toBe(views[1]!.webContents);
    await expect(
      manager.readPage({
        preview_session_id: childSessions[0]!.preview_session_id,
        cleaning_mode: "thorough",
      }),
    ).resolves.toMatchObject({
      preview_session_id: childSessions[0]!.preview_session_id,
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      cleaning_mode: "thorough",
    });
  });

  it("denies popup requests from sessions that are not attached to a shell", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    await openPromise;

    const popupResponse = views[0]!.webContents.openWindow(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    expect(popupResponse).toEqual({ action: "deny" });
    expect(manager.listSessions()).toEqual({
      sessions: [
        {
          preview_session_id: manager.listSessions().sessions[0]!.preview_session_id,
          title: "https://x.com/",
          url: "https://x.com/",
        },
      ],
    });
  });

  it("caps popup fan-out per opener session", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new PreviewSessionManager({
      viewFactory: {
        createPreviewView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/preview.png",
      } as any,
    });

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    const opener = await openPromise;
    manager.claimSessionLease(opener.preview_session_id, 42);

    for (let index = 0; index < 8; index += 1) {
      const popupResponse = views[0]!.webContents.openWindow(
        `https://accounts.google.com/o/oauth2/v2/auth?attempt=${index}`,
      );
      expect(popupResponse.action).toBe("allow");
    }

    expect(views).toHaveLength(9);
    expect(
      views[0]!.webContents.openWindow("https://accounts.google.com/o/oauth2/v2/auth?attempt=overflow"),
    ).toEqual({ action: "deny" });
    expect(manager.listSessions().sessions).toHaveLength(9);
  });
});
