import { describe, expect, it, vi } from "vitest";
import { BrowserTabPageOperations } from "../browser-tab-page-operations";

const makeSession = (png: Buffer) => ({
  id: "session-page-operations",
  url: "https://example.test",
  title: "Example",
  customTitle: null,
  openerSessionId: null,
  leasedShellId: null,
  state: "open",
  openPromise: null,
  hostBounds: { x: 0, y: 0, width: 800, height: 600 },
  viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
  deviceEmulation: { mode: "desktop", profile: null },
  view: {
    webContents: {
      capturePage: vi.fn().mockResolvedValue({
        toPNG: () => png,
      }),
    },
  },
});

describe("BrowserTabPageOperations screenshot capture", () => {
  it("returns a typed failure and does not invoke the writer for empty capture bytes", async () => {
    const writer = { write: vi.fn() };
    const operations = new BrowserTabPageOperations(writer as any);

    await expect(operations.captureScreenshot(makeSession(Buffer.alloc(0)) as any, false))
      .rejects
      .toMatchObject({
        name: "BrowserTabError",
        code: "browser_screenshot_failed",
        message: "Browser screenshot produced no image bytes.",
      });
    expect(writer.write).not.toHaveBeenCalled();
  });

  it("preserves the artifact result contract for a non-empty capture", async () => {
    const writer = { write: vi.fn().mockResolvedValue("/tmp/session-page-operations.png") };
    const operations = new BrowserTabPageOperations(writer as any);

    await expect(operations.captureScreenshot(makeSession(Buffer.from("png-bytes")) as any, false))
      .resolves.toEqual({
        tab_id: "session-page-operations",
        artifact_path: "/tmp/session-page-operations.png",
        mime_type: "image/png",
      });
    expect(writer.write).toHaveBeenCalledWith(Buffer.from("png-bytes"), "session-page-operations");
  });
});
