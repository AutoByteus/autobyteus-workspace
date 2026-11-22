import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { RunViewStream } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { createAgentRootExecutionIdentity, createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerManager } from "../../../../src/agent-org-execution/container/agent-org-container-manager.js";
import { AgentOrgContainers } from "../../../../src/agent-org-execution/container/agent-org-containers.js";
import type { AgentOrgUnitRuns } from "../../../../src/agent-org-execution/container/agent-org-unit-runs.js";
import { createOrgContainerDirectory, OrgContainerDirectory } from "../../../../src/agent-org-execution/container/org-container-directory.js";
import type { LiveUnitView, UnitViewFrame } from "../../../../src/agent-org-execution/container/org-view-composition.js";
import type { AgentOrgContainerFile, AgentOrgUnit } from "../../../../src/agent-org-execution/domain/agent-org-container-file.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { OrgDefinitionChangeListener } from "../../../../src/agent-org-execution/membership/org-definition-change-listener.js";
import { planOrgMembershipChange, releaseStoppedUnits, type OrgDefinitionView } from "../../../../src/agent-org-execution/membership/org-membership-change.js";
import { OrgMembershipPlanner } from "../../../../src/agent-org-execution/membership/org-membership-planner.js";
import type { TeamRunExecutionTreeFile } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { TeamChangeNoticeSource } from "../../../../src/agent-team-execution/membership/team-change-notice-source.js";
import { AgentOrgContainerStore } from "../../../../src/run-history/store/agent-org-container-store.js";
import { validateAgentOrgContainerPayload } from "../../../../src/run-history/store/agent-org-container-file-schema.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { RunOwnAgentsReader } from "../../../../src/run-history/store/run-own-agents-reader.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { TeamCommunicationStore } from "../../../../src/services/team-communication/team-communication-store.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";

/**
 * org-teams-follow-definition REQ-004, REQ-009, AC-004, AC-008 (design DS-006, R-6; storage contract §2 `formerUnits`): an
 * Org container follows its Org definition (units join Offline, leave as autobyteus-22's members do, Org rules follow) and
 * its Org rules follow its units' membership (a rule to a member that left is left out until it returns), with one net
 * notice per agent. The Org of the storage contract: `/concierge` (agent unit), `/software_engineering_team` (members
 * `/solution_designer`, `/architecture_reviewer`) and `/product_design_prototyping_team` (member `/product_prototyper`).
 */
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../fixtures/org-container-contract", name), "utf8"));
const P = "/software_engineering_team";
const PDP = "/product_design_prototyping_team";
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-6-astra", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/home/u/workspace" } as never;
const toReviewer = { from: "/concierge", to: `${P}/architecture_reviewer`, rules: ["When a review is needed."] };
const containerFile = (extra: Partial<{ handoffs: unknown[]; formerUnits: unknown[] }> = {}): AgentOrgContainerFile => {
  const raw = fixture("container-file.json");
  return validateAgentOrgContainerPayload({ ...raw, handoffs: extra.handoffs ?? [...raw.handoffs, toReviewer],
    rootOrg: { ...raw.rootOrg, formerUnits: extra.formerUnits ?? [] } }, "sdd_org_1");
};
const setTree = (): TeamRunExecutionTreeFile => validateTeamRunExecutionTreePayload(fixture("team-unit-tree.json"), "set_team_1");
const pdpTree = (): TeamRunExecutionTreeFile => {
  const raw = fixture("team-unit-tree.json");
  return validateTeamRunExecutionTreePayload({ ...raw, handoffs: [], containedIn: { orgRunId: "sdd_org_1", address: PDP },
    rootTeam: { ...raw.rootTeam, teamRunId: "pdp_team_1", teamDefinitionId: "product-design-prototyping-team", coordinatorAddress: "/product_prototyper",
      members: [{ ...raw.rootTeam.members[0], address: "/product_prototyper", agentRunId: "product_prototyper_1", agentDefinitionId: "product-prototyper" }] } }, "pdp_team_1");
};
/** The SET Team after its definition dropped `/architecture_reviewer` (a former member now). */
const setWithoutReviewer = (): TeamRunExecutionTreeFile => {
  const tree = setTree();
  const [designer, reviewer] = tree.rootTeam.members;
  return validateTeamRunExecutionTreePayload({ ...tree, rootTeam: { ...tree.rootTeam, members: [designer], formerMembers: [{ ...reviewer }] } }, "set_team_1");
};
const reviewerRef = { agentRunId: "architecture_reviewer_1", address: "/architecture_reviewer" } as never;
const concierge = (): AgentRunMetadata => fixture("agent-unit-metadata.json") as AgentRunMetadata;
const directoryOver = (file: () => AgentOrgContainerFile) => {
  const teams = new Map([["set_team_1", setTree()], ["pdp_team_1", pdpTree()]]);
  return new OrgContainerDirectory({ storedContainer: async (id) => id === "sdd_org_1" ? file() : null,
    teamTree: async (id) => teams.get(id) ?? null, agentMetadata: async (id) => id === "concierge_1" ? concierge() : null });
};
const writerUnit = { kind: "agent" as const, address: "/writer" as never, agentDefinitionId: "writer", launchConfiguration: launch };
const conciergeUnit = { kind: "agent" as const, address: "/concierge" as never, agentDefinitionId: "concierge", launchConfiguration: launch };
const setUnit = { kind: "agent_team" as const, address: P as never, teamDefinitionId: "software-engineering-team", defaultLaunchConfiguration: launch, members: [] };
const view = (units: OrgDefinitionView["plan"]["units"], orgRules: OrgDefinitionView["plan"]["orgRules"]): OrgDefinitionView =>
  ({ orgDefinitionId: "software-development-department", plan: { units, orgRules } });

