import { describe, expect, it } from "vitest";
import {
  BrowserToolError,
} from "../../../../src/agent-tools/browser/browser-tool-contract.js";
import {
  toBrowserToolErrorPayload,
} from "../../../../src/agent-tools/browser/browser-tool-serialization.js";

describe("browser-tool-contract", () => {
  it("normalizes browser errors into the canonical payload", () => {
    const payload = toBrowserToolErrorPayload(
      new BrowserToolError("browser_bridge_unavailable", "bridge offline"),
    );

    expect(payload).toEqual({
      error: {
        code: "browser_bridge_unavailable",
        message: "bridge offline",
      },
    });
  });
});
