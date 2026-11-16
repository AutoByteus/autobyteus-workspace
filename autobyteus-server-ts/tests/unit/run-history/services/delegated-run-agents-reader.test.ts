import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DelegatedRunAgentsReader } from "../../../../src/run-history/services/delegated-run-agents-reader.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { RunOwnAgentsReader } from "../../../../src/run-history/store/run-own-agents-reader.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-461 (REQ-009 token roll-up; the Team tab's past participants): the runs delegated from a run, open and
 * closed, from the Task entries; each run's agents and addresses from its own file.
 */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const E: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "eng" };

const world = async () => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-runs-")); roots.push(memory);
 
  await new AgentRunMetadataStore(memory).writeMetadata("image", { runId: "image", agentDefinitionId: "image-maker", address: "/image_maker",
    workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "image"), llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true,
    runtimeKind: "autobyteus", platformAgentRunId: null } as never);
  await new TeamRunExecutionTreeStore().write(new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "eng", ancestorTeamRunIds: [] }),
    validateTeamRunExecutionTreePayload(testExecutionTree({ rootTeamRunId: "eng", coordinatorAddress: "/designer",
      children: [testAgentNode("/designer", { agentRunId: "designer" }), testAgentNode("/coder", { agentRunId: "coder" })] }), "eng"));
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, new RunOwnAgentsReader(memory));
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "designer" });
  await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/image_maker", delegatedFrom: { delegatingRun: E, delegatorAgentRunId: "designer" }, execution: { agentRunId: "image" } });
  return { reader: new DelegatedRunAgentsReader(tree), tasks };
};

describe("DelegatedRunAgentsReader (runs delegated from a run)", () => {
  it("token totals: every agent of every run delegated from it, recursively, open or closed", async () => {
    const w = await world();
    expect((await w.reader.agentRunIds(M)).sort()).toEqual(["coder", "designer", "image"]);
    w.tasks.close("T1");
    expect((await w.reader.agentRunIds(M)).sort()).toEqual(["coder", "designer", "image"]);
    expect(await w.reader.agentRunIds(E)).toEqual(["image"]);
  });

  it("past participants: the asked agents of the runs below it, at every depth (SR-072), at their own addresses", async () => {
    const w = await world();
    expect(await w.reader.forAgentRunIds(M, ["coder", "image", "nobody"])).toEqual([{ agentRunId: "coder", address: "/coder" }, { agentRunId: "image", address: "/image_maker" }]);
    expect(await w.reader.forAgentRunIds(E, ["image"])).toEqual([{ agentRunId: "image", address: "/image_maker" }]);
  });

  it("openRunsBelow (SR-074): its open rows at every depth; none once their Task closes", async () => {
    const w = await world();
    expect(w.reader.openRunsBelow(M)).toEqual([{ teamRunId: "eng" }, { agentRunId: "image" }]);
    expect(w.reader.openRunsBelow(E)).toEqual([{ agentRunId: "image" }]);
    w.tasks.close("T1");
    expect(w.reader.openRunsBelow(M)).toEqual([]);
  });
});
