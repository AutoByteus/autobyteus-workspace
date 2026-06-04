import { describe, expect, it } from "vitest";
import { resolveAutoByteusStandaloneToolNames } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.js";
import { TeamBackendKind } from "../../../../../src/agent-team-execution/domain/team-backend-kind.js";

const mixedMemberTeamContext = {
  teamBackendKind: TeamBackendKind.MIXED,
};

describe("autobyteus mixed tool exposure", () => {
  it("filters removed local task-plan tools while allowing server-owned task delegation tools", () => {
    expect(
      resolveAutoByteusStandaloneToolNames({
        toolNames: [
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
          "read_file",
        ],
        memberTeamContext: mixedMemberTeamContext as any,
      }),
    ).toEqual([
      "delegate_tasks",
      "mark_task_completed",
      "mark_task_failed",
      "accept_task",
      "read_file",
    ]);
  });
});
