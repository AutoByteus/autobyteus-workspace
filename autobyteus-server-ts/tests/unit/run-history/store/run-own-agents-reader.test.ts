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
import { writeStoredOrgContainer } from "../../../helpers/stored-org-container.js";
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
      formerAgents: [], coordinatorAddress: "/lead", mountedTeams: [] });
    for (const rootSubjectKind of ["agent", "agent_team", "agent_org"] as const) {
      expect(await reader.partsOf({ rootSubjectKind, rootRunId: "gone" })).toBeNull();
    }
  });

  it("partsOf: a team run's former members (removed from its definition) are its former agents, not its agents", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-agents-former-"));
    roots.push(memory);
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-f", ancestorTeamRunIds: [] });
    const tree = testExecutionTree({ rootTeamRunId: "team-f", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-f" }), testAgentNode("/writer", { agentRunId: "writer-f" })] });
    const [lead, writer] = tree.rootTeam.members;
    await new TeamRunExecutionTreeStore().write(dir, validateTeamRunExecutionTreePayload({ ...tree, handoffs: [],
      rootTeam: { ...tree.rootTeam, members: [lead!], formerMembers: [writer!] } }, "team-f"));
    expect(await new RunOwnAgentsReader(memory).partsOf({ rootSubjectKind: "agent_team", rootRunId: "team-f" })).toEqual({
      agents: [{ agentRunId: "lead-f", address: "/lead", agentDefinitionId: "agent-lead" }],
      formerAgents: [{ agentRunId: "writer-f", address: "/writer", agentDefinitionId: "agent-writer" }],
      coordinatorAddress: "/lead", mountedTeams: [] });
  });

  it("ownTreeOf (SR-010): a team run's members, then its former members marked leaving (marked so); stopped former members are not listed", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-tree-leaving-"));
    roots.push(memory);
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team-l", ancestorTeamRunIds: [] });
    const tree = testExecutionTree({ rootTeamRunId: "team-l", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-l" }), testAgentNode("/writer", { agentRunId: "writer-l" }), testAgentNode("/old", { agentRunId: "old-l" })] });
    const [lead, writer, old] = tree.rootTeam.members;
    await new TeamRunExecutionTreeStore().write(dir, validateTeamRunExecutionTreePayload({ ...tree, handoffs: [],
      rootTeam: { ...tree.rootTeam, members: [lead!], formerMembers: [old!, { ...writer!, leaving: true }] } }, "team-l"));
    // Each part with the definition its file names (autobyteus-669 S-4): the team's and each member's.
    expect(await new RunOwnAgentsReader(memory).ownTreeOf({ rootSubjectKind: "agent_team", rootRunId: "team-l" } as never)).toEqual({
      kind: "agent_team", teamRunId: "team-l", coordinatorAddress: "/lead", definitionId: tree.rootTeam.teamDefinitionId,
      members: [{ address: "/lead", agentRunId: "lead-l", definitionId: (lead as { agentDefinitionId: string }).agentDefinitionId },
        { address: "/writer", agentRunId: "writer-l", leaving: true, definitionId: (writer as { agentDefinitionId: string }).agentDefinitionId }] });
  });

  // autobyteus-669 S-4 (N-5, N-6): every own part names its definition from the files the tree already reads.
  it("ownTreeOf names each part's definition: an agent run's from its metadata, an Org unit's from the container, a Team unit's members' from its file", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-tree-definitions-"));
    roots.push(memory);
    await writeStoredOrgContainer(memory, { orgRunId: "org-d", units: [
      { kind: "agent", address: "/ceo", runId: "ceo-d", agentDefinitionId: "ceo-def" },
      { kind: "agent_team", address: "/dev", runId: "dev-d", teamDefinitionId: "dev-team-def", coordinatorAddress: "/lead",
        members: [{ address: "/lead", agentRunId: "lead-d", agentDefinitionId: "lead-def" }] },
    ] } as never);
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.ownTreeOf({ rootSubjectKind: "agent", rootRunId: "ceo-d" })).toMatchObject({ kind: "agent", agentRunId: "ceo-d", definitionId: "ceo-def" });
    const org = await reader.ownTreeOf({ rootSubjectKind: "agent_org", rootRunId: "org-d" });
    expect(org).toMatchObject({ kind: "agent_org", parts: [
      { kind: "agent", agentRunId: "ceo-d", definitionId: "ceo-def" },
      { kind: "team", teamRunId: "dev-d", definitionId: "dev-team-def", members: [{ agentRunId: "lead-d", definitionId: "lead-def" }] },
    ] });
  });

  it("partsOf (contract §2.3, model.py standing): an agent run's stored address, or none before it collaborates; an org's agents, mounted members and mounted teams", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-standing-"));
    roots.push(memory);
    const layout = new AgentMemoryLayout(memory);
    // An Org container (org-teams-follow-definition) hosts no agent: its units' agents are their own runs'.
    await writeStoredOrgContainer(memory, { orgRunId: "org-1", units: [{ kind: "agent", address: "/ceo_agent", runId: "ceo" },
      { kind: "agent_team", address: "/dev_team", runId: "dev-1", coordinatorAddress: "/dev_lead", members: [{ address: "/dev_lead", agentRunId: "dev_lead" }] }] });
    const metadata = { runId: "manager", agentDefinitionId: "project-task-manager", workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "manager"),
      llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus", platformAgentRunId: null } as never;
    await new AgentRunMetadataStore(memory).writeMetadata("manager", { ...(metadata as object), address: "/project_task_manager" } as never);
    await new AgentRunMetadataStore(memory).writeMetadata("fresh", { ...(metadata as object), runId: "fresh", memoryDir: path.join(memory, "agents", "fresh") } as never);
    const reader = new RunOwnAgentsReader(memory);
    expect(await reader.partsOf({ rootSubjectKind: "agent", rootRunId: "manager" })).toEqual({
      agents: [{ agentRunId: "manager", address: "/project_task_manager", agentDefinitionId: "project-task-manager" }], formerAgents: [], coordinatorAddress: null, mountedTeams: [] });
    // Not collaborating yet: no address fixed.
    expect(await reader.partsOf({ rootSubjectKind: "agent", rootRunId: "fresh" })).toEqual({
      agents: [{ agentRunId: "fresh", address: null, agentDefinitionId: "project-task-manager" }], formerAgents: [], coordinatorAddress: null, mountedTeams: [] });
    expect(await reader.partsOf({ rootSubjectKind: "agent_org", rootRunId: "org-1" })).toEqual({ agents: [], formerAgents: [], coordinatorAddress: null, mountedTeams: [] });
    // Each unit run answers its own parts: the Team unit its members in its own space.
    expect(await reader.partsOf({ rootSubjectKind: "agent_team", rootRunId: "dev-1" })).toMatchObject({
      agents: [expect.objectContaining({ agentRunId: "dev_lead", address: "/dev_lead" })], coordinatorAddress: "/dev_lead" });
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

  it("delegationOfAgent (CR-461-058, -065): the delegation of the run an agent is in, by its run ID: its own agent run, else the team run it is a member of", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-delegation-of-agent-"));
    roots.push(memory);
    const layout = new AgentMemoryLayout(memory);
    const from = { delegatingRun: { kind: "agent", runId: "manager" }, delegatorAgentRunId: "manager" } as const;
    await new AgentRunMetadataStore(memory).writeMetadata("image", { runId: "image", agentDefinitionId: "image-maker", workspaceRootPath: "/w",
      memoryDir: path.join(memory, "agents", "image"), llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus",
      platformAgentRunId: null, address: "/image_maker", delegatedFrom: from } as never);
    const delegated = validateTeamRunExecutionTreePayload(testExecutionTree({ rootTeamRunId: "team-d", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-d" }), testAgentNode("/writer", { agentRunId: "writer-d" })] }), "team-d");
    await new TeamRunExecutionTreeStore().write(layout.getTeamDirPath({ rootTeamRunId: "team-d", ancestorTeamRunIds: [] }), { ...delegated, delegatedFrom: from } as never);
    await new TeamRunExecutionTreeStore().write(layout.getTeamDirPath({ rootTeamRunId: "team-u", ancestorTeamRunIds: [] }), validateTeamRunExecutionTreePayload(
      testExecutionTree({ rootTeamRunId: "team-u", coordinatorAddress: "/lead", children: [testAgentNode("/lead", { agentRunId: "lead-u" })] }), "team-u"));
    const reader = new RunOwnAgentsReader(memory);
    const manager = { delegatingRun: { rootSubjectKind: "agent", rootRunId: "manager" }, delegatorAgentRunId: "manager" };
    expect(await reader.delegationOfAgent("image")).toMatchObject({ delegatedFrom: manager, entryAgentRunId: "image" });
    // The coordinator and any other member: the team run's own delegation.
    for (const member of ["lead-d", "writer-d"]) expect(await reader.delegationOfAgent(member)).toMatchObject({ delegatedFrom: manager, entryAgentRunId: "lead-d" });
    // A member of a team the user started, and an unknown run ID: none.
    for (const agentRunId of ["lead-u", "gone"]) expect(await reader.delegationOfAgent(agentRunId)).toBeNull();
  });

  it("delegationOfAgent: no team runs stored at all is none", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-own-delegation-empty-"));
    roots.push(memory);
    expect(await new RunOwnAgentsReader(memory).delegationOfAgent("anyone")).toBeNull();
  });
});
