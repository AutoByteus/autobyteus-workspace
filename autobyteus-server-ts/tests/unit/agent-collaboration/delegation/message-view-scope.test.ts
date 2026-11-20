import { describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { MessageViewScope } from "../../../../src/agent-collaboration/delegation/message-view-scope.js";
import type { MessageRelation, MessageSide } from "../../../../src/agent-collaboration/execution/communication/message-publication.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { NO_RUN_PARTS } from "../../../helpers/run-agents-reader.js";

/**
 * autobyteus-565: `MessageViewScope`, the one rule of which messages a run's view shows, live and stored.
 * Manager M (an Agent root) delegated Team W, which delegated agent run H; P is an unrelated PM; a Team root T and an
 * Org root O stand for the Team and Org views. Related and same-run messages keep base's rule (SR-074); a message with an
 * unrelated run or another node is in the view of an Agent root that is one of its two runs, and in no other.
 */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const W = { rootSubjectKind: "agent_team" as const, rootRunId: "worker" };
const H = { rootSubjectKind: "agent" as const, rootRunId: "helper" };
const P = { rootSubjectKind: "agent" as const, rootRunId: "other-pm" };
const T = { rootSubjectKind: "agent_team" as const, rootRunId: "team" };
const O = { rootSubjectKind: "agent_org" as const, rootRunId: "org" };
const peer: MessageSide = { nodeId: "srv_b" };

const scope = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" },
    execution: { teamRunId: "worker" }, teamCoordinatorAgentRunId: "worker-lead" });
  await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/helper", delegatedFrom: { delegatingRun: W, delegatorAgentRunId: "worker-lead" },
    execution: { agentRunId: "helper" } });
  return new MessageViewScope({ tree });
};
const run = (root: typeof M | typeof W | typeof T | typeof O | typeof P | typeof H): MessageSide => ({ run: root });
const at = (relation: MessageRelation, sender: MessageSide, receiver: MessageSide) => ({ relation, sender, receiver });

describe("MessageViewScope (autobyteus-565)", () => {
  it("same_run and related: base's rule: a view that is one of the runs, or whose tree holds both", async () => {
    const s = await scope();
    expect(s.inView(T, at("same_run", run(T), run(T)))).toBe(true);
    expect(s.inView(O, at("same_run", run(O), run(O)))).toBe(true);
    // W -> H: in W's (a side), H's (a side) and M's (both in its tree) views.
    for (const view of [W, H, M]) expect(s.inView(view, at("related", run(W), run(H)))).toBe(true);
    // M -> H (two hops): in M's, H's; not W's (M is above W, not in W's tree).
    expect(s.inView(M, at("related", run(M), run(H)))).toBe(true);
    expect(s.inView(W, at("related", run(M), run(H)))).toBe(false);
  });

  it("unrelated: only the view of an Agent root that is one of the two runs (each PM's own view); no run above, no Team or Org view", async () => {
    const s = await scope();
    expect(s.inView(P, at("unrelated", run(P), run(M)))).toBe(true);
    expect(s.inView(M, at("unrelated", run(P), run(M)))).toBe(true);
    // A Team root's own message with an unrelated run is not in its view (REQ-006: Team/Org views unchanged).
    expect(s.inView(T, at("unrelated", run(T), run(P)))).toBe(false);
    expect(s.inView(O, at("unrelated", run(P), run(O)))).toBe(false);
    // H's message with P: in H's own view; not in W's or M's above it.
    expect(s.inView(H, at("unrelated", run(H), run(P)))).toBe(true);
    expect(s.inView(W, at("unrelated", run(H), run(P)))).toBe(false);
    expect(s.inView(M, at("unrelated", run(H), run(P)))).toBe(false);
  });

  it("remote: only the local Agent root's own view, sent or received", async () => {
    const s = await scope();
    expect(s.inView(M, at("remote", run(M), peer))).toBe(true);
    expect(s.inView(M, at("remote", peer, run(M)))).toBe(true);
    expect(s.inView(T, at("remote", run(T), peer))).toBe(false);
    expect(s.inView(O, at("remote", peer, run(O)))).toBe(false);
    expect(s.inView(M, at("remote", run(H), peer))).toBe(false);
    expect(s.inView(W, at("remote", peer, run(H)))).toBe(false);
  });

  it("the stored rule: a standalone run's own agent's list keeps every message; any other list keeps base's rule", async () => {
    const s = await scope();
    const msg = (senderAgentRunId: string, receiverAgentRunId: string) => ({ messageId: "m", senderAgentRunId, receiverAgentRunId, content: "",
      messageType: "agent_message", referenceFiles: [], createdAt: "2026-11-13T00:00:00.000Z" });
    const tree = new Set(["manager", "worker-lead", "helper"]);
    const filter = (view: typeof M | typeof T, participantAgentRunId: string) => s.participantFilter({ view, participantAgentRunId,
      isAgentOfTree: (id) => tree.has(id), isPastParticipant: (id) => id === "solo" });
    expect(s.isOwnAgentList(M, "manager")).toBe(true);
    expect(s.isOwnAgentList(M, "helper")).toBe(false);
    expect(s.isOwnAgentList(T, "team")).toBe(false);
    expect(filter(M, "manager")(msg("manager", "other-pm"))).toBe(true);
    expect(filter(M, "manager")(msg("remote-pm", "manager"))).toBe(true);
    // An open row's agent in the Manager's view: base's rule.
    expect(filter(M, "helper")(msg("helper", "other-pm"))).toBe(false);
    expect(filter(M, "helper")(msg("manager", "helper"))).toBe(true);
    expect(filter(M, "helper")(msg("solo", "helper"))).toBe(true);
    expect(filter(T, "manager")(msg("manager", "other-pm"))).toBe(false);
  });
});
