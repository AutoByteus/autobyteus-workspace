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
      "delegate_tasks",
      "mark_task_completed",
      "mark_task_failed",
      "accept_task",
      "send_message_to",
      " publish_artifacts ",
      "",
      "   ",
      null,
    ]);

    expect(exposure.configuredToolNames).toEqual([
      "open_tab",
      "read_page",
      "generate_image",
      "delegate_tasks",
      "mark_task_completed",
      "mark_task_failed",
      "accept_task",
      "send_message_to",
      "publish_artifacts",
    ]);
    expect(exposure.enabledBrowserToolNames).toEqual(["open_tab", "read_page"]);
    expect(exposure.enabledMediaToolNames).toEqual(["generate_image"]);
    expect(exposure.enabledTaskDelegationToolNames).toEqual([
      "delegate_tasks",
      "mark_task_completed",
      "mark_task_failed",
      "accept_task",
    ]);
    expect(exposure.sendMessageToConfigured).toBe(true);
    expect(exposure.publishArtifactsConfigured).toBe(true);
    expect(toConfiguredAgentToolNameSet(exposure)).toEqual(
      new Set([
        "open_tab",
        "read_page",
        "generate_image",
        "delegate_tasks",
        "mark_task_completed",
        "mark_task_failed",
        "accept_task",
        "send_message_to",
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
      "delegate_tasks",
      "mark_task_completed",
      "mark_task_failed",
      "accept_task",
    ]);

    expect(exposure.enabledTaskDelegationToolNames).toEqual([
      "delegate_tasks",
      "mark_task_completed",
      "mark_task_failed",
      "accept_task",
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
      publishArtifactsConfigured: false,
    });
  });
});
