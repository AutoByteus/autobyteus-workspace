import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunTreeView } from "../../../src/agent-collaboration/delegation/run-tree-view.js";
import { createOrgContainerDirectory } from "../../../src/agent-org-execution/container/org-container-directory.js";
import { DelegatedRunAgentsReader } from "../../../src/run-history/services/delegated-run-agents-reader.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { ContainerConfigTrees } from "../../../src/agent-org-execution/container/container-config-trees.js";
import { readStoredOrgTree } from "../../../src/agent-org-execution/container/stored-org-tree.js";
import { AgentOrgExecutionTreeLocationService } from "../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentOrgRunHistoryCatalogService } from "../../../src/run-history/services/agent-org-run-history-catalog-service.js";
import { RootRunPackageCurrentValidator } from "../../../src/run-history/services/root-run-package-current-validator.js";
import { AgentOrgContainerStore } from "../../../src/run-history/store/agent-org-container-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { RunOwnAgentsReader } from "../../../src/run-history/store/run-own-agents-reader.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";

/**
 * org-teams-follow-definition, storage contract §1–§4, §8, design R-5: a stored Org container and its unit runs on disk,
 * read by the real stores: readiness admits it (both ends of each unit reference), its tree and rows compose from its
 * units, its members' memory is in their unit runs, its settings save to the files that own them, and its archive and
 * delete reach its units.
 */
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../fixtures/org-container-contract", name), "utf8"));
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true }))); });
const P = "/software_engineering_team";

/** The contract's Org on disk: the container, two Team units and the agent unit. */
const storedOrg = async (options: { brokenBackLink?: boolean } = {}) => {
  const memoryDir = await fsp.mkdtemp(path.join(os.tmpdir(), "org-container-stored-"));
  dirs.push(memoryDir);
  const layout = new AgentMemoryLayout(memoryDir);
  const container = fixture("container-file.json");
  await new AgentOrgContainerStore().write(layout.getOrgDirPath("sdd_org_1"), container);
  const teams = new TeamRunExecutionTreeStore();
  const setTree = fixture("team-unit-tree.json");
  await teams.write(layout.getTeamDirPath({ rootTeamRunId: "set_team_1", ancestorTeamRunIds: [] }), setTree);
  const pdpTree = { ...setTree, handoffs: [], containedIn: { orgRunId: options.brokenBackLink ? "other_org" : "sdd_org_1", address: "/product_design_prototyping_team" },
    rootTeam: { ...setTree.rootTeam, teamRunId: "pdp_team_1", coordinatorAddress: "/product_prototyper",
      members: [{ ...setTree.rootTeam.members[0], address: "/product_prototyper", agentRunId: "product_prototyper_1" }] } };
  await teams.write(layout.getTeamDirPath({ rootTeamRunId: "pdp_team_1", ancestorTeamRunIds: [] }), pdpTree);
  // Each Team unit's own (empty) log, as its root writes it at creation.
  for (const teamRunId of ["set_team_1", "pdp_team_1"]) {
    await new TeamCommunicationStore().write(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }),
      { schemaVersion: 1, rootTeamRunId: teamRunId, messages: [] });
  }
  await new AgentRunMetadataStore(memoryDir).writeMetadata("concierge_1", { ...fixture("agent-unit-metadata.json"), memoryDir: layout.getStandaloneRunDirPath("concierge_1") });
  return { memoryDir, layout, container };
};

