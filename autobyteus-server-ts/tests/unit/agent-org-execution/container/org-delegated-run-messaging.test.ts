import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CrossRunMessageDelivery } from "../../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { MessageViewScope } from "../../../../src/agent-collaboration/delegation/message-view-scope.js";
import { RootCommunicationEngine } from "../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { GlobalAgentRunMessageRouter } from "../../../../src/agent-communication/services/global-agent-run-message-router.js";
import { SendMessageToDispatcher } from "../../../../src/agent-communication/services/send-message-to-dispatcher.js";
import { OrgContainerDirectory } from "../../../../src/agent-org-execution/container/org-container-directory.js";
import { planLogSplit } from "../../../../src/app-data-migrations/migrations/agent-org-units-own-runs-v1/org-log-split.js";
import type { TeamRunExecutionTreeFile } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { validateAgentOrgContainerPayload } from "../../../../src/run-history/store/agent-org-container-file-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";
import { communicationPortDouble } from "../../agent-collaboration/helpers/communication-port-double.js";

/**
 * org-teams-follow-definition design R-8 and SR-014 (after CRR-001 CR-001), entering through `send_message_to`: a run an Org
 * unit delegated reaches the Org's units by their Org addresses, as when the Org run was its assigner (step 2: its assigner
 * is a unit run, which contributes its container's placements), and its messages to them are related runs' messages (the
 * Task relation extended along the delegation chain): the receiver is restored when stopped, no `counterpart` on either
 * line, shown as a related line. `same_container` stays for two units. The Org of the storage contract: `/concierge` (agent
 * unit), `/software_engineering_team` (Team unit: `/solution_designer` coordinator, `/architecture_reviewer`),
 * `/product_design_prototyping_team` (Team unit: `/product_prototyper`).
 * Delegations, as the conversion writes them (contract §6) and as a unit writes them now: the concierge assigned T1 to
 * `writer_copy` (an agent run); the Team unit's solution designer assigned T2 to `pdp_copy` (a copy of the other Team unit,
 * R-1'''); an older delegation that named no delegator (T3, `old_copy`) stays with the container itself.
 */
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../fixtures/org-container-contract", name), "utf8"));
const P = "/software_engineering_team";
const PDP_ADDRESS = "/product_design_prototyping_team";
const SET = createTeamRootExecutionIdentity("set_team_1");
const PDP = createTeamRootExecutionIdentity("pdp_team_1");
const CONCIERGE = createAgentRootExecutionIdentity("concierge_1");
const ORG = createAgentOrgRootExecutionIdentity("sdd_org_1");
const WRITER_COPY = createAgentRootExecutionIdentity("writer_copy");
const PDP_COPY = createTeamRootExecutionIdentity("pdp_copy");
const OLD_COPY = createAgentRootExecutionIdentity("old_copy");
/** Each agent's run and own address in it. */
const AGENTS: Record<string, Readonly<{ run: RootExecutionIdentity; address: string }>> = {
  concierge_1: { run: CONCIERGE, address: "/concierge" },
  solution_designer_1: { run: SET, address: "/solution_designer" },
  architecture_reviewer_1: { run: SET, address: "/architecture_reviewer" },
  product_prototyper_1: { run: PDP, address: "/product_prototyper" },
  writer_copy: { run: WRITER_COPY, address: "/writer" },
  pdp_copy_lead: { run: PDP_COPY, address: "/product_prototyper" },
  old_copy: { run: OLD_COPY, address: "/helper" },
};
const member = (agentRunId: string) => createCollaborationMemberExecutionIdentity({ root: AGENTS[agentRunId]!.run, memberAddress: AGENTS[agentRunId]!.address as never, agentRunId });

