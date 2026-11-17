import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserTabPageOperations } from "../browser-tab-page-operations";

const image = (png: Buffer) => ({ toPNG: () => png });

const makeSession = (capturePage: ReturnType<typeof vi.fn>) => ({
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
    setBounds: vi.fn(),
    webContents: { capturePage },
  },
});

describe("BrowserTabPageOperations screenshot capture", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("captures once and leaves the tab alone when the first capture succeeds (AC-008)", async () => {
    const writer = { write: vi.fn().mockResolvedValue("/tmp/session-page-operations.png") };
    const operations = new BrowserTabPageOperations(writer as any);
    const session = makeSession(vi.fn().mockResolvedValue(image(Buffer.from("png-bytes"))));

    await expect(operations.captureScreenshot(session as any, false)).resolves.toEqual({
      tab_id: "session-page-operations",
      artifact_path: "/tmp/session-page-operations.png",
      mime_type: "image/png",
    });
    expect(session.view.webContents.capturePage).toHaveBeenCalledTimes(1);
    expect(session.view.setBounds).not.toHaveBeenCalled();
    expect(writer.write).toHaveBeenCalledWith(Buffer.from("png-bytes"), "session-page-operations");
  });

  it("nudges the view 1 px wider and back, then captures again, after a rejected or empty capture", async () => {
    vi.useFakeTimers();
    const writer = { write: vi.fn().mockResolvedValue("/tmp/session-page-operations.png") };
    const operations = new BrowserTabPageOperations(writer as any);
    const session = makeSession(
      vi.fn()
        .mockRejectedValueOnce(new Error("UnknownVizError"))
        .mockResolvedValueOnce(image(Buffer.alloc(0)))
        .mockResolvedValueOnce(image(Buffer.from("png-bytes"))),
    );

    const capture = operations.captureScreenshot(session as any, false);
    await vi.advanceTimersByTimeAsync(250);

    await expect(capture).resolves.toMatchObject({ artifact_path: "/tmp/session-page-operations.png" });
    expect(session.view.webContents.capturePage).toHaveBeenCalledTimes(3);
    const bounds = { x: 0, y: 0, width: 800, height: 600 };
    expect(session.view.setBounds.mock.calls).toEqual([
      [{ ...bounds, width: 801 }], [bounds],
      [{ ...bounds, width: 801 }], [bounds],
    ]);
    expect(session.viewportBounds).toEqual(bounds);
  });

  it.each([
    ["rejects", () => vi.fn().mockRejectedValue(new Error("UnknownVizError")), "UnknownVizError"],
    ["returns an empty image", () => vi.fn().mockResolvedValue(image(Buffer.alloc(0))), "empty image"],
  ])(
    "fails with browser_screenshot_failed and the reason within 2 s and writes no artifact when the capture keeps failing: %s (AC-006)",
    async (_label, makeCapturePage, reason) => {
      vi.useFakeTimers();
      const writer = { write: vi.fn() };
      const operations = new BrowserTabPageOperations(writer as any);
      const session = makeSession(makeCapturePage());
      const startedAt = Date.now();

      const capture = operations.captureScreenshot(session as any, false);
      const outcome = expect(capture).rejects.toMatchObject({
        name: "BrowserTabError",
        code: "browser_screenshot_failed",
        message: `The tab did not draw a frame to capture within 2 s (${reason}).`,
      });
      await vi.advanceTimersByTimeAsync(2100);
      await outcome;

      expect(Date.now() - startedAt).toBeLessThanOrEqual(2100);
      expect(session.view.webContents.capturePage.mock.calls.length).toBeGreaterThan(1);
      expect(writer.write).not.toHaveBeenCalled();
    },
  );
});
