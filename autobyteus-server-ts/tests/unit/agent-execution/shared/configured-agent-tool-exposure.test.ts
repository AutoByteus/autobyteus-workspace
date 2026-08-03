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
      "generate_image",
      "delegate_task",
      "submit_task_result",
      "review_task_result",
      "send_message_to",
      "get_handoff_rules",
      " publish_artifacts ",
      "",
      "   ",
      null,
    ]);

    expect(exposure.configuredToolNames).toEqual([
      "open_tab",
      "read_page",
      "generate_image",
      "delegate_task",
      "submit_task_result",
      "review_task_result",
      "send_message_to",
      "get_handoff_rules",
      "publish_artifacts",
    ]);
    expect(exposure.enabledBrowserToolNames).toEqual(["open_tab", "read_page"]);
    expect(exposure.enabledMediaToolNames).toEqual(["generate_image"]);
    expect(exposure.enabledTaskDelegationToolNames).toEqual([
      "delegate_task",
      "submit_task_result",
      "review_task_result",
    ]);
    expect(exposure.sendMessageToConfigured).toBe(true);
    expect(exposure.getHandoffRulesConfigured).toBe(true);
    expect(exposure.publishArtifactsConfigured).toBe(true);
    expect(toConfiguredAgentToolNameSet(exposure)).toEqual(
      new Set([
        "open_tab",
        "read_page",
        "generate_image",
        "delegate_task",
        "submit_task_result",
        "review_task_result",
        "send_message_to",
        "get_handoff_rules",
        "publish_artifacts",
      ]),
    );
  });

  it("does not expose removed legacy task tools as task delegation tools", () => {
    const exposure = buildConfiguredAgentToolExposure([
      "create_task",
      "create_tasks",
      "get_my_tasks",
      "get_task_plan_status",
      "assign_task_to",
      "update_task_status",
      "delegate_task",
      "submit_task_result",
      "review_task_result",
      ["mark", "task", "completed"].join("_"),
      ["mark", "task", "failed"].join("_"),
      ["accept", "task"].join("_"),
    ]);

    expect(exposure.enabledTaskDelegationToolNames).toEqual([
      "delegate_task",
      "submit_task_result",
      "review_task_result",
    ]);
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
      enabledMediaToolNames: [],
      enabledTaskDelegationToolNames: [],
      sendMessageToConfigured: false,
      getHandoffRulesConfigured: false,
      publishArtifactsConfigured: false,
    });
  });
});