const harness = async () => {
  const container = validateAgentOrgContainerPayload(fixture("container-file.json"), "sdd_org_1");
  const setTree = validateTeamRunExecutionTreePayload(fixture("team-unit-tree.json"), "set_team_1");
  const raw = fixture("team-unit-tree.json");
  const pdpTree = validateTeamRunExecutionTreePayload({ ...raw, handoffs: [], containedIn: { orgRunId: "sdd_org_1", address: PDP_ADDRESS },
    rootTeam: { ...raw.rootTeam, teamRunId: "pdp_team_1", teamDefinitionId: "product-design-prototyping-team", coordinatorAddress: "/product_prototyper",
      members: [{ ...raw.rootTeam.members[0], address: "/product_prototyper", agentRunId: "product_prototyper_1", agentDefinitionId: "product-prototyper" }] } }, "pdp_team_1");
  const teams = new Map<string, TeamRunExecutionTreeFile>([["set_team_1", setTree], ["pdp_team_1", pdpTree]]);
  const directory = new OrgContainerDirectory({ storedContainer: async (id) => id === "sdd_org_1" ? container : null,
    teamTree: async (id) => teams.get(id) ?? null, agentMetadata: async (id) => id === "concierge_1" ? fixture("agent-unit-metadata.json") as AgentRunMetadata : null });
  const tasks = new InMemoryTaskExecutionResources();
  const index = new DelegationIndex(() => tasks, readerOfAgents(async (run) => Object.entries(AGENTS).filter(([, agent]) => agent.run.rootRunId === run.rootRunId)
    .map(([agentRunId, agent]) => ({ agentRunId, address: agent.address, agentDefinitionId: null }))), directory);
  index.build();
  tasks.setEntriesListener(index);
  for (const taskId of ["T1", "T2", "T3"]) tasks.addTask(taskId);
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/writer", execution: { agentRunId: "writer_copy" },
    delegatedFrom: { delegatingRun: CONCIERGE, delegatorAgentRunId: "concierge_1" } } as never);
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: PDP_ADDRESS, execution: { teamRunId: "pdp_copy" },
    delegatedFrom: { delegatingRun: SET, delegatorAgentRunId: "solution_designer_1" }, teamCoordinatorAgentRunId: "pdp_copy_lead" } as never);
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T3", recipientAddress: "/helper", execution: { agentRunId: "old_copy" },
    delegatedFrom: { delegatingRun: ORG } } as never);
  await directory.loadContainer("sdd_org_1");

  const engines = new Map([CONCIERGE, SET, PDP, WRITER_COPY, PDP_COPY, OLD_COPY].map((run) => [run.rootRunId, new RootCommunicationEngine(communicationPortDouble(run))]));
  const engineOf = (run: RootExecutionIdentity) => engines.get(run.rootRunId)!;
  /** Runs live now; any other is stopped, and a message restores it. */
  const live = new Set<string>();
  const restored: string[] = [];
  const delivery = new CrossRunMessageDelivery({
    tree: () => index, tasks: () => tasks,
    senderRoot: (run) => engineOf(run),
    receiverRoot: async (run) => {
      if (!live.has(run.rootRunId)) { restored.push(run.rootRunId); live.add(run.rootRunId); }
      return { acceptFromRun: (input) => {
        const receiverAgentRunId = input.message.receiverAgentRunId;
        return engineOf(run).acceptFromRun({ ...input, receiverIdentity: member(receiverAgentRunId), receiverDisplayName: AGENTS[receiverAgentRunId]!.address.slice(1) });
      } };
    },
    activeReceiverRoot: () => null,
    runningAgents: { rootOf: () => null },
    senderAddress: (message) => index.collaborationTreeOf(message.receiverRun).reachingAddressOf(message.sender),
    runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null }, peerNotices: { changed: vi.fn() } as never,
    containers: directory,
  });
  const dispatcher = new SendMessageToDispatcher({ tree: index, globalRouter: new GlobalAgentRunMessageRouter({ activeRootDirectory: new ActiveCollaborationRootDirectory(),
    channel: () => null, coordinators: index, agentRunManager: { getActiveRun: () => null }, crossRun: delivery,
    nodes: { check: async () => null }, outgoing: { send: async () => ({ ok: true as const, files: [] }) } }) });
  /** `send_message_to` by one agent: its own run does not have the address (step 1 misses), so step 2 and the cross-run route follow. */
  const send = (agentRunId: string, target: Readonly<{ recipient_address: string } | { target_agent_run_id: string }>, content = "A request.") =>
    dispatcher.dispatch({ toolName: "send_message_to", rawArguments: { ...target, content }, sender: buildAgentRunMessageSenderContext({ senderRunId: agentRunId,
      memberExecutionContext: { identity: member(agentRunId), collaboration: { deliverLogicalMessage: async () => ({ accepted: false,
        code: "COLLABORATION_TARGET_NOT_FOUND", message: "Not a member of your own run." }) } } as never }) });
  return { send, engineOf, live, restored, index, tasks, scope: new MessageViewScope({ tree: index }) };
};
const last = (engine: RootCommunicationEngine) => JSON.parse(JSON.stringify(engine.getMessages().at(-1))) as Record<string, unknown>;

