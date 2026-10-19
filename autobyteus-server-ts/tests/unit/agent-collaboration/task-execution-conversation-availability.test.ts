/**
 * The refusal of a shut-down delegated Agent/Team whose saved conversation cannot be used (REQ-005, AC-006):
 * the function's wording and warning, and the three root adapters (Team, AgentOrg, standalone Agent) that use it,
 * over the actual adapters of each root kind with a controlled conversation inspector.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const warn = vi.hoisted(() => vi.fn());
vi.mock("../../../src/logging/server-app-logger.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../src/logging/server-app-logger.js")>();
  return {
    ...original,
    createServerLogger: (name: string) => name === "agent-collaboration.task-execution"
      ? { warn } as never
      : original.createServerLogger(name),
  };
});

import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TaskDelegationError } from "../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { taskExecutionConversationUnavailable } from "../../../src/agent-collaboration/execution/task/task-execution-conversation-availability.js";
import { nestedReleaseScenario } from "../../fixtures/task-release-generation-fixtures.js";

afterEach(() => {
  vi.restoreAllMocks();
  warn.mockReset();
});

const root = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "root-1" });
const damaged = Object.freeze({ kind: "indeterminate" as const, error: new Error("line 120 of raw_traces_active.jsonl is damaged") });

describe("taskExecutionConversationUnavailable", () => {
  it("names the Team, its coordinator, the damaged line and a next step", () => {
    const error = taskExecutionConversationUnavailable({
      root, executionKind: "team", address: "/marketing_team",
      ingressMember: { address: "/marketing_team/marketing_content_creator", agentRunId: "coordinator-run" },
      activity: damaged,
    });

    expect(error).toBeInstanceOf(TaskDelegationError);
    expect(error.code).toBe("TASK_EXECUTION_CONTEXT_UNAVAILABLE");
    expect(error.message).toBe("The delegated Team at '/marketing_team' cannot be restored: the saved conversation of its "
      + "coordinator '/marketing_team/marketing_content_creator' cannot be read (line 120 of raw_traces_active.jsonl is damaged). "
      + "Its files were left unchanged. Start a new delegation for this work, or restore its saved conversation from a backup.");
    expect(error.message).not.toContain("indeterminate");
    expect(error.cause).toBe(damaged.error);
    expect(warn).toHaveBeenCalledWith("TASK_EXECUTION_CONVERSATION_UNAVAILABLE", expect.objectContaining({
      rootRunId: "root-1", address: "/marketing_team", memberAddress: "/marketing_team/marketing_content_creator",
      memberAgentRunId: "coordinator-run", activity: "indeterminate", reason: "line 120 of raw_traces_active.jsonl is damaged",
    }));
  });

  it("says a delegated Agent has no saved conversation to continue", () => {
    const error = taskExecutionConversationUnavailable({
      root, executionKind: "agent", address: "/helper",
      ingressMember: { address: "/helper", agentRunId: "helper-run" },
      activity: { kind: "none" },
    });
    expect(error.message).toBe("The delegated Agent at '/helper' cannot be restored: it has no saved conversation to continue. "
      + "Start a new delegation for this work.");
    expect(warn).toHaveBeenCalledWith("TASK_EXECUTION_CONVERSATION_UNAVAILABLE", expect.objectContaining({ activity: "none", reason: null }));
  });

  it("says which coordinator of a Team has no saved conversation", () => {
    const error = taskExecutionConversationUnavailable({
      root, executionKind: "team", address: "/t",
      ingressMember: { address: "/t/lead", agentRunId: "lead-run" },
      activity: { kind: "none" },
    });
    expect(error.message).toBe("The delegated Team at '/t' cannot be restored: its coordinator '/t/lead' has no saved conversation "
      + "to continue. Start a new delegation for this work.");
  });
});

describe.each(["agent_team", "agent_org", "agent"] as const)("%s root adapter refusal (AC-006)", (kind) => {
  const withInspector = async (inspect: (input: { agentRunId: string; memoryDir: string }) => unknown) => {
    const f = await nestedReleaseScenario(kind);
    // The adapter's controlled inspector: the scenario's copies are shut down, so restoring them asks it.
    (f.adapter as unknown as { options: { activityInspector: unknown } }).options.activityInspector = { inspect: vi.fn(inspect) };
    return f;
  };

  it("refuses a Team whose coordinator's log is damaged mid-file, naming the Team, coordinator, line and next step", async () => {
    const f = await withInspector(({ agentRunId }) => agentRunId === "A-lead" ? damaged : { kind: "present" });

    expect(() => f.adapter.assertRestorableChain("A-lead")).toThrow(expect.objectContaining({
      code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
      message: "The delegated Team at '/Workers' cannot be restored: the saved conversation of its coordinator '/Workers/Lead' "
        + "cannot be read (line 120 of raw_traces_active.jsonl is damaged). Its files were left unchanged. "
        + "Start a new delegation for this work, or restore its saved conversation from a backup.",
    }));
    expect(warn).toHaveBeenCalledWith("TASK_EXECUTION_CONVERSATION_UNAVAILABLE", expect.objectContaining({
      rootSubjectKind: kind, memberAddress: "/Workers/Lead", memberAgentRunId: "A-lead",
    }));
  });

  it("refuses a delegated Agent with a damaged log by its own address", async () => {
    const f = await withInspector(({ agentRunId }) => agentRunId === "A-child" ? damaged : { kind: "present" });

    expect(() => f.adapter.assertRestorableChain("A-child")).toThrow(
      "The delegated Agent at '/Workers/Child' cannot be restored: its saved conversation cannot be read "
      + "(line 120 of raw_traces_active.jsonl is damaged).",
    );
  });

  it("restores the chain when every shut-down entry has a saved conversation", async () => {
    const f = await withInspector(() => ({ kind: "present" }));
    expect(() => f.adapter.assertRestorableChain("A-child")).not.toThrow();
  });
});