describe("A stored Org container (contract §1–§4, §8; design R-5)", () => {
  it("readiness admits it when every unit names it back at its address, and refuses a unit that does not", async () => {
    const good = await storedOrg();
    const scan = await new RootRunPackageCurrentValidator(good.memoryDir).scan();
    expect(scan.groups.map((group) => `${group.family}:${group.id}`)).toEqual(expect.arrayContaining(["agent_org:sdd_org_1", "agent_team:set_team_1", "agent_team:pdp_team_1", "agent:concierge_1"]));
    const broken = await storedOrg({ brokenBackLink: true });
    const refused = await new RootRunPackageCurrentValidator(broken.memoryDir).scan();
    expect(refused.groups.some((group) => group.id === "sdd_org_1")).toBe(false);
    expect(refused.diagnostics.find((diagnostic) => diagnostic.rootRunId === "sdd_org_1")?.reason).toContain("/product_design_prototyping_team");
  });

  it("its tree and rows compose from its units (members at P/x); its catalog placements are its agent units and Org rules", async () => {
    const { memoryDir } = await storedOrg();
    const tree = await readStoredOrgTree(memoryDir, "sdd_org_1");
    expect(tree?.rootOrg.members.map((member) => member.address)).toEqual([P, "/product_design_prototyping_team", "/concierge"]);
    const reader = new RunOwnAgentsReader(memoryDir);
    expect(await reader.ownTreeOf({ rootSubjectKind: "agent_org", rootRunId: "sdd_org_1" })).toMatchObject({ kind: "agent_org", container: true,
      parts: [{ kind: "team", address: P, teamRunId: "set_team_1", coordinatorAddress: `${P}/solution_designer`,
        members: [{ address: `${P}/solution_designer` }, { address: `${P}/architecture_reviewer` }] }, { kind: "team" }, { kind: "agent", address: "/concierge", agentRunId: "concierge_1" }] });
    expect(await reader.orgPlacementsOf("sdd_org_1")).toMatchObject({ orgDefinitionId: "software-development-department", agentAddresses: ["/concierge"] });
    // A container hosts no agent of its own.
    expect(await reader.partsOf({ rootSubjectKind: "agent_org", rootRunId: "sdd_org_1" })).toMatchObject({ agents: [], mountedTeams: [] });
  });

  it("a fresh process reads a stored Org's delegated runs through its units: the container is read once first (rows, participants' subtree)", async () => {
    const { memoryDir } = await storedOrg();
    const org = { rootSubjectKind: "agent_org" as const, rootRunId: "sdd_org_1" };
    const writer = { kind: "agent", agentRunId: "writer_copy_1" };
    // The concierge unit delegated a run; the container itself delegates nothing.
    const runs = {
      collaborationTreeOf: (holder: { rootRunId: string }) => ({ rows: () => holder.rootRunId === "concierge_1"
        ? [{ run: writer, parent: { rootSubjectKind: "agent", rootRunId: "concierge_1" }, delegatorAgentRunId: "concierge_1" }] : [] }),
      subtreeOf: (holder: { rootRunId: string }) => holder.rootRunId === "concierge_1" ? [writer] : [],
      agentsOf: async () => [],
    } as never;
    const directory = createOrgContainerDirectory(memoryDir);
    // Before its file is read the directory does not know the container (a synchronous answer cannot read it).
    expect(directory.unitRunsOf("sdd_org_1")).toBeNull();
    const view = new RunTreeView({ tree: runs, ownTreeOf: async () => null, projection: {} as never, isLiveTeamRun: () => false,
      unitRunsOf: (orgRunId) => directory.unitRunsOf(orgRunId), loadContainer: (orgRunId) => directory.loadContainer(orgRunId) });
    expect(view.readAtBase(org).subtree).toEqual([]);
    await view.prepare(org);
    expect(view.readAtBase(org).subtree.map((row) => row.run)).toEqual([writer]);
    const reader = new DelegatedRunAgentsReader(runs, createOrgContainerDirectory(memoryDir));
    await reader.prepare(org);
    expect(reader.openRunsBelow(org)).toEqual([writer]);
  });

  it("F-2 (RC-47): a unit of an Org, of either kind, is not a run a person started (list_running_agents lists its Org's units nowhere)", async () => {
    const { memoryDir } = await storedOrg();
    const reader = new RunOwnAgentsReader(memoryDir);
    expect(await reader.listingFactsOf({ rootSubjectKind: "agent", rootRunId: "concierge_1" })).toMatchObject({ kind: "agent", startedByPerson: false });
    expect(await reader.listingFactsOf({ rootSubjectKind: "agent_team", rootRunId: "set_team_1" })).toMatchObject({ kind: "agent_team", startedByPerson: false });
  });

  it("F-1: a Team unit's member leaving its Team is its row, tagged leaving, only while that Team unit runs (as a Team's own rows)", async () => {
    const { memoryDir, layout } = await storedOrg();
    const setDir = layout.getTeamDirPath({ rootTeamRunId: "set_team_1", ancestorTeamRunIds: [] });
    const setTree = (await new TeamRunExecutionTreeStore().read(setDir, "set_team_1"))!;
    const [designer, reviewer] = setTree.rootTeam.members;
    await new TeamRunExecutionTreeStore().write(setDir, { ...setTree, rootTeam: { ...setTree.rootTeam, members: [designer!], formerMembers: [{ ...reviewer!, leaving: true }] } } as never);
    const reader = new RunOwnAgentsReader(memoryDir);
    expect(await reader.ownTreeOf({ rootSubjectKind: "agent_org", rootRunId: "sdd_org_1" })).toMatchObject({ parts: expect.arrayContaining([
      expect.objectContaining({ teamRunId: "set_team_1", members: [{ address: `${P}/solution_designer`, agentRunId: "solution_designer_1" },
        { address: `${P}/architecture_reviewer`, agentRunId: "architecture_reviewer_1", leaving: true }] })]) });
    const rows = async (live: boolean) => (await new RunTreeView({ tree: { collaborationTreeOf: () => ({ rows: () => [] }) } as never, ownTreeOf: (run) => reader.ownTreeOf(run),
      projection: {} as never, isLiveTeamRun: () => live }).rowsOf({ rootSubjectKind: "agent_org", rootRunId: "sdd_org_1" }))
      .filter((row) => row.kind === "team_member" && row.openTarget?.agentRunId === "architecture_reviewer_1");
    expect(await rows(true)).toEqual([expect.objectContaining({ leaving: true, address: `${P}/architecture_reviewer` })]);
    expect(await rows(false)).toEqual([]);
  });

  it("its members' memory is in their unit runs (context files and member reads find it there)", async () => {
    const { memoryDir, layout } = await storedOrg();
    const locations = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const member = await locations.findAgent({ rootRunId: "sdd_org_1", agentRunId: "architecture_reviewer_1" });
    expect(member).toMatchObject({ memberAddress: `${P}/architecture_reviewer`,
      memoryDir: layout.getTeamAgentRunDirPath({ rootTeamRunId: "set_team_1", ancestorTeamRunIds: [] }, "architecture_reviewer_1") });
    expect((await locations.findAgent({ rootRunId: "sdd_org_1", agentRunId: "concierge_1" }))?.memoryDir).toBe(layout.getStandaloneRunDirPath("concierge_1"));
    expect(locations.findAgentSync({ rootRunId: "sdd_org_1", agentRunId: "concierge_1" })?.memoryDir).toBe(layout.getStandaloneRunDirPath("concierge_1"));
  });

  it("its settings save to the files that own them: a Team unit member's launch to its Team run, a direct agent's to its run file", async () => {
    const { memoryDir, layout } = await storedOrg();
    const config = new ContainerConfigTrees(memoryDir);
    const tree = (await config.read("sdd_org_1"))!;
    const edited = { ...tree, rootOrg: { ...tree.rootOrg, members: tree.rootOrg.members.map((member) => "agentRunId" in member
      ? { ...member, launchConfiguration: { ...member.launchConfiguration, llmModelIdentifier: "concierge-model" } }
      : member.teamRunId === "set_team_1" ? { ...member, members: member.members.map((agent) => agent.agentRunId === "architecture_reviewer_1"
        ? { ...agent, launchConfiguration: { ...agent.launchConfiguration, llmModelIdentifier: "reviewer-model" } } : agent) } : member) } };
    await expect(config.write("sdd_org_1", edited)).resolves.toBe("committed");
    expect(await config.read("sdd_org_1")).toEqual(edited);
    const teamTree = await new TeamRunExecutionTreeStore().read(layout.getTeamDirPath({ rootTeamRunId: "set_team_1", ancestorTeamRunIds: [] }), "set_team_1");
    expect(teamTree?.rootTeam.members.find((member) => member.agentRunId === "architecture_reviewer_1")).toMatchObject({ address: "/architecture_reviewer",
      launchConfiguration: { llmModelIdentifier: "reviewer-model" } });
    expect((await new AgentRunMetadataStore(memoryDir).readMetadata("concierge_1"))?.llmModelIdentifier).toBe("concierge-model");
  });

  it("F-3 (ORG-E2E): a model patch records its source (settings) on a Team unit member and a direct agent; the readback equals the saved tree", async () => {
    const { memoryDir } = await storedOrg();
    const config = new ContainerConfigTrees(memoryDir);
    const tree = (await config.read("sdd_org_1"))!;
    const settings = { origin: "settings" as const, fallbacks: [] };
    const edited = { ...tree, rootOrg: { ...tree.rootOrg, members: tree.rootOrg.members.map((member) => "agentRunId" in member
      ? { ...member, launchSource: settings, launchConfiguration: { ...member.launchConfiguration, llmModelIdentifier: "concierge-model" } }
      : member.teamRunId === "set_team_1" ? { ...member, members: member.members.map((agent) => agent.agentRunId === "architecture_reviewer_1"
        ? { ...agent, launchSource: settings, launchConfiguration: { ...agent.launchConfiguration, llmModelIdentifier: "reviewer-model" } } : agent) } : member) } };
    await expect(config.write("sdd_org_1", edited as never)).resolves.toBe("committed");
    expect(await config.read("sdd_org_1")).toEqual(edited);
    expect((await new AgentRunMetadataStore(memoryDir).readMetadata("concierge_1"))?.launchSource).toEqual(settings);
  });

  it("archive marks its own file; delete removes its history row, every unit run's folder and its own", async () => {
    const { memoryDir, layout, container } = await storedOrg();
    const index = new AgentOrgRunHistoryIndexStore(memoryDir);
    await index.writeIndex([{ orgRunId: "sdd_org_1", orgDefinitionId: container.rootOrg.orgDefinitionId, orgDefinitionName: container.rootOrg.orgDefinitionName,
      workspaceRootPath: "/home/u/workspace", summary: "", createdAt: container.createdAt, archivedAt: null, terminatedAt: null }]);
    const catalog = new AgentOrgRunHistoryCatalogService(memoryDir, { withInactiveHistoryMutation: async (_id: string, operation: () => Promise<unknown>) =>
      ({ kind: "completed", value: await operation() }) } as never, { packageCatalog: { awaitReady: async () => undefined, isAdmitted: () => true, exclude: () => undefined } as never });
    await expect(catalog.archiveStored("sdd_org_1")).resolves.toMatchObject({ success: true });
    expect((await new AgentOrgContainerStore().readIfContainer(layout.getOrgDirPath("sdd_org_1"), "sdd_org_1"))?.archivedAt).toEqual(expect.any(String));
    const deleted = await catalog.deleteStored("sdd_org_1");
    expect(deleted).toMatchObject({ success: true, unitRuns: [{ rootSubjectKind: "agent_team", rootRunId: "set_team_1" },
      { rootSubjectKind: "agent_team", rootRunId: "pdp_team_1" }, { rootSubjectKind: "agent", rootRunId: "concierge_1" }] });
    for (const dir of [layout.getOrgDirPath("sdd_org_1"), layout.getTeamDirPath({ rootTeamRunId: "set_team_1", ancestorTeamRunIds: [] }),
      layout.getTeamDirPath({ rootTeamRunId: "pdp_team_1", ancestorTeamRunIds: [] }), layout.getStandaloneRunDirPath("concierge_1")]) {
      expect(fs.existsSync(dir)).toBe(false);
    }
    expect(await index.readIndex()).toEqual([]);
  });
});
