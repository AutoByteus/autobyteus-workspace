import { describe, expect, it } from "vitest";
import type { BrowserReadPageCleaningMode } from "../../../../src/agent-tools/browser/browser-tool-contract.js";
import {
  parseOpenTabInput,
  parseDomSnapshotInput,
  parseReadPageInput,
} from "../../../../src/agent-tools/browser/browser-tool-input-parsers.js";

describe("browser-tool-input-parsers", () => {
  it("parses open_tab inputs with canonical snake_case fields only", () => {
    const parsed = parseOpenTabInput({
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

  it("rejects widened boolean compatibility for open_tab", () => {
    expect(() =>
      parseOpenTabInput({
        url: "http://localhost:3000/demo",
        reuse_existing: "true",
      }),
    ).toThrowError(/requires 'reuse_existing' to be a boolean/);
  });

  it("rejects open_tab compatibility aliases", () => {
    expect(() =>
      parseOpenTabInput({
        url: "http://localhost:3000/demo",
        window_title: "Demo",
      }),
    ).toThrowError(/does not accept 'window_title'/);
  });

  it("parses read_page inputs with canonical snake_case fields only", () => {
    const parsed = parseReadPageInput({
      tab_id: "browser-session-1",
      cleaning_mode: "light",
    });

    expect(parsed).toEqual({
      tab_id: "browser-session-1",
      cleaning_mode: "light" satisfies BrowserReadPageCleaningMode,
    });
  });

  it("rejects read_page compatibility aliases", () => {
    expect(() =>
      parseReadPageInput({
        tab_id: "browser-session-1",
        cleaningMode: "light",
      }),
    ).toThrowError(/does not accept 'cleaningMode'/);
  });

  it("rejects widened integer compatibility for dom_snapshot", () => {
    expect(() =>
      parseDomSnapshotInput({
        tab_id: "browser-session-1",
        max_elements: "200",
      }),
    ).toThrowError(/requires 'max_elements' to be an integer/);
  });
});
