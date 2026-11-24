import type { ClientIdentity } from "../../../src/node-access/domain/client-identity.js";
import { describe, expect, it, vi } from "vitest";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import type { RemoteRootDirectory } from "../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteRunViewProvider } from "../../../src/remote-collaboration/inbound/remote-run-view-provider.js";
import type { RunAgentAccess, RunAgentPresentationListener } from "../../../src/agent-collaboration/execution/remote/run-agent-access.js";
import { AgentStreamSequences } from "../../../src/services/agent-streaming/agent-stream-sequence.js";
import { NO_FILES_RECEIVED } from "../../helpers/explicit-host-collaborators.js";

/** autobyteus-278: the running node's one inbound owner of what a peer's owner reads and drives (link check first). */

const SELF = "srv_self_node_000000000000000000000000";
const ALPHA: PeerNode = { nodeId: "srv_alpha_000000000000000000000000000", name: "alpha", baseUrl: "http://alpha:29700", addedAt: "2026-10-20T09:00:00.000Z", paired: true };
const OTHER: PeerNode = { ...ALPHA, nodeId: "srv_other_000000000000000000000000000", name: "other" };
const TEAM = { kind: "agent_team" as const, runId: "team-run" };
const status = { type: "AGENT_STATUS", payload: { status: "running", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null } } as never;

const harness = () => {
  let listener: RunAgentPresentationListener | null = null;
  let ended: (() => void) | null = null;
  const observation = { close: vi.fn() };
  const access: RunAgentAccess = {
    observeRunAgents: vi.fn(async (_runId: string, onPresentation: RunAgentPresentationListener, onEnded: () => void) => {
      listener = onPresentation; ended = onEnded; return observation; }),
    executeOwnerCommand: vi.fn(async () => ({ accepted: true })),
    runAgentStatuses: vi.fn(() => [{ agentRunId: "lead-run", status: "running" as const, backgroundTasksRunning: 0 }]),
  };
  // The run was started by alpha's delegation and pairs with the Team's members.
  const storedLinkCheck = vi.fn(async (root: { runId: string }, query: { kind: string; fromNodeId: string; targetAgentRunId?: string | null }) => {
    if (root.runId !== "team-run") return "not_found" as const;
    if (query.kind !== "owner" || query.fromNodeId !== ALPHA.nodeId) return "not_linked" as const;
    return query.targetAgentRunId === null || query.targetAgentRunId === "lead-run" ? "proceed" as const : "not_linked" as const;
  });
  const roots = { storedLinkCheck, runAgents: () => access } as unknown as RemoteRootDirectory;
  const launches = [{ address: "/lead", runtimeKind: "autobyteus", llmModelIdentifier: "sonnet", source: { origin: "team_default" as const, fallbacks: [] } }];
  const views = { runTitle: vi.fn(async () => "Plan the October campaign"), runLaunches: vi.fn(async () => launches), agentProjection: vi.fn(async () => ({
    agentRunId: "lead-run", conversation: [], activities: [], summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: true,
  })) };
  // autobyteus-461 SR-088: the agents' own stream sequences (the lead's is attached to a fake run below).
  const sequences = new AgentStreamSequences();
  const leadListeners = new Set<(event: unknown) => void>();
  sequences.attachToRun({ runId: "lead-run", config: { memoryDir: null },
    subscribeToEvents: (listener: (event: unknown) => void) => { leadListeners.add(listener); return () => leadListeners.delete(listener); } } as never,
  { whenPersisted: async () => undefined });
  const provider = new RemoteRunViewProvider(roots, views, sequences);
  const gateway = new PeerGateway({ receivedFiles: NO_FILES_RECEIVED,
    ownNodeId: async () => SELF, capability: { isEnabled: () => true },
    peers: { findByNodeId: async (nodeId) => [ALPHA, OTHER].find((peer) => peer.nodeId === nodeId) ?? null },
    delegatedRuns: {} as never, messages: {} as never, availableAgents: {} as never, runningAgents: {} as never, runViews: provider, delegatedRunStates: {} as never, peerRunMembers: {} as never,
  });
  return { access, storedLinkCheck, views, provider, gateway, observation,
    emitLead: (event: unknown) => leadListeners.forEach((listener) => listener(event)), emit: (...args: Parameters<RunAgentPresentationListener>) => listener?.(...args),
    /** The root kind reports the run ended (stop, terminate or delete by any path). */
    end: () => ended?.() };
};
const envelope = (from: PeerNode = ALPHA) => ({ fromNodeId: from.nodeId, toNodeId: SELF });
/** The identity the node access gate established from the request's signature: the node the body names. */
const peerCallerOfBody = (body: Readonly<{ fromNodeId: string }> & Record<string, unknown>): ClientIdentity => ({ kind: "peer", nodeId: body.fromNodeId });

