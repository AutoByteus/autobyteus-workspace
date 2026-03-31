import { describe, expect, it } from "vitest";
import {
  PreviewToolError,
  assertGetPreviewConsoleLogsSemantics,
  assertOpenPreviewSemantics,
  parseGetPreviewConsoleLogsInput,
  parseOpenPreviewInput,
  toPreviewErrorPayload,
} from "../../../../src/agent-tools/preview/preview-tool-contract.js";

describe("preview-tool-contract", () => {
  it("parses open_preview inputs with aliases and defaults", () => {
    const parsed = parseOpenPreviewInput({
      url: "http://localhost:3000/demo ",
      window_title: " Demo ",
      reuseExisting: "true",
      waitUntil: "domcontentloaded",
    });

    expect(parsed).toEqual({
      url: "http://localhost:3000/demo ",
      title: "Demo",
      reuse_existing: true,
      wait_until: "domcontentloaded",
    });
  });

  it("rejects invalid preview URLs", () => {
    expect(() =>
      assertOpenPreviewSemantics({
        url: "/relative-path",
        wait_until: "load",
      }),
    ).toThrowError(PreviewToolError);

    expect(() =>
      assertOpenPreviewSemantics({
        url: "ftp://example.com/demo",
        wait_until: "load",
      }),
    ).toThrowError(/does not support/);
  });

  it("rejects negative console-log sequence cursors", () => {
    const parsed = parseGetPreviewConsoleLogsInput({
      preview_session_id: "preview-session-1",
      sinceSequence: "-1",
    });

    expect(parsed.since_sequence).toBe(-1);
    expect(() => assertGetPreviewConsoleLogsSemantics(parsed)).toThrowError(
      /since_sequence to be zero or greater/,
    );
  });

  it("normalizes preview errors into the canonical payload", () => {
    const payload = toPreviewErrorPayload(
      new PreviewToolError("preview_bridge_unavailable", "bridge offline"),
    );

    expect(payload).toEqual({
      error: {
        code: "preview_bridge_unavailable",
        message: "bridge offline",
      },
    });
  });
});
