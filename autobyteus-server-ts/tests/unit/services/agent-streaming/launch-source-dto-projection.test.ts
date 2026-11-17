import { describe, expect, it } from "vitest";
import { toDelegateTaskResult } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";
import { DelegateTaskResultSchema } from "../../../../src/agent-team-execution/task-delegation/task-delegation-result-contract.js";

/** REQ-008: delegate_task carries launch_notes (a tree row's launch and source: run-tree-records.test.ts). */
describe("delegate_task launch_notes", () => {
  it("serializes non-empty notes only, and the strict result schema accepts them", () => {
    const withNotes = toDelegateTaskResult({ delegated: true, delegatedRun: { kind: "team", teamRunId: "t", teamCoordinatorAgentRunId: "c" }, taskId: "x", launchNotes: ["ie: fell back"] });
    expect(withNotes).toEqual({ delegated: true, target_kind: "team", target_team_run_id: "t", target_team_coordinator_agent_run_id: "c", task_id: "x", launch_notes: ["ie: fell back"] });
    expect(DelegateTaskResultSchema.parse(withNotes)).toEqual(withNotes);
    const without = toDelegateTaskResult({ delegated: true, delegatedRun: { kind: "agent", agentRunId: "a" }, launchNotes: [] });
    expect(without).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: "a" });
    expect(() => DelegateTaskResultSchema.parse({ ...without, launch_notes: [] })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: false, message: "no", launch_notes: ["x"] })).toThrow();
  });
});