describe("R-8, SR-014: a run an Org unit delegated messages the Org's units by Org address (send_message_to)", () => {
  it.each([
    ["delegated by the agent unit", "writer_copy"],
    ["delegated by a Team unit's member (a copy of another unit)", "pdp_copy_lead"],
    ["delegated by the container itself (an older delegation that named no delegator, contract §6)", "old_copy"],
  ])("%s: (a) an agent unit, (b) a Team unit member as P/x, (c) a Team unit as P: delivered as related; a stopped unit is restored", async (_label, sender) => {
    for (const [address, receiver, unit] of [["/concierge", "concierge_1", CONCIERGE], [`${P}/architecture_reviewer`, "architecture_reviewer_1", SET],
      [P, "solution_designer_1", SET]] as const) {
      for (const stopped of [true, false]) {
        const h = await harness();
        if (!stopped) h.live.add(unit.rootRunId);
        const result = await h.send(sender, { recipient_address: address });
        expect(result, `${address} (${stopped ? "stopped" : "live"})`).toMatchObject({ accepted: true, message: `Delivered message to ${address}.` });
        expect(h.restored).toEqual(stopped ? [unit.rootRunId] : []);
        // Related runs: no counterpart on either line (as today's related line); one message ID in both logs.
        const received = last(h.engineOf(unit));
        const sent = last(h.engineOf(AGENTS[sender]!.run));
        expect(received).toMatchObject({ senderAgentRunId: sender, receiverAgentRunId: receiver });
        expect(received).not.toHaveProperty("counterpart");
        expect(sent).toEqual(received);
      }
    }
  });

  it("a unit's message to a run another unit of its container delegated, by run ID, is related too (restored when stopped)", async () => {
    const h = await harness();
    await expect(h.send("concierge_1", { target_agent_run_id: "pdp_copy_lead" })).resolves.toMatchObject({ accepted: true });
    expect(h.restored).toEqual(["pdp_copy"]);
    expect(last(h.engineOf(PDP_COPY))).not.toHaveProperty("counterpart");
    expect(last(h.engineOf(CONCIERGE))).toEqual(last(h.engineOf(PDP_COPY)));
  });

  it("CR-005: a unit agent continues a closed Task it delegated (reopened and delivered); a unit that did not delegate it is refused as closed", async () => {
    for (const [delegator, copyAgent, copyRun, taskId] of [["concierge_1", "writer_copy", WRITER_COPY, "T1"], ["solution_designer_1", "pdp_copy_lead", PDP_COPY, "T2"]] as const) {
      const h = await harness();
      const execution = copyRun.rootSubjectKind === "agent" ? { agentRunId: copyRun.rootRunId } : { teamRunId: copyRun.rootRunId };
      await h.tasks.markStarted(execution);
      h.tasks.close(taskId);
      // Closed: no unit is related to it any more (the Task rule's condition); a unit that did not delegate it is refused.
      const other = delegator === "concierge_1" ? "architecture_reviewer_1" : "concierge_1";
      await expect(h.send(other, { target_agent_run_id: copyAgent })).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
      // The Task back to TODO: its assigner's message continues it.
      h.tasks.setTaskOpen(taskId);
      await expect(h.send(delegator, { target_agent_run_id: copyAgent }), `${delegator} continues ${copyAgent}`)
        .resolves.toMatchObject({ accepted: true, message: expect.stringContaining("continues with its conversation") });
      expect(h.tasks.isOpen(execution)).toBe(true);
      expect(last(h.engineOf(copyRun))).toMatchObject({ senderAgentRunId: delegator, receiverAgentRunId: copyAgent });
    }
  });

  it("two units stay same_container (counterpart Org addresses), and a run no unit delegated reaches no Org address", async () => {
    const h = await harness();
    await expect(h.send("concierge_1", { recipient_address: `${P}/architecture_reviewer` })).resolves.toMatchObject({ accepted: true });
    expect(last(h.engineOf(SET))).toMatchObject({ counterpart: { address: "/concierge", nodeId: null } });
    // Not in the container: an address that is no unit's is still not found.
    await expect(h.send("writer_copy", { recipient_address: "/nobody" })).resolves.toMatchObject({ accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND" });
  });

  it("shown as today's related line: in the two parties' views (the Org view relays the receiving unit's), the delegating unit's only when it is a party", async () => {
    const h = await harness();
    const toConcierge = { sender: { run: PDP_COPY }, receiver: { run: CONCIERGE }, relation: "related" as const };
    expect(h.scope.inView(PDP_COPY, toConcierge)).toBe(true);
    expect(h.scope.inView(CONCIERGE, toConcierge)).toBe(true);
    // The delegating unit (the Team unit whose member delegated the copy) is no party here.
    expect(h.scope.inView(SET, toConcierge)).toBe(false);
    const toDelegator = { sender: { run: PDP_COPY }, receiver: { run: SET }, relation: "related" as const };
    expect(h.scope.inView(SET, toDelegator)).toBe(true);
    expect(h.scope.inView(PDP, toDelegator)).toBe(false);
  });

  it("SR-014 converted lines: the released Org log's line between a member and a run it delegated, split into the unit's log, equals the live line", async () => {
    const h = await harness();
    await h.send("writer_copy", { recipient_address: "/concierge" }, "Draft ready.");
    const live = last(h.engineOf(CONCIERGE));
    // The same message as the released Org log stored it (a related line: no counterpart), put through the conversion's split.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "org-chain-line-"));
    try {
      fs.writeFileSync(path.join(dir, "agent_org_communication_messages_active.jsonl"), `${JSON.stringify(live)}\n`);
      const agents = new Map([["concierge_1", { unitRunId: "concierge_1", unitDir: path.join(dir, "concierge"), logName: "communication_messages" as const, orgAddress: "/concierge" }]]);
      const split = await planLogSplit(dir, agents);
      const lines = split.logs.get(path.join(dir, "concierge"))!.lines;
      expect(lines.map((line) => JSON.parse(line))).toEqual([live]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
