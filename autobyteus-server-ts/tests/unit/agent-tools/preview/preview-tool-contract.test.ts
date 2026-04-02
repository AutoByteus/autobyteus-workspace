import { describe, expect, it } from "vitest";
import {
  PreviewReadPageCleaningMode,
  PreviewToolError,
} from "../../../../src/agent-tools/preview/preview-tool-contract.js";
import {
  assertOpenPreviewSemantics,
  assertPreviewDomSnapshotSemantics,
  parseOpenPreviewInput,
  parseReadPreviewPageInput,
} from "../../../../src/agent-tools/preview/preview-tool-input-normalizers.js";
import {
  toPreviewErrorPayload,
} from "../../../../src/agent-tools/preview/preview-tool-serialization.js";

describe("preview-tool-contract", () => {
  it("parses open_preview inputs with canonical snake_case fields only", () => {
    const parsed = parseOpenPreviewInput({
      url: "http://localhost:3000/demo ",
      title: " Demo ",
      reuse_existing: "true",
      wait_until: "domcontentloaded",
    });

    expect(parsed).toEqual({
      url: "http://localhost:3000/demo ",
      title: "Demo",
      reuse_existing: true,
      wait_until: "domcontentloaded",
    });
  });

  it("rejects open_preview compatibility aliases", () => {
    expect(() =>
      parseOpenPreviewInput({
        url: "http://localhost:3000/demo",
        window_title: "Demo",
      }),
    ).toThrowError(/does not accept 'window_title'/);
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

  it("parses read_preview_page inputs with canonical snake_case fields only", () => {
    const parsed = parseReadPreviewPageInput({
      preview_session_id: "preview-session-1",
      cleaning_mode: "light",
    });

    expect(parsed).toEqual({
      preview_session_id: "preview-session-1",
      cleaning_mode: "light" satisfies PreviewReadPageCleaningMode,
    });
  });

  it("rejects read_preview_page compatibility aliases", () => {
    expect(() =>
      parseReadPreviewPageInput({
        preview_session_id: "preview-session-1",
        cleaningMode: "light",
      }),
    ).toThrowError(/does not accept 'cleaningMode'/);
  });

  it("rejects invalid dom snapshot max_elements values", () => {
    expect(() =>
      assertPreviewDomSnapshotSemantics({
        preview_session_id: "preview-session-1",
        max_elements: 0,
      }),
    ).toThrowError(/max_elements to be between 1 and 2000/);
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
