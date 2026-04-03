import { beforeEach, describe, expect, it, vi } from "vitest";

const createdViews: Array<{
  options: Record<string, unknown>;
  bounds: { x: number; y: number; width: number; height: number } | null;
}> = [];

vi.mock("electron", () => {
  return {
    WebContentsView: class MockWebContentsView {
      readonly webContents = {};
      constructor(public readonly options: Record<string, unknown>) {
        createdViews.push({
          options,
          bounds: null,
        });
      }

      setBounds(bounds: { x: number; y: number; width: number; height: number }): void {
        createdViews[createdViews.length - 1]!.bounds = { ...bounds };
      }
    },
  };
});

import {
  DEFAULT_BROWSER_VIEW_BOUNDS,
  BrowserViewFactory,
} from "../browser-view-factory";

describe("BrowserViewFactory", () => {
  beforeEach(() => {
    createdViews.length = 0;
  });

  it("creates browser views on the default Electron session profile", () => {
    const factory = new BrowserViewFactory();

    factory.createBrowserView();
    factory.createBrowserView();

    expect(createdViews).toHaveLength(2);
    for (const view of createdViews) {
      expect(view.options).toMatchObject({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });
      expect((view.options.webPreferences as Record<string, unknown>).partition).toBeUndefined();
      expect((view.options.webPreferences as Record<string, unknown>).session).toBeUndefined();
      expect(view.bounds).toEqual(DEFAULT_BROWSER_VIEW_BOUNDS);
    }
  });

  it("adopts Electron-provided popup webContents when requested", () => {
    const factory = new BrowserViewFactory();
    const popupWebContents = { id: "popup-web-contents" };

    factory.createBrowserView({ webContents: popupWebContents as any });

    expect(createdViews).toHaveLength(1);
    expect(createdViews[0]!.options.webContents).toBe(popupWebContents);
    expect(createdViews[0]!.options).toMatchObject({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
  });
});
