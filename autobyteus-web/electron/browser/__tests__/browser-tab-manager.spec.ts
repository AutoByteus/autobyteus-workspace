import { EventEmitter } from "events";
import { describe, expect, it } from "vitest";
import {
  BrowserTabError,
  BrowserTabManager,
} from "../browser-tab-manager";

class FakeWebContents extends EventEmitter {
  private title = "";
  private destroyed = false;
  private readonly pendingLoads = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  private readonly html = "<html><body><main>Demo</main><button>Run</button></body></html>";
  private windowOpenHandler: ((details: any) => any) | null = null;
  private currentUrl = "";

  constructor(readonly session: object = { id: "browser-session" }) {
    super();
  }

  async loadURL(url: string): Promise<void> {
    this.currentUrl = url;
    return new Promise((resolve, reject) => {
      this.pendingLoads.set(url, { resolve, reject });
    });
  }

  finishLoad(url: string): void {
    this.currentUrl = url;
    this.emit("did-finish-load");
    this.pendingLoads.get(url)?.resolve();
    this.pendingLoads.delete(url);
  }

  domReady(url: string): void {
    this.currentUrl = url;
    this.emit("dom-ready");
  }

  navigateInPage(url: string): void {
    this.currentUrl = url;
    this.emit("did-navigate-in-page", {}, url, true, 0, 0);
  }

  failLoad(url: string, errorDescription: string): void {
    this.emit("did-fail-load", {}, -1, errorDescription, url, true, 0, 0);
    this.pendingLoads.get(url)?.reject(new Error(errorDescription));
    this.pendingLoads.delete(url);
  }