describe("planOrgMembershipChange (DS-006, pure)", () => {
  it("a new unit is created, a unit no longer mounted leaves, the Org rules are the definition's (a rule from a unit not created waits for it)", () => {
    const file = containerFile();
    const rules = [{ from: "/concierge", to: P, rules: ["When a software request arrives."] }, { from: "/writer", to: "/concierge", rules: ["When drafted."] }];
    const plan = planOrgMembershipChange(file, view([setUnit, conciergeUnit, writerUnit], rules))!;
    expect(plan.toCreate.map((unit) => unit.address)).toEqual(["/writer"]);
    expect(plan.left.map((unit) => unit.address)).toEqual([PDP]);
    expect(plan.rejoined).toEqual([]);
    const next = plan.next(new Map([["/writer", "writer_1"]]), new Set(["pdp_team_1"]));
    expect(next.rootOrg.units.map((unit) => [unit.address, unit.runId])).toEqual([[P, "set_team_1"], ["/concierge", "concierge_1"], ["/writer", "writer_1"]]);
    // The leaving unit is a former unit marked leaving (it finishes, then is released).
    expect(next.rootOrg.formerUnits).toEqual([{ address: PDP, kind: "agent_team", runId: "pdp_team_1", definitionId: "product-design-prototyping-team", leaving: true }]);
    expect(next.handoffs).toEqual(rules);
    // A unit that could not be created is not added; its rules wait for it.
    expect(plan.next(new Map(), new Set()).handoffs).toEqual([rules[0]]);
  });

  it("a Team swapped for another at the same address is one leaving unit and one new; a former unit that returns keeps its run; nothing changed: null", () => {
    const file = containerFile({ formerUnits: [{ address: "/writer", kind: "agent", runId: "writer_0", definitionId: "writer" }] });
    const swapped = { ...setUnit, teamDefinitionId: "platform-team" };
    const plan = planOrgMembershipChange(file, view([swapped, conciergeUnit, writerUnit], file.handoffs))!;
    expect(plan.toCreate.map((unit) => unit.address)).toEqual([P]);
    expect(plan.left.map((unit) => unit.runId)).toEqual(["set_team_1", "pdp_team_1"]);
    expect(plan.rejoined.map((unit) => unit.runId)).toEqual(["writer_0"]);
    const next = plan.next(new Map([[P, "platform_1"]]), new Set());
    expect(next.rootOrg.units.map((unit) => unit.runId)).toEqual(["platform_1", "concierge_1", "writer_0"]);
    expect(next.rootOrg.formerUnits.map((unit) => unit.runId)).toEqual(["set_team_1", "pdp_team_1"]);
    const pdpUnit = { ...setUnit, address: PDP as never, teamDefinitionId: "product-design-prototyping-team" };
    expect(planOrgMembershipChange(containerFile(), view([setUnit, pdpUnit, conciergeUnit], containerFile().handoffs))).toBeNull();
  });

  it("a release clears the marker of a unit no longer running; none stale: null", () => {
    const file = containerFile({ formerUnits: [{ address: "/writer", kind: "agent", runId: "writer_0", definitionId: "writer", leaving: true }] });
    expect(releaseStoppedUnits(file, () => true)).toBeNull();
    expect(releaseStoppedUnits(file, () => false)!.rootOrg.formerUnits).toEqual([{ address: "/writer", kind: "agent", runId: "writer_0", definitionId: "writer" }]);
    // A current unit is never leaving.
    expect(() => validateAgentOrgContainerPayload({ ...file, rootOrg: { ...file.rootOrg, units: [{ ...file.rootOrg.units[0], leaving: true }] } }, "sdd_org_1")).toThrow(/only a former unit/);
  });
});

