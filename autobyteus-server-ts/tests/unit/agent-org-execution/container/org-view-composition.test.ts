import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RunViewStream, type SequencedRootEvent } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import type { AgentOrgRunEvent } from "../../../../src/agent-org-execution/domain/agent-org-run-event.js";
import type { AgentOrgUnit } from "../../../../src/agent-org-execution/domain/agent-org-container-file.js";
import { composeOrgExecutionTree } from "../../../../src/agent-org-execution/container/org-execution-tree-composition.js";
import { OrgViewComposition, type LiveUnitView, type UnitViewFrame } from "../../../../src/agent-org-execution/container/org-view-composition.js";
import { validateAgentOrgContainerPayload } from "../../../../src/run-history/store/agent-org-container-file-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

/**
 * Design DS-004, R-3, R-3'' (org-teams-follow-definition): an Org container's view is its units' views composed into
 * today's Org view, in the container's own stream. The Org of the storage contract: `/concierge` (agent unit), two Team
 * units; the Team unit `/software_engineering_team` has stored members `/solution_designer`, `/architecture_reviewer`.
 */
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../fixtures/org-container-contract", name), "utf8"));
const P = "/software_engineering_team";
const file = validateAgentOrgContainerPayload(fixture("container-file.json"), "sdd_org_1");
const setTree = validateTeamRunExecutionTreePayload(fixture("team-unit-tree.json"), "set_team_1");
const raw = fixture("team-unit-tree.json");
const pdpTree = validateTeamRunExecutionTreePayload({ ...raw, handoffs: [], containedIn: { orgRunId: "sdd_org_1", address: "/product_design_prototyping_team" },
  rootTeam: { ...raw.rootTeam, teamRunId: "pdp_team_1", teamDefinitionId: "product-design-prototyping-team", coordinatorAddress: "/product_prototyper",
    members: [{ ...raw.rootTeam.members[0], address: "/product_prototyper", agentRunId: "product_prototyper_1" }] } }, "pdp_team_1");
const concierge = fixture("agent-unit-metadata.json") as AgentRunMetadata;
const message = (id: string, sender: string, receiver: string) => ({ messageId: id, senderAgentRunId: sender, receiverAgentRunId: receiver, content: id,
  messageType: "agent_message", referenceFiles: [], createdAt: "2026-11-22T10:00:00.000Z" });
const presentation = (n: number) => ({ type: "SEGMENT_CONTENT", payload: { n } }) as never;

/** A unit root double: it publishes synchronously, as a root's view stream does; its parts change with what it published. */
class UnitDouble {
  readonly listeners = new Set<(frame: UnitViewFrame) => void>();
  published = 0;
  live = true;
  constructor(readonly unit: AgentOrgUnit, private readonly tree: typeof setTree | null) {}
  view(): LiveUnitView {
    return {
      file: () => this.tree ? { kind: "agent_team", tree: this.tree } : null,
      // The status carries how many frames it has published so far: a snapshot shows exactly what was relayed before its base.
      statuses: () => [{ agentRunId: this.tree?.rootTeam.coordinatorAddress ? this.tree.rootTeam.members[0]!.agentRunId : this.unit.runId,
        status: "running", backgroundTasksRunning: this.published }],
      inputStates: () => [],
      hasOpenWork: () => this.published > 0,
      subscribe: (listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener); },
    };
  }
  publish(frame: UnitViewFrame): void { if (frame.kind === "presentation") this.published += 1; for (const listener of [...this.listeners]) listener(frame); }
}

const harness = () => {
  const stream = new RunViewStream<AgentOrgRunEvent>({ isMessageEvent: (event) => event.kind === "communication" });
  const [setUnit, pdpUnit, conciergeUnit] = file.rootOrg.units as [AgentOrgUnit, AgentOrgUnit, AgentOrgUnit];
  const set = new UnitDouble(setUnit, setTree);
  const agent = new UnitDouble(conciergeUnit, null);
  const liveness = new Map<string, () => void>();
  const composition = new OrgViewComposition({ stream, file: () => file, units: {
    live: (unit) => unit.runId === "set_team_1" && set.live ? set.view() : unit.runId === "concierge_1" && agent.live ? agent.view() : null,
    stored: async (unit) => unit.kind === "agent" ? { kind: "agent", metadata: concierge } : { kind: "agent_team", tree: unit.runId === "pdp_team_1" ? pdpTree : setTree },
    onLivenessChanged: (unit, listener) => { liveness.set(unit.runId, listener); return () => liveness.delete(unit.runId); },
  } });
  const events: SequencedRootEvent<AgentOrgRunEvent>[] = [];
  stream.subscribe((event) => events.push(event));
  return { stream, composition, set, agent, liveness, events, pdpUnit };
};