  failProvisionalLoad(url: string, errorDescription: string): void {
    this.currentUrl = url;
    this.emit("did-fail-provisional-load", {}, -3, errorDescription, url, true, 0, 0);
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
    if (script.includes("autobyteus-browser-dom-snapshot-v1")) {
      return {
        schema_version: "autobyteus-browser-dom-snapshot-v1",
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

  destroy(): void {
    this.close();
  }

  setWindowOpenHandler(handler: (details: any) => any): void {
    this.windowOpenHandler = handler;
  }

  openWindow(url: string, popupWebContents = new FakeWebContents(this.session)): any {
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

  getURL(): string {
    return this.currentUrl;
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

const createViewFactory = (
  views: FakeWebContentsView[],
  browserSession: object = { id: "browser-session" },
  overrides?: {
    createBrowserView?: () => FakeWebContentsView;
    adoptPopupWebContents?: (popupWebContents: FakeWebContents) => FakeWebContentsView;
  },
) => ({
  createBrowserView: () => {
    const view =
      overrides?.createBrowserView?.() ?? new FakeWebContentsView(new FakeWebContents(browserSession));
    views.push(view);
    return view as any;
  },
  adoptPopupWebContents: (popupWebContents: FakeWebContents) => {
    if (overrides?.adoptPopupWebContents) {
      const view = overrides.adoptPopupWebContents(popupWebContents);
      views.push(view);
      return view as any;
    }

    if (popupWebContents.session !== browserSession) {
      throw new BrowserTabError(
        "browser_popup_session_mismatch",
        "Popup webContents session does not match the Browser-owned session.",
      );
    }

    const view = new FakeWebContentsView(popupWebContents);
    views.push(view);
    return view as any;
  },
});

describe("BrowserTabManager", () => {
  it("waits for an opening session before reusing it", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
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
    expect(firstResult.tab_id).toHaveLength(6);
    expect(secondResult.status).toBe("reused");
    expect(secondResult.tab_id).toBe(firstResult.tab_id);
  });

  it("evicts the oldest closed-session tombstones once the retention cap is exceeded", async () => {
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory([], { id: "browser-session" }, {
        createBrowserView: () => {
          const view = new FakeWebContentsView();
          const originalLoadURL = view.webContents.loadURL.bind(view.webContents);
          view.webContents.loadURL = async (url: string) => {
            const loadPromise = originalLoadURL(url);
            view.webContents.finishLoad(url);
            return loadPromise;
          };
          return view as any;
        },
      }) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const closedSessionIds: string[] = [];
    for (let index = 0; index < 300; index += 1) {
      const opened = await manager.openSession({
        url: `http://localhost:3000/demo-${index}`,
        wait_until: "load",
      });
      closedSessionIds.push(opened.tab_id);
      await manager.closeSession({ tab_id: opened.tab_id });
    }

    await expect(
      manager.readPage({ tab_id: closedSessionIds[0]!, cleaning_mode: "thorough" }),
    ).rejects.toThrowError(/was not found/);

    try {
      await manager.readPage({
        tab_id: closedSessionIds[closedSessionIds.length - 1]!,
        cleaning_mode: "thorough",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BrowserTabError);
      expect((error as BrowserTabError).code).toBe("browser_session_closed");
      return;
    }

    throw new Error("Expected the most recently closed browser session to retain closed-session semantics.");
  });

  it("does not reuse a session that is already leased to a shell", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const url = "http://localhost:3000/leased";
    const normalizedUrl = new URL(url).toString();
    const firstOpenPromise = manager.openSession({ url, wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad(normalizedUrl);
    const firstResult = await firstOpenPromise;

    manager.claimSessionLease(firstResult.tab_id, 11);

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
    expect(secondResult.tab_id).not.toBe(firstResult.tab_id);
  });

  it("resolves navigateSession for a full document navigation at load", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const openUrl = "http://localhost:3000/demo";
    const openPromise = manager.openSession({ url: openUrl, wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad(new URL(openUrl).toString());
    const opened = await openPromise;

    const targetUrl = "http://localhost:3000/next";
    let resolved = false;
    const navigatePromise = manager
      .navigateSession({ tab_id: opened.tab_id, url: targetUrl, wait_until: "load" })
      .then((result) => {
        resolved = true;
        return result;
      });

    await Promise.resolve();
    expect(resolved).toBe(false);

    views[0]!.webContents.finishLoad(new URL(targetUrl).toString());

    await expect(navigatePromise).resolves.toEqual({
      tab_id: opened.tab_id,
      status: "navigated",
      url: new URL(targetUrl).toString(),
    });
    expect(manager.listSessions()).toEqual({
      sessions: [
        {
          tab_id: opened.tab_id,
          title: new URL(targetUrl).toString(),
          url: new URL(targetUrl).toString(),
        },
      ],
    });
  });

  it("resolves navigateSession for same-document navigation without waiting for did-finish-load", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const openUrl = "http://localhost:3000/demo";
    const openPromise = manager.openSession({ url: openUrl, wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad(new URL(openUrl).toString());
    const opened = await openPromise;

    const targetUrl = "http://localhost:3000/demo#/details";
    let resolved = false;
    const navigatePromise = manager
      .navigateSession({ tab_id: opened.tab_id, url: targetUrl, wait_until: "load" })
      .then((result) => {
        resolved = true;
        return result;
      });

    await Promise.resolve();
    expect(resolved).toBe(false);

    views[0]!.webContents.navigateInPage(new URL(targetUrl).toString());

    await expect(navigatePromise).resolves.toEqual({
      tab_id: opened.tab_id,
      status: "navigated",
      url: new URL(targetUrl).toString(),
    });
    expect(manager.listSessions()).toEqual({
      sessions: [
        {
          tab_id: opened.tab_id,
          title: new URL(targetUrl).toString(),
          url: new URL(targetUrl).toString(),
        },
      ],
    });
  });

  it("resolves navigateSession at domcontentloaded without waiting for did-finish-load", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const openUrl = "http://localhost:3000/demo";
    const openPromise = manager.openSession({ url: openUrl, wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad(new URL(openUrl).toString());
    const opened = await openPromise;

    const targetUrl = "http://localhost:3000/next";
    let resolved = false;
    const navigatePromise = manager
      .navigateSession({ tab_id: opened.tab_id, url: targetUrl, wait_until: "domcontentloaded" })
      .then((result) => {
        resolved = true;
        return result;
      });

    await Promise.resolve();
    expect(resolved).toBe(false);

    views[0]!.webContents.domReady(new URL(targetUrl).toString());

    await expect(navigatePromise).resolves.toEqual({
      tab_id: opened.tab_id,
      status: "navigated",
      url: new URL(targetUrl).toString(),
    });
  });

  it("rejects navigateSession when Electron reports a provisional main-frame failure", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const openUrl = "http://localhost:3000/demo";
    const openPromise = manager.openSession({ url: openUrl, wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad(new URL(openUrl).toString());
    const opened = await openPromise;

    const targetUrl = "http://localhost:3000/blocked";
    const navigatePromise = manager.navigateSession({
      tab_id: opened.tab_id,
      url: targetUrl,
      wait_until: "load",
    });

    await Promise.resolve();
    views[0]!.webContents.failProvisionalLoad(new URL(targetUrl).toString(), "ERR_ABORTED");

    await expect(navigatePromise).rejects.toMatchObject({
      code: "browser_navigation_failed",
      message: expect.stringContaining(new URL(targetUrl).toString()),
    });
  });

  it("lists sessions and supports read-page plus dom-snapshot actions", async () => {
    const view = new FakeWebContentsView();
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory([], { id: "browser-session" }, {
        createBrowserView: () => {
          const originalLoadURL = view.webContents.loadURL.bind(view.webContents);
          view.webContents.loadURL = async (url: string) => {
            const loadPromise = originalLoadURL(url);
            view.webContents.finishLoad(url);
            return loadPromise;
          };
          return view as any;
        },
      }) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const opened = await manager.openSession({
      url: "http://localhost:3000/demo",
      wait_until: "load",
    });

    expect(manager.listSessions()).toEqual({
      sessions: [
        {
          tab_id: opened.tab_id,
          title: "http://localhost:3000/demo",
          url: "http://localhost:3000/demo",
        },
      ],
    });

    await expect(
      manager.readPage({
        tab_id: opened.tab_id,
        cleaning_mode: "thorough",
      }),
    ).resolves.toMatchObject({
      tab_id: opened.tab_id,
      url: "http://localhost:3000/demo",
      cleaning_mode: "thorough",
    });

    await expect(
      manager.domSnapshot({
        tab_id: opened.tab_id,
      }),
    ).resolves.toMatchObject({
      tab_id: opened.tab_id,
      schema_version: "autobyteus-browser-dom-snapshot-v1",
      returned_elements: 1,
    });
  });

  it("creates a popup child session and emits a popup-opened event", async () => {
    const views: FakeWebContentsView[] = [];
    const popupEvents: Array<{
      opener_tab_id: string;
      tab_id: string;
      url: string;
      title: string | null;
    }> = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    manager.onPopupOpened((event) => {
      popupEvents.push(event);
    });

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    const opener = await openPromise;
    manager.claimSessionLease(opener.tab_id, 41);

    const popupResponse = views[0]!.webContents.openWindow(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    expect(popupResponse.action).toBe("allow");
    expect(typeof popupResponse.createWindow).toBe("function");
    expect(views).toHaveLength(2);
    expect(popupEvents).toHaveLength(1);
    expect(popupEvents[0]).toMatchObject({
      opener_tab_id: opener.tab_id,
      url: "https://accounts.google.com/o/oauth2/v2/auth",
    });

    const childSessions = manager
      .listSessions()
      .sessions.filter((session) => session.tab_id !== opener.tab_id);
    expect(childSessions).toHaveLength(1);
    expect(childSessions[0]!.tab_id).toHaveLength(6);
    expect(popupEvents[0]!.tab_id).toBe(childSessions[0]!.tab_id);
    expect(popupResponse.createdWebContents).toBe(views[1]!.webContents);
    expect(views[1]!.webContents.session).toBe(views[0]!.webContents.session);
    await expect(
      manager.readPage({
        tab_id: childSessions[0]!.tab_id,
        cleaning_mode: "thorough",
      }),
    ).resolves.toMatchObject({
      tab_id: childSessions[0]!.tab_id,
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      cleaning_mode: "thorough",
    });
  });

  it("aborts popup adoption when Electron provides popup webContents from a foreign session", async () => {
    const views: FakeWebContentsView[] = [];
    const popupEvents: Array<{
      opener_tab_id: string;
      tab_id: string;
      url: string;
      title: string | null;
    }> = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    manager.onPopupOpened((event) => {
      popupEvents.push(event);
    });

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    const opener = await openPromise;
    manager.claimSessionLease(opener.tab_id, 41);

    const foreignPopupWebContents = new FakeWebContents({ id: "foreign-session" });

    let thrownError: unknown = null;
    try {
      views[0]!.webContents.openWindow(
        "https://accounts.google.com/o/oauth2/v2/auth",
        foreignPopupWebContents,
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(BrowserTabError);
    expect((thrownError as BrowserTabError).code).toBe("browser_popup_session_mismatch");
    expect(foreignPopupWebContents.isDestroyed()).toBe(true);
    expect(views).toHaveLength(1);
    expect(popupEvents).toHaveLength(0);
    expect(manager.listSessions()).toEqual({
      sessions: [
        {
          tab_id: opener.tab_id,
          title: "https://x.com/",
          url: "https://x.com/",
        },
      ],
    });
  });

  it("denies popup requests from sessions that are not attached to a shell", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
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
          tab_id: manager.listSessions().sessions[0]!.tab_id,
          title: "https://x.com/",
          url: "https://x.com/",
        },
      ],
    });
  });

  it("caps popup fan-out per opener session", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: createViewFactory(views) as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    const opener = await openPromise;
    manager.claimSessionLease(opener.tab_id, 42);

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
