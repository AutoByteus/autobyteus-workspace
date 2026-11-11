import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { buildInitialTeamRunExecutionTree, buildTeamRunConfigFromExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testTeamRunConfig } from "../../../fixtures/current-team-run-fixtures.js";
import { openEveryOwnFileUnder } from "../../../fixtures/open-delegated-run-sources.js";

/**
 * autobyteus-461 (contract §3.3; SR-038): a delegated team member's launch source is recorded on the member, kept by its
 * own file, and read back when the run's config is rebuilt (a restore); a member without one stays without one.
 */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});

describe("a team member's launch source", () => {
  it("goes from the run's config into its own file and back", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "member-launch-source-"));
    roots.push(memory);
    openEveryOwnFileUnder(memory);
    const routed = { origin: "model_router" as const, fallbacks: [], choiceReason: "Careful review.", taskKind: "review" };
    const lead = { ...testAgentNode("/lead", { agentRunId: "lead_1" }), launchSource: routed };
    const config = testTeamRunConfig({ rootTeamRunId: "team_b", coordinatorAddress: "/lead", children: [lead, testAgentNode("/writer", { agentRunId: "writer_1" })] });
    const tree = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Product Team" });
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team_b", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(dir, tree);
    const read = (await new TeamRunExecutionTreeStore().read(dir, "team_b"))!;
    expect(read.rootTeam.members.map((member) => member.launchSource ?? null)).toEqual([routed, null]);
    const rebuilt = buildTeamRunConfigFromExecutionTree(read);
    expect(rebuilt.rootTeam.children.map((child) => child.launchSource ?? null)).toEqual([routed, null]);
  });
});
