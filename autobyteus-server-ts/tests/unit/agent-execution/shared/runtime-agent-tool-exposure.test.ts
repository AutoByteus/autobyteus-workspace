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
      "search_memory",
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
        "search_memory",
      ]),
    );
  });

  it("does not expose removed legacy task tools, including submit/review task results, as task delegation tools", () => {
    const exposure = buildRuntimeAgentToolExposure([
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

    expect(exposure.requestedToolNames).toEqual(["publish_artifact", "search_memory"]);
    expect(exposure.publishArtifactsEnabled).toBe(false);
  });

  it("exposes only the plural publication flag for mixed old/new configs", () => {
    const exposure = buildRuntimeAgentToolExposure(["publish_artifacts", "publish_artifact"]);

    expect(exposure.requestedToolNames).toEqual(["publish_artifacts", "publish_artifact", "search_memory"]);
    expect(exposure.publishArtifactsEnabled).toBe(true);
  });

  it("adds no Task tool to an agent without a member context (no delegate_task either)", () => {
    const exposure = resolveRuntimeAgentToolExposure({ toolNames: ["run_bash"] }, null);
    expect(exposure.requestedToolNames).toEqual(["run_bash", "search_memory"]);
    expect(exposure.enabledProjectTaskToolNames).toEqual([]);
  });

  it("resolves a missing agent definition to an exposure with only the platform-given tools", () => {
    expect(resolveRuntimeAgentToolExposure(null)).toEqual({
      requestedToolNames: ["search_memory"],
      enabledBrowserToolNames: [],
      enabledMediaToolNames: [],
      enabledTaskDelegationToolNames: [],
      enabledProjectTaskToolNames: [],
      sendMessageToEnabled: false,
      getHandoffRulesEnabled: false,
      publishArtifactsEnabled: false,
      listAvailableAgentsEnabled: false,
      listPeerNodesEnabled: false,
      listRunningAgentsEnabled: false,
    });
  });

  it("deduplicates configured names and automatically adds the four Team runtime tools", () => {
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
      "search_memory",
    ]);
    expect(exposure.enabledTaskDelegationToolNames).toEqual(["delegate_task"]);
    // REQ-004: no task tool is automatic, even where delegate_task is.
    expect(exposure.enabledProjectTaskToolNames).toEqual([]);
    expect(exposure.sendMessageToEnabled).toBe(true);
    expect(exposure.getHandoffRulesEnabled).toBe(true);
  });

  it("gives a member that belongs to no Team send_message_to, delegate_task, no task tool and not get_handoff_rules", () => {
    const host = new MemberExecutionContext({ ...memberExecutionContext, teamScoped: false, collaborationRole: "standalone_agent", inOrganization: false });
    expect(automaticCollaborationToolNames(host)).toEqual(["send_message_to", "delegate_task"]);
    const exposure = resolveRuntimeAgentToolExposure({ toolNames: ["delegate_task", "run_bash"] }, host);
    expect(exposure.requestedToolNames).toEqual(["delegate_task", "run_bash", "send_message_to", "search_memory"]);
    expect(exposure.enabledProjectTaskToolNames).toEqual([]);
    expect(exposure.getHandoffRulesEnabled).toBe(false);
    expect(exposure.sendMessageToEnabled).toBe(true);
    expect(automaticCollaborationToolNames(null)).toEqual([]);
  });

  describe("platform-given search_memory (autobyteus-496 AC-001)", () => {
    it("gives search_memory to a definition that does not list it", () => {
      const exposure = resolveRuntimeAgentToolExposure({ toolNames: ["run_bash"] }, null);
      expect(exposure.requestedToolNames).toEqual(["run_bash", "search_memory"]);
      expect(toRuntimeAgentToolNameSet(exposure).has("search_memory")).toBe(true);
    });

    it("gives it exactly once to a definition that lists it, in the configured position", () => {
      const exposure = resolveRuntimeAgentToolExposure({ toolNames: ["search_memory", " search_memory ", "run_bash"] }, null);
      expect(exposure.requestedToolNames).toEqual(["search_memory", "run_bash"]);
    });

    it("gives it to a definition with no tools and to a missing definition", () => {
      expect(resolveRuntimeAgentToolExposure({ toolNames: [] }, null).requestedToolNames).toEqual(["search_memory"]);
      expect(resolveRuntimeAgentToolExposure(null).requestedToolNames).toEqual(["search_memory"]);
    });

    it("keeps a member's automatic collaboration tools and adds search_memory after them", () => {
      const exposure = resolveRuntimeAgentToolExposure({ toolNames: ["run_bash"] }, memberExecutionContext);
      expect(exposure.requestedToolNames).toEqual([
        "run_bash",
        "get_handoff_rules",
        "send_message_to",
        "delegate_task",
        "search_memory",
      ]);
    });
  });
});