describe("RemoteRunViewProvider behind the gateway", () => {
  it("answers summaries only for runs the calling node's delegation started, with the stored title and live statuses", async () => {
    const f = harness();
    const response = await f.gateway.runSummaries({ ...envelope(), runs: [TEAM, { kind: "agent", runId: "unknown-run" }] }, peerCallerOfBody({ ...envelope(), runs: [TEAM, { kind: "agent", runId: "unknown-run" }] }));
    expect(response).toEqual({ status: 200, answer: { accepted: true, nodeId: SELF,
      runs: [{ kind: "agent_team", runId: "team-run", title: "Plan the October campaign", statuses: [{ agentRunId: "lead-run", status: "running", backgroundTasksRunning: 0 }],
        launches: [{ address: "/lead", runtimeKind: "autobyteus", llmModelIdentifier: "sonnet", source: { origin: "team_default", fallbacks: [] } }] }] } });
    expect(f.storedLinkCheck).toHaveBeenCalledWith(TEAM, { kind: "owner", fromNodeId: ALPHA.nodeId, targetAgentRunId: null });
    const other = await f.gateway.runSummaries({ ...envelope(OTHER), runs: [TEAM] }, peerCallerOfBody({ ...envelope(OTHER), runs: [TEAM] }));
    expect(other.answer).toEqual({ accepted: true, nodeId: SELF, runs: [] });
    expect((await f.gateway.runSummaries({ ...envelope(), runs: [{ kind: "agent_org", runId: "org" }] }, peerCallerOfBody({ ...envelope(), runs: [{ kind: "agent_org", runId: "org" }] }))).status).toBe(400);
  });

  it("a projection and a command are checked for the paired agent; the run's end, by any path, closes its observation", async () => {
    const f = harness();
    const projection = await f.gateway.agentProjection({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run" }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run" }));
    expect(projection.answer).toMatchObject({ accepted: true, projection: { agentRunId: "lead-run" } });
    const refused = await f.gateway.agentProjection({ ...envelope(), targetRoot: TEAM, agentRunId: "b-local-copy" }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM, agentRunId: "b-local-copy" }));
    expect(refused.answer).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    const org = await f.gateway.ownerCommand({ ...envelope(), targetRoot: { kind: "agent_org", runId: "team-run" }, agentRunId: "lead-run", command: { kind: "interrupt" } }, peerCallerOfBody({ ...envelope(), targetRoot: { kind: "agent_org", runId: "team-run" }, agentRunId: "lead-run", command: { kind: "interrupt" } }));
    expect(org.answer).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });

    const sink = { send: vi.fn(), close: vi.fn() };
    const opened = await f.gateway.openRunObservation({ ...envelope(), targetRoot: TEAM }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM }), sink);
    expect(opened.answer).toMatchObject({ accepted: true, nodeId: SELF });
    f.emit("lead-run", status);
    expect(sink.send).toHaveBeenCalledWith({ agentRunId: "lead-run", message: status });

    const post = { kind: "post_message", content: "status?", messageId: "m1", dedupeKey: "d1" };
    expect((await f.gateway.ownerCommand({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run", command: post }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run", command: post }))).answer).toEqual({ accepted: true, nodeId: SELF });
    expect(f.access.executeOwnerCommand).toHaveBeenCalledWith("team-run", "lead-run", post, { nodeName: "alpha" });
    expect(sink.close).not.toHaveBeenCalled();
    // The terminate's acknowledgement does not end it by itself: the root kind reports the end (F-004, one owner).
    await f.gateway.ownerCommand({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run", command: { kind: "terminate" } }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run", command: { kind: "terminate" } }));
    expect(sink.close).not.toHaveBeenCalled();
    f.end();
    expect(sink.close).toHaveBeenCalledTimes(1);
    expect((await f.gateway.ownerCommand({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run", command: { kind: "approve" } }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM, agentRunId: "lead-run", command: { kind: "approve" } }))).status).toBe(400);
  });

  it("CR-461-090: an observation opens with each running agent's current status, read after its listener is attached; a stopped run sends none", async () => {
    const f = harness();
    const order: string[] = [];
    vi.mocked(f.access.observeRunAgents).mockImplementationOnce(async () => { order.push("observe"); return f.observation; });
    vi.mocked(f.access.runAgentStatuses).mockImplementationOnce(() => { order.push("read"); return [{ agentRunId: "lead-run", status: "idle", backgroundTasksRunning: 0 }]; });
    const sink = { send: vi.fn(), close: vi.fn() };
    await f.gateway.openRunObservation({ ...envelope(), targetRoot: TEAM }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM }), sink);
    expect(order).toEqual(["observe", "read"]);
    expect(sink.send.mock.calls).toEqual([[{ agentRunId: "lead-run", message: { type: "AGENT_STATUS", payload: expect.objectContaining({ status: "idle" }) } }]]);
    // Not running: nothing to send; the peer reads it offline until it runs.
    vi.mocked(f.access.runAgentStatuses).mockImplementationOnce(() => []);
    const quiet = { send: vi.fn(), close: vi.fn() };
    await f.gateway.openRunObservation({ ...envelope(), targetRoot: TEAM }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM }), quiet);
    expect(quiet.send).not.toHaveBeenCalled();
  });

  it("an observation of a run another node started is refused before anything is observed", async () => {
    const f = harness();
    const sink = { send: vi.fn(), close: vi.fn() };
    const refused = await f.gateway.openRunObservation({ ...envelope(OTHER), targetRoot: TEAM }, peerCallerOfBody({ ...envelope(OTHER), targetRoot: TEAM }), sink);
    expect(refused.answer).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", nodeId: SELF });
    expect(f.access.observeRunAgents).not.toHaveBeenCalled();
    const closing = await f.gateway.openRunObservation({ ...envelope(), targetRoot: TEAM }, peerCallerOfBody({ ...envelope(), targetRoot: TEAM }), sink);
    if (!closing.answer.accepted || !("observation" in closing.answer)) throw new Error("expected an observation");
    closing.answer.observation.close();
    expect(f.observation.close).toHaveBeenCalledTimes(1);
  });

  it("SR-088: an agent's own stream snapshot and its numbered frames, each behind the link check, for the paired agent only", async () => {
    const f = harness();
    const body = { ...envelope(), targetRoot: TEAM, agentRunId: "lead-run" };
    const answer = await f.gateway.agentStreamSnapshot(body, peerCallerOfBody(body));
    expect(answer.answer).toMatchObject({ accepted: true, nodeId: SELF, status: { type: "AGENT_STATUS", payload: { status: "running" } },
      snapshot: { base_sequence: 0, live_sequence_id: expect.any(String), turn_frames: [], stored: { runId: "lead-run" } } });
    const other = { ...envelope(), targetRoot: TEAM, agentRunId: "someone-else" };
    expect((await f.gateway.agentStreamSnapshot(other, peerCallerOfBody(other))).answer).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    const sink = { send: vi.fn(), close: vi.fn() };
    const opened = await f.gateway.openRunObservation(body, peerCallerOfBody(body), sink);
    if (!opened.answer.accepted || !("observation" in opened.answer)) throw new Error("expected an observation");
    expect(f.access.observeRunAgents).not.toHaveBeenCalled();
    f.emitLead({ runId: "lead-run", eventType: "SEGMENT_START", payload: { id: "s", turn_id: "t", segment_type: "text" }, statusHint: null, occurredAt: 1795452909697 });
    expect(sink.send).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: "lead-run", liveSequenceId: expect.any(String),
      frame: expect.objectContaining({ type: "SEGMENT_START", sequence: 1 }) }));
    opened.answer.observation.close();
  });
});
