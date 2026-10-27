import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { composeRemoteCollaboration } from "../../../src/remote-collaboration/remote-collaboration-services.js";
import { PeerAddressResolver } from "../../../src/remote-collaboration/settings/peer-address-resolver.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import { NodeIdentityNotMigratedError } from "../../../src/remote-access/services/node-identity-service.js";

vi.mock("../../../src/remote-access/services/remote-access-settings-service.js", () => ({
  getRemoteAccessSettingsService: () => ({ getSettings: async () => ({ phoneAccessEnabled: true }) }),
}));

import {
  configureNodeIdentityCapability,
  resetNodeIdentityServiceForTests,
} from "../../../src/remote-access/services/node-identity-service.js";
import { registerRemoteAccessRoutes } from "../../../src/api/rest/remote-access.js";

/**
 * autobyteus-290 § Hold-back chains, `node_identity` (SM-1), N-910: while this node's identity waits for its data
 * migration, every reader of the node ID states that reason, and nothing is sent or created.
 */

const SELF = "srv_self_node_000000000000000000000000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "docker", baseUrl: "http://peer:29700", addedAt: "2026-10-20T09:00:00.000Z" };
const pending = async (): Promise<string> => { throw new NodeIdentityNotMigratedError(); };
const answer = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const pendingAnswer = () => answer({ code: "NODE_IDENTITY_NOT_MIGRATED", message: "This node's identity is waiting for its data migration." }, 503);
const peers = { findByName: async (name: string) => (name === "docker" ? PEER : null), findByNodeId: async (id: string) => (id === PEER.nodeId ? PEER : null) };
const WORK = { text: "Publish the video draft.", task: { taskId: null, taskKey: null, projectId: null, title: "Publish the video draft." } };
const start = { nodeId: PEER.nodeId, address: "/publisher", delegatorAgentRunId: "agent_a1", coordinatingRun: { kind: "agent" as const, runId: "agent_a1" }, work: WORK };

const roots: string[] = [];
afterEach(async () => {
  configureNodeIdentityCapability(true);
  resetNodeIdentityServiceForTests();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("this node's identity held back", () => {
  it("the status route answers 503 with NODE_IDENTITY_NOT_MIGRATED and writes no identity", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-hold-back-")); roots.push(dir);
    configureNodeIdentityCapability(false);
    resetNodeIdentityServiceForTests();
    const app = fastify();
    await registerRemoteAccessRoutes(app);
    const response = await app.inject({ method: "GET", url: "/remote-access/status" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ code: "NODE_IDENTITY_NOT_MIGRATED", message: "This node's identity is waiting for its data migration." });
    await app.close();
  });

  it("the gateway answers inbound requests 503 with the code and dispatches nothing", async () => {
    const delegatedRuns = { start: vi.fn() };
    const gate = new PeerGateway({
      ownNodeId: pending, capability: { isEnabled: () => true }, peers,
      delegatedRuns: delegatedRuns as never, messages: { accept: vi.fn() } as never, availableAgents: { list: vi.fn() } as never, runViews: {} as never,
    });
    const response = await gate.startDelegatedRun({ fromNodeId: PEER.nodeId, toNodeId: SELF, address: "/publisher",
      delegator: { agentRunId: "agent_a1" }, coordinatingRun: { kind: "agent", runId: "agent_a1" }, task: { text: "Publish the video draft.", title: "Publish the video draft.", taskKey: null, projectId: null, taskId: null } });
    expect(response).toEqual({ status: 503, answer: { accepted: false, code: "NODE_IDENTITY_NOT_MIGRATED",
      message: "This node's identity is waiting for its data migration." } });
    expect(delegatedRuns.start).not.toHaveBeenCalled();
  });

  it("the client refuses outbound requests with the code and sends nothing", async () => {
    const fetch = vi.fn();
    const client = new PeerClient({ peers, capability: { isEnabled: () => true }, ownNodeId: pending, fetch: fetch as never });
    await expect(client.startDelegatedRun(start)).resolves.toMatchObject({ accepted: false, code: "NODE_IDENTITY_NOT_MIGRATED",
      message: "This node's identity is waiting for its data migration, so nothing was sent to another node." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("adding a peer is refused with the code (settings error)", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-hold-back-")); roots.push(dir);
    const services = composeRemoteCollaboration({
      config: { getAppDataDir: () => dir },
      settings: { getBooleanSetting: () => true, setBooleanSetting: () => undefined },
      ownNodeId: pending,
      tempWorkspaceDir: dir,
      runsInContainer: () => false,
      handlers: () => ({ delegatedRuns: {} as never, messages: {} as never, availableAgents: {} as never, runViews: {} as never }),
    });
    vi.spyOn(services.client, "fetchNodeId").mockResolvedValue(PEER.nodeId);
    await expect(services.peers.add({ nodeId: PEER.nodeId, name: "docker", baseUrl: "http://peer:29700" }))
      .rejects.toMatchObject({ code: "NODE_IDENTITY_NOT_MIGRATED" });
    await expect(services.addresses.resolve(PEER.nodeId, ["http://peer:29700"])).rejects.toMatchObject({ code: "NODE_IDENTITY_NOT_MIGRATED" });
  });
});

describe("another node's identity held back (it answers 503 with the code)", () => {
  it("a request to it is refused with the code and its name, not as unreachable", async () => {
    const client = new PeerClient({ peers, capability: { isEnabled: () => true }, ownNodeId: async () => SELF, fetch: (async () => pendingAnswer()) as never });
    await expect(client.startDelegatedRun(start)).resolves.toMatchObject({ accepted: false, code: "NODE_IDENTITY_NOT_MIGRATED",
      message: `Node "docker"'s identity is waiting for its data migration, so it refused the request.` });
  });

  it("its identity probe says so, not 'not an AutoByteus node'; any other 503 keeps today's meaning", async () => {
    const pendingNode = new PeerClient({ peers, capability: { isEnabled: () => true }, ownNodeId: async () => SELF, fetch: (async () => pendingAnswer()) as never });
    await expect(pendingNode.fetchNodeId("http://peer:29700")).rejects.toMatchObject({ code: "NODE_IDENTITY_NOT_MIGRATED" });
    const busy = new PeerClient({ peers, capability: { isEnabled: () => true }, ownNodeId: async () => SELF, fetch: (async () => answer({}, 503)) as never });
    await expect(busy.fetchNodeId("http://web")).rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS" });
  });

  it("address resolution reports the attempt as identity_pending", async () => {
    const resolver = new PeerAddressResolver({
      probe: new PeerClient({ peers, capability: { isEnabled: () => true }, ownNodeId: async () => SELF, fetch: (async () => pendingAnswer()) as never }),
      capability: { isEnabled: () => true }, ownNodeId: async () => SELF, runsInContainer: () => false,
    });
    await expect(resolver.resolve(PEER.nodeId, ["http://peer:29700"])).rejects.toMatchObject({
      code: "PEER_UNREACHABLE", details: { attempts: [{ address: "http://peer:29700", result: "identity_pending" }] },
    });
  });
});
