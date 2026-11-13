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

/** autobyteus-461 contract §2.6 (V-14, AR-014): a run's agents from its own parts, for `DelegationIndex.runOfAgent`. */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});

describe("RunOwnAgentsReader", () => {
  it("partsOf: a team run's members and coordinator address; a missing run is null", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-agents-"));
    roots.push(memory);
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-b", ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(dir, validateTeamRunExecutionTreePayload(testExecutionTree({ rootTeamRunId: "team-b", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-b" }), testAgentNode("/writer", { agentRunId: "writer-b" })] }), "team-b"));
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.partsOf({ rootSubjectKind: "agent_team", rootRunId: "team-b" })).toEqual({
      agents: [{ agentRunId: "lead-b", address: "/lead", agentDefinitionId: "agent-lead" }, { agentRunId: "writer-b", address: "/writer", agentDefinitionId: "agent-writer" }],
      coordinatorAddress: "/lead", mountedTeams: [] });
    for (const rootSubjectKind of ["agent", "agent_team", "agent_org"] as const) {
      expect(await reader.partsOf({ rootSubjectKind, rootRunId: "gone" })).toBeNull();
    }
  });

  it("partsOf (contract §2.3, model.py standing): an agent run's stored address, or none before it collaborates; an org's agents, mounted members and mounted teams", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-standing-"));
    roots.push(memory);
    const layout = new AgentMemoryLayout(memory);
    await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath("org-1"), testAgentOrgExecutionTree({ orgRunId: "org-1", members: [testOrgAgentNode("/ceo_agent", "ceo"),
      testOrgTeamNode({ address: "/dev_team", teamRunId: "dev-1", coordinatorAddress: "/dev_team/dev_lead",
        members: [testOrgAgentNode("/dev_team/dev_lead", "dev_lead"), testOrgAgentNode("/dev_team/qa", "qa")] })] }));
    const metadata = { runId: "manager", agentDefinitionId: "project-task-manager", workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "manager"),
      llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus", platformAgentRunId: null } as never;
    await new AgentRunMetadataStore(memory).writeMetadata("manager", { ...(metadata as object), address: "/project_task_manager" } as never);
    await new AgentRunMetadataStore(memory).writeMetadata("fresh", { ...(metadata as object), runId: "fresh", memoryDir: path.join(memory, "agents", "fresh") } as never);
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.partsOf({ rootSubjectKind: "agent", rootRunId: "manager" })).toEqual({
      agents: [{ agentRunId: "manager", address: "/project_task_manager", agentDefinitionId: "project-task-manager" }], coordinatorAddress: null, mountedTeams: [] });
    // Not collaborating yet: no address fixed.
    expect(await reader.partsOf({ rootSubjectKind: "agent", rootRunId: "fresh" })).toEqual({
      agents: [{ agentRunId: "fresh", address: null, agentDefinitionId: "project-task-manager" }], coordinatorAddress: null, mountedTeams: [] });
    expect(await reader.partsOf({ rootSubjectKind: "agent_org", rootRunId: "org-1" })).toEqual({
      agents: [expect.objectContaining({ agentRunId: "ceo", address: "/ceo_agent" }), expect.objectContaining({ agentRunId: "dev_lead", address: "/dev_team/dev_lead" }),
        expect.objectContaining({ agentRunId: "qa", address: "/dev_team/qa" })],
      coordinatorAddress: null, mountedTeams: [{ address: "/dev_team", coordinatorAgentRunId: "dev_lead" }] });
  });

  it("delegationOf (SR-072 F-24): a delegated run's own delegation, address, definition and entry agent; none for a peer-started or user-started run", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-delegation-"));
    roots.push(memory);
    const layout = new AgentMemoryLayout(memory);
    const from = { delegatingRun: { kind: "agent", runId: "manager" }, delegatorAgentRunId: "manager" } as const;
    const metadata = (runId: string, extra: object) => ({ runId, agentDefinitionId: "image-maker", workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", runId),
      llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus", platformAgentRunId: null, ...extra }) as never;
    const agents = new AgentRunMetadataStore(memory);
    await agents.writeMetadata("image", metadata("image", { address: "/image_maker", delegatedFrom: from }));
    await agents.writeMetadata("peer-started", metadata("peer-started", { address: "/image_maker", delegatedFrom: { ...from, nodeId: "node-b" } }));
    await agents.writeMetadata("own", metadata("own", {}));
    const tree = validateTeamRunExecutionTreePayload(testExecutionTree({ rootTeamRunId: "team-d", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-d" }), testAgentNode("/writer", { agentRunId: "writer-d" })] }), "team-d");
    await new TeamRunExecutionTreeStore().write(layout.getTeamDirPath({ rootTeamRunId: "team-d", ancestorTeamRunIds: [] }), { ...tree, delegatedFrom: from } as never);
    const reader = new RunOwnAgentsReader(memory);
    const manager = { delegatingRun: { rootSubjectKind: "agent", rootRunId: "manager" }, delegatorAgentRunId: "manager" };
    expect(await reader.delegationOf({ rootSubjectKind: "agent", rootRunId: "image" })).toEqual({ delegatedFrom: manager, address: "/image_maker",
      definition: { kind: "agent", definitionId: "image-maker" }, entryAgentRunId: "image" });
    expect(await reader.delegationOf({ rootSubjectKind: "agent_team", rootRunId: "team-d" })).toEqual({ delegatedFrom: manager, address: null,
      definition: { kind: "agent_team", definitionId: tree.rootTeam.teamDefinitionId }, entryAgentRunId: "lead-d" });
    for (const runId of ["peer-started", "own", "gone"]) expect(await reader.delegationOf({ rootSubjectKind: "agent", rootRunId: runId })).toBeNull();
  });
});
