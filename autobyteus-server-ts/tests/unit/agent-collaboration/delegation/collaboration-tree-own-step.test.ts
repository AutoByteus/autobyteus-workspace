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
import { writeStoredOrgContainer } from "../../../helpers/stored-org-container.js";
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

  it("an Org container hosts no agent: no address is its own; each unit run answers its own (org-teams-follow-definition)", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "map-own-step-")); directories.push(memoryDir);
    await writeStoredOrgContainer(memoryDir, { orgRunId: "org", units: [{ kind: "agent", address: "/director", runId: "director" },
      { kind: "agent_team", address: "/squad", runId: "squad-team", coordinatorAddress: "/lead",
        members: [{ address: "/lead", agentRunId: "squad-lead" }, { address: "/writer", agentRunId: "squad-writer" }] }] });
    const tree = await treeOver(memoryDir);
    const org = tree.collaborationTreeOf({ rootSubjectKind: "agent_org", rootRunId: "org" });
    for (const address of ["/director", "/squad", "/squad/lead", "/squad/writer", "/nobody"]) await expect(org.ownReceiverOf(address), address).resolves.toBeNull();
    const squad = tree.collaborationTreeOf({ rootSubjectKind: "agent_team", rootRunId: "squad-team" });
    await expect(squad.ownReceiverOf("/lead")).resolves.toBe("squad-lead");
    await expect(squad.ownReceiverOf("/writer")).resolves.toBe("squad-writer");
  });
});
