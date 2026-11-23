import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CrossRunMessageDelivery } from "../../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { MessageViewScope } from "../../../../src/agent-collaboration/delegation/message-view-scope.js";
import { RootCommunicationEngine } from "../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { validateCollaborationCommunicationMessageArray } from "../../../../src/agent-collaboration/execution/communication/collaboration-communication-message-schema.js";
import {
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { OrgContainerDirectory } from "../../../../src/agent-org-execution/container/org-container-directory.js";
import type { AgentOrgContainerFile } from "../../../../src/agent-org-execution/domain/agent-org-container-file.js";
import type { TeamRunExecutionTreeFile } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { validateAgentOrgContainerPayload } from "../../../../src/run-history/store/agent-org-container-file-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";
import { communicationPortDouble } from "../../agent-collaboration/helpers/communication-port-double.js";

/**
 * org-teams-follow-definition design R-1, R-2, N-1, storage contract §5: the container directory answers what a unit run
 * asks its container; a unit's step 2 is its container's other units; two units message each other through
 * `CrossRunMessageDelivery`'s `same_container` admission (a receiver not live is restored, DEC-006), and each side's log
 * records the other's Org address. The Org of the contract: `/concierge` (agent unit), `/software_engineering_team` and
 * `/product_design_prototyping_team` (Team units).
 */
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../fixtures/org-container-contract", name), "utf8"));
const SET = createTeamRootExecutionIdentity("set_team_1");
const PDP = createTeamRootExecutionIdentity("pdp_team_1");
const CONCIERGE = createAgentRootExecutionIdentity("concierge_1");
const OUTSIDER = createAgentRootExecutionIdentity("outsider_1");
const P = "/software_engineering_team";

const files = () => {
  let container = validateAgentOrgContainerPayload(fixture("container-file.json"), "sdd_org_1");
  const setTree = validateTeamRunExecutionTreePayload(fixture("team-unit-tree.json"), "set_team_1");
  const raw = fixture("team-unit-tree.json");
  const pdpTree = validateTeamRunExecutionTreePayload({ ...raw, handoffs: [], containedIn: { orgRunId: "sdd_org_1", address: "/product_design_prototyping_team" },
    rootTeam: { ...raw.rootTeam, teamRunId: "pdp_team_1", teamDefinitionId: "product-design-prototyping-team", coordinatorAddress: "/product_prototyper",
      members: [{ ...raw.rootTeam.members[0], address: "/product_prototyper", agentRunId: "product_prototyper_1", agentDefinitionId: "product-prototyper" }] } }, "pdp_team_1");
  const concierge = fixture("agent-unit-metadata.json") as AgentRunMetadata;
  const teams = new Map<string, TeamRunExecutionTreeFile>([["set_team_1", setTree], ["pdp_team_1", pdpTree]]);
  const reads = { teamTree: vi.fn(async (id: string) => teams.get(id) ?? null), agentMetadata: vi.fn(async (id: string) => id === "concierge_1" ? concierge
    : id === "outsider_1" ? { ...concierge, runId: "outsider_1", containedIn: undefined, address: undefined } as AgentRunMetadata : null) };
  const directory = new OrgContainerDirectory({ storedContainer: async (id) => id === "sdd_org_1" ? container : null, ...reads });
  const setContainer = (next: AgentOrgContainerFile) => { container = next; directory.updated(next); };
  return { directory, reads, setTree, container: () => container, setContainer };
};

const tree = (directory: OrgContainerDirectory) => {
  const tasks = new InMemoryTaskExecutionResources();
  const index = new DelegationIndex(() => tasks, readerOfAgents(async () => null), directory);
  index.build(); tasks.setEntriesListener(index);
  return { index, tasks };
};
const member = (root: RootExecutionIdentity, memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({ root, memberAddress: memberAddress as never, agentRunId });

describe("OrgContainerDirectory (design R-2, N-1)", () => {
  it("answers each run's fixed back-link from its own file, read once; a run outside any Org has none", async () => {
    const f = files();
    await expect(f.directory.containedInOf(SET)).resolves.toEqual({ orgRunId: "sdd_org_1", address: P });
    await expect(f.directory.containedInOf(SET)).resolves.toEqual({ orgRunId: "sdd_org_1", address: P });
    expect(f.reads.teamTree).toHaveBeenCalledTimes(1);
    await expect(f.directory.containedInOf(CONCIERGE)).resolves.toEqual({ orgRunId: "sdd_org_1", address: "/concierge" });
    await expect(f.directory.containedInOf(OUTSIDER)).resolves.toBeNull();
    await expect(f.directory.sameContainer(SET, CONCIERGE)).resolves.toBe(true);
    await expect(f.directory.sameContainer(SET, SET)).resolves.toBe(false);
    await expect(f.directory.sameContainer(OUTSIDER, CONCIERGE)).resolves.toBe(false);
  });

  it("every Org address the units answer: an agent unit's, a Team unit's (its coordinator) and its members' P/x", async () => {
    const f = files();
    const placements = (await f.directory.placementsOf("sdd_org_1")).map((placement) => [placement.orgAddress, placement.agentRunId, placement.memberAddress]);
    expect(placements).toEqual([
      [P, "solution_designer_1", "/solution_designer"],
      [`${P}/solution_designer`, "solution_designer_1", "/solution_designer"],
      [`${P}/architecture_reviewer`, "architecture_reviewer_1", "/architecture_reviewer"],
      ["/product_design_prototyping_team", "product_prototyper_1", "/product_prototyper"],
      ["/product_design_prototyping_team/product_prototyper", "product_prototyper_1", "/product_prototyper"],
      ["/concierge", "concierge_1", "/concierge"],
    ]);
    await expect(f.directory.unitOfAgent("sdd_org_1", "architecture_reviewer_1")).resolves.toEqual({ run: SET, orgAddress: `${P}/architecture_reviewer` });
    await expect(f.directory.unitOfAgent("sdd_org_1", "concierge_1")).resolves.toEqual({ run: CONCIERGE, orgAddress: "/concierge" });
    await expect(f.directory.unitOfAgent("sdd_org_1", "nobody")).resolves.toBeNull();
    await expect(f.directory.orgAddressOf(member(SET, "/architecture_reviewer", "architecture_reviewer_1"))).resolves.toBe(`${P}/architecture_reviewer`);
    await expect(f.directory.orgAddressOf(member(CONCIERGE, "/concierge", "concierge_1"))).resolves.toBe("/concierge");
  });

  it("a copy's snapshot at a unit's address, as the Org's configured placement answered: a Team unit mounted at P with its members' rules", async () => {
    const f = files();
    const team = await f.directory.delegationSourceAt("sdd_org_1", P as never);
    expect(team).toMatchObject({ kind: "agent_team", teamDefinitionId: "software-engineering-team", coordinatorAddress: `${P}/solution_designer`,
      members: [expect.objectContaining({ address: `${P}/solution_designer` }), expect.objectContaining({ address: `${P}/architecture_reviewer` })] });
    expect(team?.kind === "agent_team" && team.handoffs).toEqual([
      { from: `${P}/solution_designer`, to: `${P}/architecture_reviewer`, rules: ["When the design is ready for review."] },
      { from: `${P}/solution_designer`, to: "/product_design_prototyping_team/product_prototyper", rules: ["When a product design request is ready."] },
    ]);
    await expect(f.directory.delegationSourceAt("sdd_org_1", "/concierge" as never)).resolves.toMatchObject({ kind: "agent", agentDefinitionId: "concierge",
      launchConfiguration: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-6-astra", workspaceRootPath: "/home/u/workspace" } });
    await expect(f.directory.delegationSourceAt("sdd_org_1", `${P}/architecture_reviewer` as never)).resolves.toMatchObject({ kind: "agent" });
    await expect(f.directory.delegationSourceAt("sdd_org_1", "/nobody" as never)).resolves.toBeNull();
  });

  it("the Org rules from an Org address, as the container file has them now", async () => {
    const f = files();
    await expect(f.directory.loadContainer("sdd_org_1")).resolves.toEqual({ orgDefinitionId: "software-development-department" });
    expect(f.directory.orgRulesFrom("sdd_org_1", "/concierge")).toEqual([{ from: "/concierge", to: P, rules: ["When a software request arrives."] }]);
    f.setContainer({ ...f.container(), handoffs: [] });
    expect(f.directory.orgRulesFrom("sdd_org_1", "/concierge")).toEqual([]);
  });
});

describe("A unit's collaboration tree: step 2 is its container's other units (design R-1)", () => {
  it("a Team unit reaches the other units by their Org addresses, never its own members (step 1 answers those)", async () => {
    const { index } = tree(files().directory);
    const reached = await index.collaborationTreeOf(SET).stepTwo();
    expect([...reached!.keys()]).toEqual(["/product_design_prototyping_team", "/product_design_prototyping_team/product_prototyper", "/concierge"]);
    expect(reached!.get("/concierge")).toMatchObject({ agentRunId: "concierge_1", rank: "configured", ref: { kind: "agent", definitionId: "concierge" } });
    await expect(index.collaborationTreeOf(SET).resolve("/concierge")).resolves.toBe("concierge_1");
    await expect(index.collaborationTreeOf(SET).resolve(`${P}/solution_designer`)).resolves.toBeNull();
    await expect(index.collaborationTreeOf(CONCIERGE).resolve(`${P}/architecture_reviewer`)).resolves.toBe("architecture_reviewer_1");
    // A run outside any Org has no step 2 (no Task names it).
    await expect(index.collaborationTreeOf(OUTSIDER).stepTwo()).resolves.toBeNull();
  });

  it("a sender of another unit is named to the receiver by its Org address (the received header, CM-9's records)", async () => {
    const { index } = tree(files().directory);
    await expect(index.collaborationTreeOf(CONCIERGE).reachingAddressOf(member(SET, "/solution_designer", "solution_designer_1"))).resolves.toBe(`${P}/solution_designer`);
    await expect(index.collaborationTreeOf(SET).reachingAddressOf(member(CONCIERGE, "/concierge", "concierge_1"))).resolves.toBe("/concierge");
    await expect(index.collaborationTreeOf(SET).reachingAddressOf(member(OUTSIDER, "/concierge", "outsider_1"))).resolves.toBeNull();
  });

  it("delegate_task to another unit's address is a copy from that unit's snapshot (configured placement)", async () => {
    const { index } = tree(files().directory);
    await expect(index.collaborationTreeOf(SET).delegationPlacementAt("/concierge" as never)).resolves.toMatchObject({ kind: "agent", address: "/concierge",
      source: { kind: "agent", agentDefinitionId: "concierge" } });
    await expect(index.collaborationTreeOf(CONCIERGE).delegationPlacementAt(P as never)).resolves.toMatchObject({ kind: "agent_team", address: P,
      coordinatorAddress: `${P}/solution_designer`, copiedFrom: "configured_placement" });
  });

  it("a direct Org agent: the Org's rules from its address (read at each call), the Org's instruction, team-scoped, the organization line", async () => {
    const f = files();
    const { index } = tree(f.directory);
    const collaboration = await index.collaborationTreeOf(CONCIERGE).agentCollaboration();
    expect(collaboration).toMatchObject({ role: "org_agent", teamScoped: true, inOrganization: true, placement: { orgDefinitionId: "software-development-department" } });
    expect(collaboration.placement!.handoffs()).toEqual([{ from: "/concierge", to: P, rules: ["When a software request arrives."] }]);
    f.setContainer({ ...f.container(), handoffs: [{ from: "/concierge", to: "/product_design_prototyping_team", rules: ["When it is a design request."] }] });
    expect(collaboration.placement!.handoffs()).toEqual([{ from: "/concierge", to: "/product_design_prototyping_team", rules: ["When it is a design request."] }]);
    await expect(index.collaborationTreeOf(SET).inOrganization()).resolves.toBe(true);
    await expect(index.collaborationTreeOf(OUTSIDER).inOrganization()).resolves.toBe(false);
  });

  it("a copy a unit delegated: a copy of the Org's direct agent keeps its Org rules; it is team-scoped and in the Org", async () => {
    const { index, tasks } = tree(files().directory);
    tasks.addTask("T1"); tasks.addTask("T2");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/concierge", execution: { agentRunId: "concierge_copy" },
      delegatedFrom: { delegatingRun: CONCIERGE, delegatorAgentRunId: "concierge_1" } } as never);
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/helpers", execution: { teamRunId: "helpers" },
      delegatedFrom: { delegatingRun: SET, delegatorAgentRunId: "solution_designer_1" }, teamCoordinatorAgentRunId: "helpers-lead" } as never);
    const copy = await index.collaborationTreeOf(createAgentRootExecutionIdentity("concierge_copy")).agentCollaboration();
    expect(copy).toMatchObject({ role: "task_agent", teamScoped: true, inOrganization: false, placement: { orgDefinitionId: "software-development-department" } });
    expect(copy.placement!.handoffs()).toEqual([{ from: "/concierge", to: P, rules: ["When a software request arrives."] }]);
    await expect(index.collaborationTreeOf(createTeamRootExecutionIdentity("helpers")).inOrganization()).resolves.toBe(true);
  });
});

