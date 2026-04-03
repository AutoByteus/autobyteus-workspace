import { describe, expect, it } from "vitest";
import {
  buildConfiguredAgentToolExposure,
  resolveConfiguredAgentToolExposure,
  toConfiguredAgentToolNameSet,
} from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";

describe("configured-agent-tool-exposure", () => {
  it("normalizes configured tool names once and derives optional tool exposure", () => {
    const exposure = buildConfiguredAgentToolExposure([
      " open_tab ",
      "read_page",
      "send_message_to",
      "",
      "   ",
      null,
    ]);

    expect(exposure.configuredToolNames).toEqual([
      "open_tab",
      "read_page",
      "send_message_to",
    ]);
    expect(exposure.enabledBrowserToolNames).toEqual(["open_tab", "read_page"]);
    expect(exposure.sendMessageToConfigured).toBe(true);
    expect(toConfiguredAgentToolNameSet(exposure)).toEqual(
      new Set(["open_tab", "read_page", "send_message_to"]),
    );
  });

  it("resolves missing agent definitions to an empty exposure", () => {
    expect(resolveConfiguredAgentToolExposure(null)).toEqual({
      configuredToolNames: [],
      enabledBrowserToolNames: [],
      sendMessageToConfigured: false,
    });
  });
});
