import { describe, expect, it } from "vitest";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { buildTeamRunConfigFromExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-348 (contract §1, §2, §6; D-2): the pending switch is stored on the record that holds a member's binding and
 * read back exactly. A delegated run is its own run (autobyteus-461): its agent's switch is on its own run_metadata.json or
 * its own team file, as for any run.
 */
const pending = {
  switchId: "7c1e5a52-3c1e-4c8a-9d0b-1f2a3b4c5d6e",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, platformAgentRunId: "sess-1" },
};

describe("a configured member of a Team or Org run", () => {
  it("keeps the pending switch through the Team tree, and the config built from it", () => {
    const switched = testAgentNode("/reviewer", {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", platformAgentRunId: null, pendingRuntimeSwitch: pending,
    });
    const tree = testExecutionTree({ children: [testAgentNode("/lead"), switched], coordinatorAddress: "/lead" });
    const member = tree.rootTeam.members.find((candidate) => candidate.agentRunId === switched.agentRunId)!;
    expect(member.pendingRuntimeSwitch).toEqual(pending);
    expect(validateTeamRunExecutionTreePayload(JSON.parse(JSON.stringify(tree)), tree.rootTeam.teamRunId)).toEqual(tree);
    const config = buildTeamRunConfigFromExecutionTree(tree);
    expect(config.rootTeam.children.find((child) => child.agentRunId === switched.agentRunId)?.pendingRuntimeSwitch).toEqual(pending);
    expect(config.rootTeam.children.find((child) => child.agentRunId !== switched.agentRunId)?.pendingRuntimeSwitch).toBeUndefined();
  });

  it("is refused when its pending switch is malformed (that run only)", () => {
    const tree = testExecutionTree({ children: [testAgentNode("/lead")], coordinatorAddress: "/lead" });
    const raw = JSON.parse(JSON.stringify(tree));
    raw.rootTeam.members[0].pendingRuntimeSwitch = { switchId: "x" };
    expect(() => validateTeamRunExecutionTreePayload(raw, tree.rootTeam.teamRunId)).toThrow();
  });
});
