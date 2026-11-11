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
import { AgentOrgRunExecutionTreeStore } from "../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";

/** autobyteus-461 contract §2.6 (V-14, AR-014): a run's agents from its own parts, for `DelegationTree.runOfAgent`. */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});

describe("RunOwnAgentsReader", () => {
  it("a team run's members from its own file; a standalone run is its one agent; a missing run is null", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-agents-"));
    roots.push(memory);
   
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-b", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(dir, validateTeamRunExecutionTreePayload(testExecutionTree({ rootTeamRunId: "team-b", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-b" }), testAgentNode("/writer", { agentRunId: "writer-b" })] }), "team-b"));
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.agentsOf({ rootSubjectKind: "agent_team", rootRunId: "team-b" }))
      .toEqual([{ agentRunId: "lead-b", address: "/lead" }, { agentRunId: "writer-b", address: "/writer" }]);
    // An agent run with no stored address (not collaborating yet): its one agent, with no address.
    expect(await reader.agentsOf({ rootSubjectKind: "agent", rootRunId: "manager" })).toEqual([{ agentRunId: "manager", address: null }]);
    expect(await reader.agentsOf({ rootSubjectKind: "agent_team", rootRunId: "gone" })).toBeNull();
    expect(await reader.agentsOf({ rootSubjectKind: "agent_org", rootRunId: "gone" })).toBeNull();
  });

  it("standingOf (contract §2.3, model.py standing): a team's members and coordinator; an agent run's stored address; an org's agents, mounted members and mounted team addresses", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-standing-"));
    roots.push(memory);
   
    const layout = new AgentMemoryLayout(memory);
    await new TeamRunExecutionTreeStore().write(layout.getTeamDirPath({ rootTeamRunId: "team-b", ancestorTeamRunIds: [] }), validateTeamRunExecutionTreePayload(testExecutionTree({
      rootTeamRunId: "team-b", coordinatorAddress: "/lead", children: [testAgentNode("/lead", { agentRunId: "lead-b" }), testAgentNode("/writer", { agentRunId: "writer-b" })] }), "team-b"));
    await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath("org-1"), testAgentOrgExecutionTree({ orgRunId: "org-1", members: [testOrgAgentNode("/ceo_agent", "ceo"),
      testOrgTeamNode({ address: "/dev_team", teamRunId: "dev-1", coordinatorAddress: "/dev_team/dev_lead",
        members: [testOrgAgentNode("/dev_team/dev_lead", "dev_lead"), testOrgAgentNode("/dev_team/qa", "qa")] })] }));
    const metadata = { runId: "manager", agentDefinitionId: "project-task-manager", workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "manager"),
      llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus", platformAgentRunId: null } as never;
    await new AgentRunMetadataStore(memory).writeMetadata("manager", { ...(metadata as object), address: "/project_task_manager" } as never);
    await new AgentRunMetadataStore(memory).writeMetadata("fresh", { ...(metadata as object), runId: "fresh", memoryDir: path.join(memory, "agents", "fresh") } as never);
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.standingOf({ rootSubjectKind: "agent_team", rootRunId: "team-b" })).toEqual({
      agents: new Map([["/lead", "lead-b"], ["/writer", "writer-b"]]), coordinatorAddress: "/lead" });
    expect(await reader.standingOf({ rootSubjectKind: "agent", rootRunId: "manager" })).toEqual({ agents: new Map([["/project_task_manager", "manager"]]), coordinatorAddress: null });
    // Not collaborating yet: no address fixed, so it has none another run could use.
    expect(await reader.standingOf({ rootSubjectKind: "agent", rootRunId: "fresh" })).toEqual({ agents: new Map(), coordinatorAddress: null });
    expect(await reader.standingOf({ rootSubjectKind: "agent_org", rootRunId: "org-1" })).toEqual({ agents: new Map([["/ceo_agent", "ceo"],
      ["/dev_team/dev_lead", "dev_lead"], ["/dev_team/qa", "qa"], ["/dev_team", "dev_lead"]]), coordinatorAddress: null });
    expect(await reader.standingOf({ rootSubjectKind: "agent", rootRunId: "gone" })).toBeNull();
  });
});