describe("Messages between units: CrossRunMessageDelivery's same_container admission (design R-2, DEC-006, contract §5)", () => {
  const harness = () => {
    const f = files();
    const { index } = tree(f.directory);
    const engines = new Map<string, RootCommunicationEngine>([["concierge_1", CONCIERGE], ["set_team_1", SET], ["outsider_1", OUTSIDER]]
      .map(([id, root]) => [id as string, new RootCommunicationEngine(communicationPortDouble(root as RootExecutionIdentity))]));
    const engineOf = (run: RootExecutionIdentity) => engines.get(run.rootRunId)!;
    const restored = vi.fn();
    const scope = new MessageViewScope({ tree: index });
    const delivery = new CrossRunMessageDelivery({
      tree: () => index, tasks: () => ({ isOpen: () => true }) as never,
      senderRoot: (run) => engineOf(run),
      receiverRoot: async (run) => {
        restored(run);
        const engine = engineOf(run);
        const { agentRunId, address } = run.rootRunId === "set_team_1" ? { agentRunId: "solution_designer_1", address: "/solution_designer" } : { agentRunId: "concierge_1", address: "/concierge" };
        return { acceptFromRun: (input) => engine.acceptFromRun({ ...input, receiverIdentity: member(run, address, agentRunId), receiverDisplayName: address.slice(1) }) };
      },
      activeReceiverRoot: () => null,
      runningAgents: { rootOf: () => null },
      senderAddress: (message) => index.collaborationTreeOf(message.receiverRun).reachingAddressOf(message.sender),
      runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null }, peerNotices: { changed: vi.fn() } as never,
      containers: f.directory,
    });
    const send = (sender: ReturnType<typeof member>, targetAgentRunId: string) => delivery.route({ sender, senderDisplayName: sender.memberAddress.slice(1),
      targetAgentRunId, content: "A software request.", messageType: "handoff", referenceFiles: [] });
    return { delivery, send, engineOf, restored, scope };
  };
  const reload = (engine: RootCommunicationEngine) => validateCollaborationCommunicationMessageArray(JSON.parse(JSON.stringify(engine.getMessages())));

  it("an agent unit to a Team unit's member that is not live: the Team unit is restored and the message delivered, no Task asked", async () => {
    const h = harness();
    await expect(h.send(member(CONCIERGE, "/concierge", "concierge_1"), "solution_designer_1")).resolves.toMatchObject({ accepted: true, agentRunId: "solution_designer_1" });
    expect(h.restored).toHaveBeenCalledExactlyOnceWith(SET);
  });

  it("contract §5: one line in each unit's log, same message ID, each recording the other side's Org address; a reload reads them back", async () => {
    const h = harness();
    await h.send(member(CONCIERGE, "/concierge", "concierge_1"), "solution_designer_1");
    const [received] = reload(h.engineOf(SET));
    const [sent] = reload(h.engineOf(CONCIERGE));
    expect(received).toMatchObject({ senderAgentRunId: "concierge_1", receiverAgentRunId: "solution_designer_1", messageType: "handoff",
      counterpart: { address: "/concierge", nodeId: null } });
    expect(sent).toEqual({ ...received, counterpart: { address: `${P}/solution_designer`, nodeId: null } });
    // And back: the Team unit's member is recorded at P/x on the agent unit's line (never its team-space address).
    await h.send(member(SET, "/solution_designer", "solution_designer_1"), "concierge_1");
    expect(reload(h.engineOf(CONCIERGE)).at(-1)).toMatchObject({ senderAgentRunId: "solution_designer_1", counterpart: { address: `${P}/solution_designer`, nodeId: null } });
    expect(reload(h.engineOf(SET)).at(-1)).toMatchObject({ receiverAgentRunId: "concierge_1", counterpart: { address: "/concierge", nodeId: null } });
  });

  it("the views of its two runs show it (the Org view composes them); no other run's", () => {
    const h = harness();
    const sides = { sender: { run: CONCIERGE }, receiver: { run: SET }, relation: "same_container" as const };
    expect(h.scope.inView(SET, sides)).toBe(true);
    expect(h.scope.inView(CONCIERGE, sides)).toBe(true);
    expect(h.scope.inView(PDP, sides)).toBe(false);
  });

  it("a run outside the Org is not admitted by the container: no Task relates it and its receiver does not run, so not this route's", async () => {
    const h = harness();
    await expect(h.send(member(OUTSIDER, "/outsider", "outsider_1"), "solution_designer_1")).resolves.toBeNull();
    expect(h.restored).not.toHaveBeenCalled();
  });
});
