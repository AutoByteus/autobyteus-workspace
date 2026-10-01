import { describe, expect, it } from "vitest";
import {
  automaticCollaborationToolNames,
  buildRuntimeAgentToolExposure,
  resolveRuntimeAgentToolExposure,
  toRuntimeAgentToolNameSet,
} from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";
import { MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";

const memberExecutionContext = testMemberExecutionContext({
  teamRunId: "team-run",
  rootTeamRunId: "team-run",
  teamDefinitionId: "team-def",
  memberAddress: "/worker",
  agentRunId: "run-worker",
});

describe("runtime-agent-tool-exposure", () => {
  it("normalizes configured tool names once and derives optional plural tool exposure", () => {
    const exposure = buildRuntimeAgentToolExposure([
      " open_tab ",
      "read_page",
      "generate_image",
      "delegate_task",
      "submit_task_result",
      "review_task_result",
      "send_message_to",
      " publish_artifacts ",
      "",
      "   ",
      null,
    ]);

    expect(exposure.requestedToolNames).toEqual([
      "open_tab",
      "read_page",
      "generate_image",
      "delegate_task",
      "submit_task_result",
      "review_task_result",
      "send_message_to",
      "publish_artifacts",
    ]);
    expect(exposure.enabledBrowserToolNames).toEqual(["open_tab", "read_page"]);
    expect(exposure.enabledMediaToolNames).toEqual(["generate_image"]);
    expect(exposure.enabledTaskDelegationToolNames).toEqual(["delegate_task"]);
    expect(exposure.sendMessageToEnabled).toBe(true);
    expect(exposure.getHandoffRulesEnabled).toBe(false);
    expect(exposure.publishArtifactsEnabled).toBe(true);
    expect(toRuntimeAgentToolNameSet(exposure)).toEqual(
      new Set([
        "open_tab",
        "read_page",
        "generate_image",
        "delegate_task",
        "submit_task_result",
        "review_task_result",
        "send_message_to",
        "publish_artifacts",
      ]),
    );
  });

  it("does not expose removed legacy task tools, including submit/review task results, as task delegation tools", () => {
    const exposure = buildRuntimeAgentToolExposure([
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

    expect(exposure.enabledTaskDelegationToolNames).toEqual(["delegate_task"]);
  });

  it("does not expose artifact publication for old singular-only configs", () => {
    const exposure = buildRuntimeAgentToolExposure(["publish_artifact"]);

    expect(exposure.requestedToolNames).toEqual(["publish_artifact"]);
    expect(exposure.publishArtifactsEnabled).toBe(false);
  });

  it("exposes only the plural publication flag for mixed old/new configs", () => {
    const exposure = buildRuntimeAgentToolExposure(["publish_artifacts", "publish_artifact"]);

    expect(exposure.requestedToolNames).toEqual(["publish_artifacts", "publish_artifact"]);
    expect(exposure.publishArtifactsEnabled).toBe(true);
  });

  it("resolves missing agent definitions to an empty exposure", () => {
    expect(resolveRuntimeAgentToolExposure(null)).toEqual({
      requestedToolNames: [],
      enabledBrowserToolNames: [],
      enabledMediaToolNames: [],
      enabledTaskDelegationToolNames: [],
      sendMessageToEnabled: false,
      getHandoffRulesEnabled: false,
      publishArtifactsEnabled: false,
      listAvailableAgentsEnabled: false,
    });
  });

  it("deduplicates configured names and automatically adds the three Team runtime tools", () => {
    const exposure = resolveRuntimeAgentToolExposure(
      { toolNames: [" run_bash ", "run_bash", "send_message_to"] },
      memberExecutionContext,
    );

    expect(automaticCollaborationToolNames(memberExecutionContext)).toEqual([
      "get_handoff_rules",
      "send_message_to",
      "delegate_task",
    ]);
    expect(exposure.requestedToolNames).toEqual([
      "run_bash",
      "send_message_to",
      "get_handoff_rules",
      "delegate_task",
    ]);
    expect(exposure.enabledTaskDelegationToolNames).toEqual(["delegate_task"]);
    expect(exposure.sendMessageToEnabled).toBe(true);
    expect(exposure.getHandoffRulesEnabled).toBe(true);
  });

  it("gives a member that belongs to no Team send_message_to and delegate_task but not get_handoff_rules", () => {
    const host = new MemberExecutionContext({ ...memberExecutionContext, teamScoped: false });
    expect(automaticCollaborationToolNames(host)).toEqual(["send_message_to", "delegate_task"]);
    const exposure = resolveRuntimeAgentToolExposure({ toolNames: ["delegate_task", "run_bash"] }, host);
    expect(exposure.requestedToolNames).toEqual(["delegate_task", "run_bash", "send_message_to"]);
    expect(exposure.getHandoffRulesEnabled).toBe(false);
    expect(exposure.sendMessageToEnabled).toBe(true);
    expect(automaticCollaborationToolNames(null)).toEqual([]);
  });
});
