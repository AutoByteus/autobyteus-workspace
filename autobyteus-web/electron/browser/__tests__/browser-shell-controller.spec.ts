import { EventEmitter } from "events";
import { describe, expect, it } from "vitest";
import { BrowserTabManager } from "../browser-tab-manager";
import { BrowserShellController } from "../browser-shell-controller";

class FakeWebContents extends EventEmitter {
  private readonly pendingLoads = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  private windowOpenHandler: ((details: any) => any) | null = null;
  private currentUrl = '';
  focusCount = 0;

  async loadURL(url: string): Promise<void> {
    this.currentUrl = url;
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
    return "Browser";
  }

  getURL(): string {
    return this.currentUrl;
  }

  async capturePage() {
    return {
      toPNG: () => Buffer.from("png"),
    };
  }

  async executeJavaScript() {
    return { width: 1200, height: 800 };
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

  close(): void {
    this.emit("destroyed");
  }

  isDestroyed(): boolean {
    return false;
  }

  focus(): void {
    this.focusCount += 1;
  }

  reload(): void {
    this.emit('did-finish-load');
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

class FakeShellWindow {
  readonly browserWindow = new EventEmitter();
  readonly nodeId = "embedded-local";
  private readonly stableShellId: number;
  throwOnShellIdRead = false;

  constructor(shellId: number) {
    this.stableShellId = shellId;
  }

  get shellId(): number {
    if (this.throwOnShellIdRead) {
      throw new Error("shellId read after teardown");
    }

    return this.stableShellId;
  }

  attachedView: FakeWebContentsView | null = null;
  lastBounds: { x: number; y: number; width: number; height: number } | null = null;
  lastSnapshot: unknown = null;
  sendCount = 0;

  attachBrowserView(view: FakeWebContentsView | null): void {
    this.attachedView = view;
  }

  updateBrowserHostBounds(bounds: { x: number; y: number; width: number; height: number } | null): void {
    this.lastBounds = bounds ? { ...bounds } : null;
  }

  send(_channel: string, payload: unknown): void {
    this.sendCount += 1;
    this.lastSnapshot = payload;
  }
}

describe("BrowserShellController", () => {
  it("attaches the active browser session into the shell host and publishes a snapshot", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const shell = new FakeShellWindow(99);
    controller.registerShell(shell as any);

    const openPromise = controller.openSession(shell.shellId, {
      url: "http://localhost:3000/demo",
      waitUntil: "load",
    });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const snapshot = await openPromise;
    controller.updateHostBounds(shell.shellId, { x: 10, y: 20, width: 320, height: 480 });

    expect(snapshot.activeTabId).toBeTruthy();
    expect(shell.attachedView).toBe(views[0]);
    expect(shell.lastBounds).toEqual({ x: 10, y: 20, width: 320, height: 480 });
  });

  it("removes the browser tab state when the last session closes", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const shell = new FakeShellWindow(100);
    controller.registerShell(shell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    controller.focusSession(shell.shellId, opened.tab_id);
    controller.updateHostBounds(shell.shellId, { x: 0, y: 0, width: 300, height: 400 });
    await controller.closeSession(shell.shellId, opened.tab_id);

    expect(controller.getSnapshot(shell.shellId)).toEqual({
      activeTabId: null,
      sessions: [],
    });
  });

  it("unregisters a closed shell without rereading shell identity after teardown", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const shell = new FakeShellWindow(101);
    controller.registerShell(shell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    controller.focusSession(shell.shellId, opened.tab_id);
    controller.updateHostBounds(shell.shellId, { x: 0, y: 0, width: 300, height: 400 });
    shell.throwOnShellIdRead = true;

    expect(() => shell.browserWindow.emit("closed")).not.toThrow();
    expect(shell.attachedView).toBeNull();
    expect(() => controller.getSnapshot(101)).toThrow("Browser shell '101' is not registered.");
  });

  it("does not let one shell steal another shell's browser session", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const firstShell = new FakeShellWindow(103);
    const secondShell = new FakeShellWindow(104);
    controller.registerShell(firstShell as any);
    controller.registerShell(secondShell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    controller.focusSession(firstShell.shellId, opened.tab_id);

    expect(() => controller.focusSession(secondShell.shellId, opened.tab_id)).toThrow(
      /already attached to shell '103'/,
    );
    expect(controller.getSnapshot(firstShell.shellId)).toEqual({
      activeTabId: opened.tab_id,
      sessions: [
        {
          tab_id: opened.tab_id,
          title: "Browser",
          url: "http://localhost:3000/demo",
        },
      ],
    });
    expect(controller.getSnapshot(secondShell.shellId)).toEqual({
      activeTabId: null,
      sessions: [],
    });
  });

  it("releases a shell lease when the owning shell closes", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const firstShell = new FakeShellWindow(105);
    const secondShell = new FakeShellWindow(106);
    controller.registerShell(firstShell as any);
    controller.registerShell(secondShell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    controller.focusSession(firstShell.shellId, opened.tab_id);
    firstShell.throwOnShellIdRead = true;

    expect(() => firstShell.browserWindow.emit("closed")).not.toThrow();
    expect(() =>
      controller.focusSession(secondShell.shellId, opened.tab_id),
    ).not.toThrow();
    expect(controller.getSnapshot(secondShell.shellId).activeTabId).toBe(
      opened.tab_id,
    );
  });

  it("skips redundant host-bounds projection work when bounds are unchanged", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const shell = new FakeShellWindow(102);
    controller.registerShell(shell as any);

    const openPromise = manager.openSession({ url: "http://localhost:3000/demo", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("http://localhost:3000/demo");
    const opened = await openPromise;

    controller.focusSession(shell.shellId, opened.tab_id);
    const firstSnapshot = controller.updateHostBounds(shell.shellId, { x: 5, y: 10, width: 320, height: 480 });
    const sendCountAfterFirstBounds = shell.sendCount;
    const focusCountAfterFirstBounds = views[0]!.webContents.focusCount;

    const secondSnapshot = controller.updateHostBounds(shell.shellId, { x: 5, y: 10, width: 320, height: 480 });

    expect(secondSnapshot).toEqual(firstSnapshot);
    expect(shell.sendCount).toBe(sendCountAfterFirstBounds);
    expect(views[0]!.webContents.focusCount).toBe(focusCountAfterFirstBounds);
  });

  it("activates popup-created sessions in the same shell as the opener and allows closing them", async () => {
    const views: FakeWebContentsView[] = [];
    const manager = new BrowserTabManager({
      viewFactory: {
        createBrowserView: (options?: { webContents?: FakeWebContents | null }) => {
          const view = new FakeWebContentsView(options?.webContents ?? undefined);
          views.push(view);
          return view as any;
        },
      } as any,
      screenshotWriter: {
        write: async () => "/tmp/browser.png",
      } as any,
    });
    const controller = new BrowserShellController(manager);
    const shell = new FakeShellWindow(107);
    controller.registerShell(shell as any);

    const openPromise = manager.openSession({ url: "https://x.com", wait_until: "load" });
    await Promise.resolve();
    views[0]!.webContents.finishLoad("https://x.com/");
    const opener = await openPromise;

    controller.focusSession(shell.shellId, opener.tab_id);
    controller.updateHostBounds(shell.shellId, { x: 0, y: 0, width: 300, height: 400 });

    const popupResponse = views[0]!.webContents.openWindow(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    expect(popupResponse.action).toBe("allow");
    expect(views).toHaveLength(2);
    expect(shell.attachedView).toBe(views[1]);
    expect(views[1]!.webContents.focusCount).toBe(1);

    const snapshot = controller.getSnapshot(shell.shellId);
    expect(snapshot.sessions).toHaveLength(2);
    expect(snapshot.activeTabId).not.toBe(opener.tab_id);
    expect(manager.getSessionLeaseOwner(snapshot.activeTabId!)).toBe(shell.shellId);

    const closedSnapshot = await controller.closeSession(
      shell.shellId,
      snapshot.activeTabId!,
    );
    expect(closedSnapshot).toEqual({
      activeTabId: opener.tab_id,
      sessions: [
        {
          tab_id: opener.tab_id,
          title: "Browser",
          url: "https://x.com/",
        },
      ],
    });
  });
});
