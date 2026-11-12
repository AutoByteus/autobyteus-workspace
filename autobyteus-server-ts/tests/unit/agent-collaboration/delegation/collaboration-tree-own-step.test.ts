import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { assertAgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { TeamExecutionIndex } from "../../../../src/agent-team-execution/services/team-execution-index.js";
import { buildInitialTeamRunExecutionTree } from "../../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { RunOwnAgentsReader } from "../../../../src/run-history/store/run-own-agents-reader.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testTeamRunConfig } from "../../../fixtures/current-team-run-fixtures.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-461 SR-060 (ARCH-REV-035): a run's collaboration tree reads steps 1 and 3 from the run's own file, the file
 * a loaded root's own index is built from; for a team run and an org run, the map and the loaded root's index
 * (`getMessagePlacement`, and `memberOfInstance` inside a mounted team) give the same receiver for every address.
 */
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const treeOver = async (memoryDir: string) => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, new RunOwnAgentsReader(memoryDir));
  tree.build();
  return tree;
};

describe("a run's map and its loaded root agree on its own addresses", () => {
  it("a team run", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "map-own-step-")); directories.push(memoryDir);
    const config = testTeamRunConfig({ rootTeamRunId: "se", rootTeamDefinitionId: "se-team", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-run" }), testAgentNode("/reviewer", { agentRunId: "reviewer-run" })] });
    const file = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "SE" });
    await new TeamRunExecutionTreeStore().write(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: "se", ancestorTeamRunIds: [] }), file);
    const index = new TeamExecutionIndex(file);
    const map = (await treeOver(memoryDir)).collaborationTreeOf({ rootSubjectKind: "agent_team", rootRunId: "se" });
    for (const address of ["/lead", "/reviewer", "/nobody"]) {
      await expect(map.ownReceiverOf(address), address).resolves.toBe(index.getMessagePlacement(address)?.receiver.agentRunId ?? null);
    }
  });

  it("an org run: its direct agents, a mounted team by its coordinator, and the team's members", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "map-own-step-")); directories.push(memoryDir);
    const lead = testOrgAgentNode("/squad/lead", "squad-lead");
    const writer = testOrgAgentNode("/squad/writer", "squad-writer");
    const file = testAgentOrgExecutionTree({ orgRunId: "org", members: [
      testOrgAgentNode("/director", "director"),
      testOrgTeamNode({ address: "/squad", teamRunId: "squad-team", coordinatorAddress: lead.address, members: [lead, writer] }),
    ] });
    await new AgentOrgRunExecutionTreeStore().write(new AgentMemoryLayout(memoryDir).getOrgDirPath("org"), file);
    const index = new AgentOrgExecutionIndex(file);
    const map = (await treeOver(memoryDir)).collaborationTreeOf({ rootSubjectKind: "agent_org", rootRunId: "org" });
    const fromIndex = (address: string) => (index.getMessagePlacement(address)
      ?? index.memberOfInstance("squad-team", assertAgentTeamAddress(address)))?.receiver.agentRunId ?? null;
    for (const address of ["/director", "/squad", "/squad/lead", "/squad/writer", "/nobody"]) {
      await expect(map.ownReceiverOf(address), address).resolves.toBe(fromIndex(address));
    }
  });
});