describe("composeOrgExecutionTree (DEC-004: today's Org tree)", () => {
  it("each direct agent at its address, each Team at P with its members in the Org; the rules its agents have", () => {
    const tree = composeOrgExecutionTree(file, new Map([["set_team_1", { kind: "agent_team", tree: setTree }], ["pdp_team_1", { kind: "agent_team", tree: pdpTree }],
      ["concierge_1", { kind: "agent", metadata: concierge }]]));
    expect(tree.rootOrg).toMatchObject({ orgRunId: "sdd_org_1", orgDefinitionId: "software-development-department" });
    expect(tree.rootOrg.members.map((member) => member.address)).toEqual([P, "/product_design_prototyping_team", "/concierge"]);
    expect(tree.rootOrg.members[0]).toMatchObject({ teamRunId: "set_team_1", coordinatorAddress: `${P}/solution_designer`,
      members: [expect.objectContaining({ address: `${P}/solution_designer` }), expect.objectContaining({ address: `${P}/architecture_reviewer` })] });
    expect(tree.rootOrg.members[2]).toMatchObject({ agentRunId: "concierge_1", agentDefinitionId: "concierge",
      launchConfiguration: expect.objectContaining({ llmModelIdentifier: "gpt-6-astra" }) });
    expect(tree.handoffs).toEqual([{ from: `${P}/solution_designer`, to: `${P}/architecture_reviewer`, rules: ["When the design is ready for review."] }, ...file.handoffs]);
    // A unit whose file is absent is left out.
    expect(composeOrgExecutionTree(file, new Map()).rootOrg.members).toEqual([]);
  });
});

describe("OrgViewComposition (R-3, R-3'')", () => {
  it("relays a unit agent's output at its Org address, and a message once (by the unit that has its receiver)", async () => {
    const h = harness();
    await h.composition.start();
    h.set.publish({ kind: "presentation", agentRunId: "architecture_reviewer_1", message: presentation(1) });
    // A message between two units reaches both units' views; only the receiver's unit relays it.
    h.agent.publish({ kind: "communication", message: message("m-1", "concierge_1", "solution_designer_1") });
    h.set.publish({ kind: "communication", message: message("m-1", "concierge_1", "solution_designer_1") });
    // Inside a Team; and leaving the Org (to a run a member delegated): relayed once by the unit that has it.
    h.set.publish({ kind: "communication", message: message("m-2", "solution_designer_1", "architecture_reviewer_1") });
    h.set.publish({ kind: "communication", message: message("m-3", "solution_designer_1", "delegated_writer_1") });
    expect(h.events.map(({ event }) => event.kind === "agent_presentation" ? `${event.execution.memberAddress}:${event.execution.agentRunId}`
      : event.kind === "communication" ? event.message.messageId : event.kind)).toEqual([`${P}/architecture_reviewer:architecture_reviewer_1`, "m-1", "m-2", "m-3"]);
  });

  it("a snapshot composes today's Org view: the tree, every member's status (offline where its unit is not live)", async () => {
    const h = harness();
    await h.composition.start();
    const own = await h.composition.snapshot();
    expect(own.tree.rootOrg.members.map((member) => member.address)).toEqual([P, "/product_design_prototyping_team", "/concierge"]);
    expect(own.statuses.map((status) => [status.execution.memberAddress, status.details.status])).toEqual([
      [`${P}/solution_designer`, "running"], [`${P}/architecture_reviewer`, "offline"],
      ["/product_design_prototyping_team/product_prototyper", "offline"], ["/concierge", "running"]]);
  });

  it("a unit root registered or unregistered, or its parts changed: composition_changed (each view takes an in-band snapshot)", async () => {
    const h = harness();
    await h.composition.start();
    h.set.live = false;
    h.liveness.get("set_team_1")!();
    h.set.publish({ kind: "presentation", agentRunId: "solution_designer_1", message: presentation(9) });
    h.set.live = true;
    h.liveness.get("set_team_1")!();
    h.set.publish({ kind: "parts_changed" });
    expect(h.events.map(({ event }) => event.kind)).toEqual(["composition_changed", "composition_changed", "composition_changed"]);
    h.composition.stop();
    h.set.publish({ kind: "presentation", agentRunId: "solution_designer_1", message: presentation(10) });
    expect(h.events).toHaveLength(3);
  });

  it("R-3'' test: a unit publishing continuously while the Org view opens and re-snapshots: every unit frame appears exactly once, after the base", async () => {
    const h = harness();
    await h.composition.start();
    let n = 0;
    const tick = () => h.set.publish({ kind: "presentation", agentRunId: "solution_designer_1", message: presentation(++n) });
    for (let i = 0; i < 5; i += 1) tick();
    // Two view sessions open while the unit keeps publishing (between the base and the end of the slow read, and after).
    const seen: number[][] = [[], []];
    const open = async (session: 0 | 1) => {
      const connection = await h.composition.openViewSnapshotConnection(() => { tick(); return null; }, async (own) => { tick(); await Promise.resolve(); tick(); return own; });
      // The snapshot shows exactly the frames before its base (the unit's count of published frames at the base).
      const atBase = connection.snapshot.statuses.find((status) => status.execution.agentRunId === "solution_designer_1")!.details.backgroundTasksRunning;
      connection.subscribe(({ event }) => { if (event.kind === "agent_presentation") seen[session]!.push((event.message as unknown as { payload: { n: number } }).payload.n); });
      return atBase;
    };
    const firstBase = await open(0);
    for (let i = 0; i < 3; i += 1) tick();
    const secondBase = await open(1);
    for (let i = 0; i < 4; i += 1) tick();
    expect(seen[0]).toEqual(Array.from({ length: n - firstBase }, (_, i) => firstBase + i + 1));
    expect(seen[1]).toEqual(Array.from({ length: n - secondBase }, (_, i) => secondBase + i + 1));
    // The container stream has every unit frame exactly once.
    expect(h.events.filter(({ event }) => event.kind === "agent_presentation")).toHaveLength(n);
  });
});
