import { describe, expect, it } from "vitest";
import {
  buildConfiguredAgentToolExposure,
  resolveConfiguredAgentToolExposure,
  toConfiguredAgentToolNameSet,
} from "../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";

describe("configured-agent-tool-exposure", () => {
  it("normalizes configured tool names once and derives optional plural tool exposure", () => {
    const exposure = buildConfiguredAgentToolExposure([
      " open_tab ",
      "read_page",
      "send_message_to",
      " publish_artifacts ",
      "",
      "   ",
      null,
    ]);

    expect(exposure.configuredToolNames).toEqual([
      "open_tab",
      "read_page",
      "send_message_to",
      "publish_artifacts",
    ]);
    expect(exposure.enabledBrowserToolNames).toEqual(["open_tab", "read_page"]);
    expect(exposure.sendMessageToConfigured).toBe(true);
    expect(exposure.publishArtifactsConfigured).toBe(true);
    expect(toConfiguredAgentToolNameSet(exposure)).toEqual(
      new Set(["open_tab", "read_page", "send_message_to", "publish_artifacts"]),
    );
  });

  it("does not expose artifact publication for old singular-only configs", () => {
    const exposure = buildConfiguredAgentToolExposure(["publish_artifact"]);

    expect(exposure.configuredToolNames).toEqual(["publish_artifact"]);
    expect(exposure.publishArtifactsConfigured).toBe(false);
  });

  it("exposes only the plural publication flag for mixed old/new configs", () => {
    const exposure = buildConfiguredAgentToolExposure(["publish_artifacts", "publish_artifact"]);

    expect(exposure.configuredToolNames).toEqual(["publish_artifacts", "publish_artifact"]);
    expect(exposure.publishArtifactsConfigured).toBe(true);
  });

  it("resolves missing agent definitions to an empty exposure", () => {
    expect(resolveConfiguredAgentToolExposure(null)).toEqual({
      configuredToolNames: [],
      enabledBrowserToolNames: [],
      sendMessageToConfigured: false,
      publishArtifactsConfigured: false,
    });
  });
});
