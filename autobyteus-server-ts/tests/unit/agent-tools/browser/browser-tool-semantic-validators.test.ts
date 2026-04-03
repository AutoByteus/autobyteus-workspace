import { describe, expect, it } from "vitest";
import { BrowserToolError } from "../../../../src/agent-tools/browser/browser-tool-contract.js";
import {
  assertOpenTabSemantics,
  assertDomSnapshotSemantics,
} from "../../../../src/agent-tools/browser/browser-tool-semantic-validators.js";

describe("browser-tool-semantic-validators", () => {
  it("rejects invalid browser URLs", () => {
    expect(() =>
      assertOpenTabSemantics({
        url: "/relative-path",
        wait_until: "load",
      }),
    ).toThrowError(BrowserToolError);

    expect(() =>
      assertOpenTabSemantics({
        url: "ftp://example.com/demo",
        wait_until: "load",
      }),
    ).toThrowError(/does not support/);
  });

  it("rejects invalid dom snapshot max_elements values", () => {
    expect(() =>
      assertDomSnapshotSemantics({
        tab_id: "browser-session-1",
        max_elements: 0,
      }),
    ).toThrowError(/max_elements to be between 1 and 2000/);
  });
});