describe("REQ-004: an Org rule follows its target's membership (AC-004)", () => {
  it("a rule to a member that left is left out, then back when it returns; the sender's rules change both times", async () => {
    const directory = directoryOver(() => containerFile());
    await directory.loadContainer("sdd_org_1");
    expect(directory.orgRulesFrom("sdd_org_1", "/concierge").map((rule) => rule.to)).toEqual([P, `${P}/architecture_reviewer`]);
    const left = directory.orgRuleChangesFor({ tree: setWithoutReviewer(), joined: [], left: [reviewerRef] });
    expect(left.map((change) => [change.agentRunId, change.before.length, change.after.length])).toEqual([["concierge_1", 2, 1]]);
    expect(directory.orgRulesFrom("sdd_org_1", "/concierge").map((rule) => rule.to)).toEqual([P]);
    const back = directory.orgRuleChangesFor({ tree: setTree(), joined: [reviewerRef], left: [] });
    expect(back.map((change) => [change.agentRunId, change.before.length, change.after.length])).toEqual([["concierge_1", 1, 2]]);
    expect(directory.orgRulesFrom("sdd_org_1", "/concierge").map((rule) => rule.to)).toEqual([P, `${P}/architecture_reviewer`]);
  });

  it("R-6: the sender is told once: its Org rules changed (the Team's own members hear who left, as autobyteus-22)", async () => {
    const directory = directoryOver(() => containerFile());
    await directory.loadContainer("sdd_org_1");
    const notices = new TeamChangeNoticeSource();
    notices.bindOrgRules(directory);
    notices.recordChange({ tree: setWithoutReviewer(), joined: [], left: [reviewerRef], leaving: [], released: [], handoffsBefore: setTree().handoffs });
    const conciergeNotice = await notices.takePreface({ runId: "concierge_1" } as never);
    expect(conciergeNotice!.text).toBe("Your team changed: its definition was updated.\nYour handoff rules changed; call get_handoff_rules to read them.");
    const designer = await notices.takePreface({ runId: "solution_designer_1" } as never);
    expect(designer!.text).toContain(`Left: architecture_reviewer (${P}/architecture_reviewer); messages to it are no longer delivered.`);
    // Back before the notice was delivered: nothing is left to say (net change).
    notices.prefaceReturned({ runId: "concierge_1" } as never, conciergeNotice!);
    notices.recordChange({ tree: setTree(), joined: [reviewerRef], left: [], leaving: [], released: [], handoffsBefore: setTree().handoffs });
    expect(await notices.takePreface({ runId: "concierge_1" } as never)).toBeNull();
  });
});

