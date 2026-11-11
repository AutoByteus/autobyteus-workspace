import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { RunOwnAgentsReader } from "../../../../src/run-history/store/run-own-agents-reader.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { openEveryOwnFileUnder } from "../../../fixtures/open-delegated-run-sources.js";

/** autobyteus-461 contract §2.6 (V-14, AR-014): a run's agents from its own parts, for `DelegationTree.runOfAgent`. */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});

describe("RunOwnAgentsReader", () => {
  it("a team run's members from its own file; a standalone run is its one agent; a missing run is null", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-agents-"));
    roots.push(memory);
    openEveryOwnFileUnder(memory);
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-b", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(dir, validateTeamRunExecutionTreePayload(testExecutionTree({ rootTeamRunId: "team-b", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-b" }), testAgentNode("/writer", { agentRunId: "writer-b" })] }), "team-b"));
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.agentRunIdsOf({ rootSubjectKind: "agent_team", rootRunId: "team-b" })).toEqual(["lead-b", "writer-b"]);
    expect(await reader.agentRunIdsOf({ rootSubjectKind: "agent", rootRunId: "manager" })).toEqual(["manager"]);
    expect(await reader.agentRunIdsOf({ rootSubjectKind: "agent_team", rootRunId: "gone" })).toBeNull();
    expect(await reader.agentRunIdsOf({ rootSubjectKind: "agent_org", rootRunId: "gone" })).toBeNull();
  });
});
