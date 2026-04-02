import { describe, expect, it } from "vitest";
import { PreviewToolError } from "../../../../src/agent-tools/preview/preview-tool-contract.js";
import {
  assertOpenPreviewSemantics,
  assertPreviewDomSnapshotSemantics,
} from "../../../../src/agent-tools/preview/preview-tool-semantic-validators.js";

describe("preview-tool-semantic-validators", () => {
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

  it("rejects invalid dom snapshot max_elements values", () => {
    expect(() =>
      assertPreviewDomSnapshotSemantics({
        preview_session_id: "preview-session-1",
        max_elements: 0,
      }),
    ).toThrowError(/max_elements to be between 1 and 2000/);
  });
});