describe("REQ-009: the Org follows its Org definition (AC-008)", () => {
  const dirs: string[] = [];
  afterEach(async () => { vi.restoreAllMocks(); await Promise.all(dirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true }))); });

  /** The contract's Org on disk, reopened as a live container whose `pdp` unit is live and working. */
  const liveOrg = async () => {
    const memoryDir = await fsp.mkdtemp(path.join(os.tmpdir(), "org-follow-"));
    dirs.push(memoryDir);
    const layout = new AgentMemoryLayout(memoryDir);
    await new AgentOrgContainerStore().write(layout.getOrgDirPath("sdd_org_1"), containerFile());
    for (const tree of [setTree(), pdpTree()]) {
      const dir = layout.getTeamDirPath({ rootTeamRunId: tree.rootTeam.teamRunId, ancestorTeamRunIds: [] });
      await new TeamRunExecutionTreeStore().write(dir, tree);
      await new TeamCommunicationStore().write(dir, { schemaVersion: 1, rootTeamRunId: tree.rootTeam.teamRunId, messages: [] });
    }
    await new AgentRunMetadataStore(memoryDir).writeMetadata("concierge_1", { ...concierge(), memoryDir: layout.getStandaloneRunDirPath("concierge_1") });
    const units = {
      createTeamUnit: vi.fn(async () => "never"),
      createAgentUnit: vi.fn(async (unit: { agentDefinitionId: string }) => `${unit.agentDefinitionId}_1`),
      stopUnit: vi.fn(async () => true),
      discardUnit: vi.fn(async () => undefined),
    } satisfies AgentOrgUnitRuns;
    // The pdp Team unit is live and working; it goes idle when the test says so.
    const pdp = { busy: true, listeners: new Set<(frame: UnitViewFrame) => void>(), live: true };
    const pdpView: LiveUnitView = { file: () => ({ kind: "agent_team", tree: pdpTree() }), statuses: () => [], inputStates: () => [],
      hasOpenWork: () => pdp.busy, subscribe: (listener) => { pdp.listeners.add(listener); return () => pdp.listeners.delete(listener); } };
    const directory = createOrgContainerDirectory(memoryDir);
    const containers = new AgentOrgContainers({
      manager: new AgentOrgContainerManager({ memoryDir, units }),
      streams: { streamOf: () => new RunViewStream<AgentOrgRunEvent>({ isMessageEvent: (event) => event.kind === "communication" }) } as never,
      unitViews: {
        live: (unit: AgentOrgUnit) => unit.runId === "pdp_team_1" && pdp.live ? pdpView : null,
        stored: async (unit: AgentOrgUnit) => unit.kind === "agent" ? { kind: "agent", metadata: { ...concierge(), runId: unit.runId, address: unit.address } }
          : { kind: "agent_team", tree: unit.runId === "pdp_team_1" ? pdpTree() : setTree() },
        onLivenessChanged: () => () => undefined,
      },
      roots: { team: async () => null, agent: async () => null },
      directory,
    });
    await containers.restore("sdd_org_1");
    await directory.loadContainer("sdd_org_1");
    const notices = { recordOrgChange: vi.fn() };
    const runPartsChanged = vi.fn();
    const stored = () => new AgentOrgContainerStore().read(layout.getOrgDirPath("sdd_org_1"), "sdd_org_1");
    return { memoryDir, containers, units, pdp, notices, runPartsChanged, stored, directory };
  };

  it("a new agent unit is a run of its own (Offline); a working unit removed is leaving, then stops and is released; the agents still in the Org are told", async () => {
    const org = await liveOrg();
    const rules = [{ from: "/concierge", to: P, rules: ["When a software request arrives."] }];
    org.containers.bindFollowing({ planner: { viewFor: async () => view([setUnit, conciergeUnit, writerUnit], rules) }, notices: org.notices, runPartsChanged: org.runPartsChanged });
    const result = await org.containers.followDefinition("sdd_org_1");
    expect(org.units.createAgentUnit).toHaveBeenCalledWith(writerUnit, { containedIn: { orgRunId: "sdd_org_1", address: "/writer" }, applicationBinding: null });
    expect(result!.joined.map((unit) => unit.runId)).toEqual(["writer_1"]);
    expect((await org.stored())!.rootOrg.formerUnits).toEqual([{ address: PDP, kind: "agent_team", runId: "pdp_team_1", definitionId: "product-design-prototyping-team", leaving: true }]);
    // Its rows show it leaving while it finishes.
    const own = await new RunOwnAgentsReader(org.memoryDir).ownTreeOf({ rootSubjectKind: "agent_org", rootRunId: "sdd_org_1" });
    expect(own).toMatchObject({ parts: expect.arrayContaining([expect.objectContaining({ address: PDP, leaving: true })]) });
    expect(org.units.stopUnit).not.toHaveBeenCalled();
    // A message to it is refused by name (as a Team's former member): the container no longer answers it.
    expect(org.directory.formerUnitAt("sdd_org_1", `${PDP}/product_prototyper`)).toMatchObject({ runId: "pdp_team_1" });
    expect(org.notices.recordOrgChange).toHaveBeenCalledWith(expect.objectContaining({
      joined: [{ agentRunId: "writer_1", address: "/writer" }], left: [{ agentRunId: "pdp_team_1", address: PDP }] }));
    const recipients = org.notices.recordOrgChange.mock.calls[0]![0].recipients.map((recipient: { agentRunId: string }) => recipient.agentRunId);
    expect(recipients.sort()).toEqual(["architecture_reviewer_1", "concierge_1", "solution_designer_1"]);
    // The rule to the gone unit's member is gone: the designer's Org rules changed.
    const designer = org.notices.recordOrgChange.mock.calls[0]![0].recipients.find((recipient: { agentRunId: string }) => recipient.agentRunId === "solution_designer_1");
    expect([designer.rulesBefore.length, designer.rulesAfter.length]).toEqual([1, 0]);
    expect(org.runPartsChanged).toHaveBeenCalledTimes(1);
    // It finishes: its run stops, its marker is cleared, the rows follow.
    org.pdp.busy = false;
    for (const listener of [...org.pdp.listeners]) listener({ kind: "parts_changed" });
    await vi.waitFor(() => expect(org.units.stopUnit).toHaveBeenCalledWith(expect.objectContaining({ runId: "pdp_team_1" })));
    await vi.waitFor(async () => expect((await org.stored())!.rootOrg.formerUnits).toEqual([
      { address: PDP, kind: "agent_team", runId: "pdp_team_1", definitionId: "product-design-prototyping-team" }]));
    await vi.waitFor(() => expect(org.runPartsChanged).toHaveBeenCalledTimes(2));
  });

  it("an application's Org does not follow; a definition that cannot be used leaves the Org as it is, warned once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const planner = new OrgMembershipPlanner({ orgDefinitions: { getDefinitionById: async () => null, listLoadIssues: async () => [] },
      teamDefinitions: { getDefinitionById: async () => null }, agentDefinitions: { getAgentDefinitionById: async () => null } });
    expect(await planner.viewFor({ ...containerFile(), applicationBinding: { applicationId: "app", bindingId: "b" } } as never)).toBeNull();
    expect(await planner.viewFor(containerFile())).toBeNull();
    expect(await planner.viewFor(containerFile())).toBeNull();
    expect(warn.mock.calls.filter(([text]) => String(text).startsWith("AGENT_ORG_DEFINITION_NOT_FOLLOWED"))).toHaveLength(1);
  });

  it("every definition change, each live Org follows, one after another; a change during a pass asks for one more pass", async () => {
    let release!: () => void;
    const followed: string[] = [];
    let listener!: () => void;
    const changes = new OrgDefinitionChangeListener({ liveOrgRunIds: () => ["org_a", "org_b"],
      follow: async (id) => { followed.push(id); if (followed.length === 1) await new Promise<void>((resolve) => { release = resolve; }); } });
    changes.listen({ subscribe: (callback: () => void) => { listener = callback; return () => undefined; } } as never);
    listener();
    listener();
    await vi.waitFor(() => expect(followed).toEqual(["org_a"]));
    release();
    await vi.waitFor(() => expect(followed).toEqual(["org_a", "org_b", "org_a", "org_b"]));
  });
});

