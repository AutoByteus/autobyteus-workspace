import { describe, expect, it } from "vitest";
import type { PreviewReadPageCleaningMode } from "../../../../src/agent-tools/preview/preview-tool-contract.js";
import {
  parseOpenPreviewInput,
  parsePreviewDomSnapshotInput,
  parseReadPreviewPageInput,
} from "../../../../src/agent-tools/preview/preview-tool-input-parsers.js";

describe("preview-tool-input-parsers", () => {
  it("parses open_preview inputs with canonical snake_case fields only", () => {
    const parsed = parseOpenPreviewInput({
      url: "http://localhost:3000/demo ",
      title: " Demo ",
      reuse_existing: true,
      wait_until: "domcontentloaded",
    });

    expect(parsed).toEqual({
      url: "http://localhost:3000/demo ",
      title: "Demo",
      reuse_existing: true,
      wait_until: "domcontentloaded",
    });
  });

  it("rejects widened boolean compatibility for open_preview", () => {
    expect(() =>
      parseOpenPreviewInput({
        url: "http://localhost:3000/demo",
        reuse_existing: "true",
      }),
    ).toThrowError(/requires 'reuse_existing' to be a boolean/);
  });

  it("rejects open_preview compatibility aliases", () => {
    expect(() =>
      parseOpenPreviewInput({
        url: "http://localhost:3000/demo",
        window_title: "Demo",
      }),
    ).toThrowError(/does not accept 'window_title'/);
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

  it("rejects widened integer compatibility for preview_dom_snapshot", () => {
    expect(() =>
      parsePreviewDomSnapshotInput({
        preview_session_id: "preview-session-1",
        max_elements: "200",
      }),
    ).toThrowError(/requires 'max_elements' to be an integer/);
  });
});
