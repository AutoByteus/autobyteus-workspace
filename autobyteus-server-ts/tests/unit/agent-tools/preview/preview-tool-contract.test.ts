import { describe, expect, it } from "vitest";
import {
  PreviewToolError,
} from "../../../../src/agent-tools/preview/preview-tool-contract.js";
import {
  toPreviewErrorPayload,
} from "../../../../src/agent-tools/preview/preview-tool-serialization.js";

describe("preview-tool-contract", () => {
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
