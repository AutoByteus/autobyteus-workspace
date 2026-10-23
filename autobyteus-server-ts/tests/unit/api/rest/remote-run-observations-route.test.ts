import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeerGateway } from "../../../../src/remote-collaboration/channel/peer-gateway.js";
import { openPeerRunObservation } from "../../../../src/remote-collaboration/channel/peer-run-observation-client.js";
import type { PeerNode } from "../../../../src/remote-collaboration/domain/peer-node.js";
import type { RemoteRootDirectory } from "../../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteRunViewProvider } from "../../../../src/remote-collaboration/inbound/remote-run-view-provider.js";
import type { PairedAgentAccess, PairedAgentPresentationListener } from "../../../../src/agent-collaboration/execution/remote/paired-agent-access.js";

const services = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("../../../../src/remote-collaboration/remote-collaboration-services.js", () => ({
  findProcessRemoteCollaboration: () => services.current,
}));

import { registerRemoteCollaborationRoutes } from "../../../../src/api/rest/remote.js";

/**
 * autobyteus-278 CRR-003 F-002 (N-401): through the real WebSocket route, B's opening `{nodeId}` is the first frame,
 * even when the observed run is live and its subscription produces a frame at once (an Agent run's input-state
 * snapshot); that frame follows the opening, and A's real client accepts the stream and receives it.
 */

const SELF = "srv_beta_0000000000000000000000000000";
const ALPHA: PeerNode = { nodeId: "srv_alpha_000000000000000000000000000", name: "alpha", baseUrl: "http://alpha:29700", addedAt: "2026-10-20T09:00:00.000Z" };
const statusOf = (value: string) => ({ type: "AGENT_STATUS", payload: { status: value, trigger: null, tool_name: null, error_message: null,
  error_details: null, recoverableBlock: null } }) as never;
/** What a live run's subscription sends at once (its current state), before the gateway has answered. */
const inputState = statusOf("running");
const status = statusOf("idle");

let app: FastifyInstance | null = null;
afterEach(async () => { await app?.close(); app = null; services.current = null; });

/** B: a real gateway and provider over a live Agent run whose subscription emits a frame synchronously. */
const startNodeB = async () => {
  let emit: PairedAgentPresentationListener | null = null;
  const observation = { close: vi.fn() };
  const access: PairedAgentAccess = {
    observePairedAgents: vi.fn(async (_runId: string, onPresentation: PairedAgentPresentationListener) => {
      onPresentation("publisher-run", inputState);
      emit = onPresentation;
      return observation;
    }),
    executeOwnerCommand: vi.fn(async () => ({ accepted: true })),
    pairedAgentStatuses: () => [],
  };
  const roots = { storedLinkCheck: async () => "proceed" as const, pairedAgents: () => access } as unknown as RemoteRootDirectory;
  const provider = new RemoteRunViewProvider(roots, { runTitle: async () => null, agentProjection: async () => { throw new Error("unused"); } });
  services.current = { gateway: new PeerGateway({
    ownNodeId: async () => SELF, capability: { isEnabled: () => true },
    peers: { findByNodeId: async (nodeId) => (nodeId === ALPHA.nodeId ? ALPHA : null) },
    delegatedRuns: {} as never, messages: {} as never, availableAgents: {} as never, runViews: provider,
  }) };
  app = fastify();
  await app.register(websocket);
  await app.register(async (rest) => registerRemoteCollaborationRoutes(rest), { prefix: "/rest" });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { baseUrl: `http://127.0.0.1:${port}`, observation, emit: (message: never) => emit?.("publisher-run", message) };
};

describe("the run-observations route", () => {
  it("sends {nodeId} before a frame the live run produces while being subscribed, then that frame", async () => {
    const b = await startNodeB();
    const raw: unknown[] = [];
    const socket = new WebSocket(`${b.baseUrl.replace(/^http/, "ws")}/rest/remote/run-observations`);
    socket.onopen = () => socket.send(JSON.stringify({ fromNodeId: ALPHA.nodeId, toNodeId: SELF, targetRoot: { kind: "agent", runId: "publisher-run" } }));
    socket.onmessage = (event) => raw.push(JSON.parse(String(event.data)));
    await vi.waitFor(() => expect(raw).toHaveLength(2));
    expect(raw).toEqual([{ nodeId: SELF }, { agentRunId: "publisher-run", message: inputState }]);
    socket.close();
    await vi.waitFor(() => expect(b.observation.close).toHaveBeenCalledTimes(1));
  });

  it("A's real client accepts the stream and receives the immediate frame and later ones; nothing ends it", async () => {
    const b = await startNodeB();
    const frames: unknown[] = [];
    const onEnd = vi.fn();
    const stream = openPeerRunObservation({
      resolvePeer: async () => ({ ...ALPHA, nodeId: SELF, name: "beta", baseUrl: b.baseUrl }),
      ownNodeId: async () => ALPHA.nodeId,
      path: "/rest/remote/run-observations",
      targetRoot: { kind: "agent", runId: "publisher-run" },
      observer: { onFrame: (agentRunId, message) => frames.push({ agentRunId, message }), onEnd },
      openingTimeoutMs: 5_000,
    });
    await vi.waitFor(() => expect(frames).toEqual([{ agentRunId: "publisher-run", message: inputState }]));
    b.emit(status);
    await vi.waitFor(() => expect(frames).toHaveLength(2));
    expect(onEnd).not.toHaveBeenCalled();
    stream.close();
    await vi.waitFor(() => expect(b.observation.close).toHaveBeenCalledTimes(1));
    expect(onEnd).not.toHaveBeenCalled();
  });
});