describe("REQ-009: a unit that left is refused by name, as a Team's former member", () => {
  it("a Team unit's message to the former unit's address is refused with autobyteus-22's text", async () => {
    const file = containerFile({ formerUnits: [{ address: "/writer", kind: "agent", runId: "writer_0", definitionId: "writer" }] });
    const directory = directoryOver(() => file);
    const tasks = new InMemoryTaskExecutionResources();
    const index = new DelegationIndex(() => tasks, readerOfAgents(async () => null), directory);
    index.build();
    await directory.loadContainer("sdd_org_1");
    const tree = index.collaborationTreeOf(createTeamRootExecutionIdentity("set_team_1"));
    await expect(tree.resolve("/writer")).rejects.toThrow("writer (/writer) is no longer a member of your team: it was removed from the team definition.");
    await expect(tree.resolve("/nobody")).resolves.toBeNull();
    await expect(index.collaborationTreeOf(createAgentRootExecutionIdentity("concierge_1")).resolve(`${PDP}/product_prototyper`)).resolves.toBe("product_prototyper_1");
  });

  /**
   * SR-015 (CRR-004 A-1, DEC-007): a Team unit's member removed from its Team, idle (former) or still finishing (leaving),
   * is refused by name at its Org address `P/x` to every other unit, with the text its teammates get. The stopped Team
   * unit answers from its stored tree (it is not restored); a live one from its live tree.
   */
  it.each([
    ["idle (former), the Team unit stopped: from its stored tree", false, false],
    ["leaving, the Team unit stopped: a leaving marker outside a live run reads as former", true, false],
    ["leaving, the Team unit live: from its live tree, the stored file unread", true, true],
  ])("SR-015: a Team unit's removed member at P/x, %s, is refused to an agent unit and to another Team unit's member", async (_case, leaving, live) => {
    const tree = setWithoutReviewer();
    const removed = validateTeamRunExecutionTreePayload({ ...tree, rootTeam: { ...tree.rootTeam,
      formerMembers: tree.rootTeam.formerMembers!.map((member) => leaving ? { ...member, leaving: true } : member) } }, "set_team_1");
    const teamTree = vi.fn(async (id: string) => id === "set_team_1" ? removed : id === "pdp_team_1" ? pdpTree() : null);
    const directory = new OrgContainerDirectory({ storedContainer: async (id) => id === "sdd_org_1" ? containerFile() : null,
      teamTree, agentMetadata: async (id) => id === "concierge_1" ? concierge() : null });
    if (live) directory.bindLiveTeams((id) => id === "set_team_1" ? removed : null);
    const tasks = new InMemoryTaskExecutionResources();
    const index = new DelegationIndex(() => tasks, readerOfAgents(async () => null), directory);
    index.build();
    await directory.loadContainer("sdd_org_1");
    teamTree.mockClear();
    const address = `${P}/architecture_reviewer`;
    const text = `architecture_reviewer (${address}) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.`;
    for (const sender of [createAgentRootExecutionIdentity("concierge_1"), createTeamRootExecutionIdentity("pdp_team_1")]) {
      const refused = await index.collaborationTreeOf(sender).resolve(address).then(() => null, (error: unknown) => error);
      expect(refused).toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: text });
      // A current member of the same Team unit is still reached; an address no member ever had is not refused by name.
      await expect(index.collaborationTreeOf(sender).resolve(`${P}/solution_designer`)).resolves.toBe("solution_designer_1");
      await expect(index.collaborationTreeOf(sender).resolve(`${P}/nobody`)).resolves.toBeNull();
    }
    expect(teamTree.mock.calls.some(([id]) => id === "set_team_1")).toBe(!live);
  });
});
