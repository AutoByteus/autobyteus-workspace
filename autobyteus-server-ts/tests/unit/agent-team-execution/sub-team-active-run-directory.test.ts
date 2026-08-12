import { describe, expect, it } from "vitest";
import type { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { SubTeamActiveRunDirectory } from "../../../src/agent-team-execution/services/sub-team-active-run-directory.js";

const buildRun = (teamRunId: string, active = true): TeamRun => ({
  teamRunId,
  isActive: () => active,
} as TeamRun);

describe("SubTeamActiveRunDirectory", () => {
  it("binds and resolves an active persistent or restored child TeamRun", () => {
    const directory = new SubTeamActiveRunDirectory();
    const run = buildRun("child-team-run");

    directory.bind(run);

    expect(directory.resolveActiveRun(" child-team-run ")).toBe(run);
  });

  it("removes stale inactive bindings on lookup", () => {
    const directory = new SubTeamActiveRunDirectory();
    const run = buildRun("inactive-child", false);

    directory.bind(run);

    expect(directory.resolveActiveRun("inactive-child")).toBeNull();
    expect(directory.resolveActiveRun("inactive-child")).toBeNull();
  });

  it("unbinds on child disposal and permits a later restored run with the same identity", () => {
    const directory = new SubTeamActiveRunDirectory();
    const first = buildRun("child-team-run");
    const restored = buildRun("child-team-run");

    directory.bind(first);
    directory.unbind(first.teamRunId);
    expect(directory.resolveActiveRun(first.teamRunId)).toBeNull();

    directory.bind(restored);
    expect(directory.resolveActiveRun(restored.teamRunId)).toBe(restored);
  });

  it("clears every owned binding when the root manager is disposed", () => {
    const directory = new SubTeamActiveRunDirectory();
    directory.bind(buildRun("child-a"));
    directory.bind(buildRun("child-b"));

    directory.clear();

    expect(directory.resolveActiveRun("child-a")).toBeNull();
    expect(directory.resolveActiveRun("child-b")).toBeNull();
  });
});
