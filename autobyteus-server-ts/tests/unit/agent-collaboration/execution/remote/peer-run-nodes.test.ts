import { describe, expect, it, vi } from "vitest";
import { PeerRunNodes } from "../../../../../src/agent-collaboration/execution/remote/peer-run-nodes.js";
import type { RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-587 RF-14 (SR-010 R2, SR-011): the one owner of "which node a run is on" and of the refusals for a call that
 * does not name it: the sender root's links (a run it delegated to a peer, or a peer-started root's delegator), then the
 * tree's Task entries; a node no longer paired is refused with no node to pass (CR-587-03). Reads only.
 */
const STUDIO = { nodeId: "srv_studio", name: "studio" };
const MAC = { nodeId: "srv_mac", name: "mac-studio" };
const ROOT: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "pm_run" };
const sender = { root: ROOT, memberAddress: "/pm", agentRunId: "pm_run" } as never;
const otherSender = { root: { rootSubjectKind: "agent", rootRunId: "other_run" }, memberAddress: "/other", agentRunId: "other_run" } as never;

const setup = (options: { linked?: Record<string, string>; entries?: Record<string, string>; registered?: string[]; channel?: boolean } = {}) => {
  const registered = new Set(options.registered ?? [STUDIO.nodeId, MAC.nodeId]);
  const names: Record<string, string> = { [STUDIO.nodeId]: STUDIO.name, [MAC.nodeId]: MAC.name };
  const root = { remoteNodeOf: vi.fn((id: string) => options.linked?.[id] ?? null) };
  const channel = { registeredPeerName: vi.fn(async (nodeId: string) => registered.has(nodeId) ? names[nodeId]! : null) };
  const nodes = new PeerRunNodes({
    activeRoots: { resolve: (run: RootExecutionIdentity) => run.rootRunId === ROOT.rootRunId ? root as never : null },
    tree: () => ({
      runOfAgent: async (id: string) => options.entries?.[id] ? { rootSubjectKind: "agent" as const, rootRunId: id } : null,
      tasksOf: (reference: { agentRunId?: string }) => options.entries?.[reference.agentRunId ?? ""] ? [{ nodeId: options.entries[reference.agentRunId!] }] as never : [],
    }) as never,
    channel: () => options.channel === false ? null : channel as never,
  });
  return { nodes, root, channel };
};

describe("PeerRunNodes", () => {
  it("a run the sender's root links on a peer: no node → NODE_REQUIRED, another node → NODE_MISMATCH, the right one passes", async () => {
    const { nodes } = setup({ linked: { remote_1: STUDIO.nodeId } });
    await expect(nodes.check({ sender, targetAgentRunId: "remote_1", node: null }))
      .resolves.toEqual({ accepted: false, code: "NODE_REQUIRED", message: 'This agent runs on node "studio"; pass node: "studio" with its run id.' });
    await expect(nodes.check({ sender, targetAgentRunId: "remote_1", node: MAC }))
      .resolves.toEqual({ accepted: false, code: "NODE_MISMATCH", message: 'This agent runs on node "studio", not "mac-studio"; pass node: "studio".' });
    await expect(nodes.check({ sender, targetAgentRunId: " remote_1 ", node: STUDIO })).resolves.toBeNull();
  });

  it("a run another root delegated (a Task entry names its node): the same refusals for any sender, also one with no collaboration run", async () => {
    const { nodes } = setup({ entries: { remote_2: STUDIO.nodeId } });
    for (const from of [otherSender, null]) {
      await expect(nodes.check({ sender: from, targetAgentRunId: "remote_2", node: null })).resolves.toMatchObject({ code: "NODE_REQUIRED" });
      await expect(nodes.check({ sender: from, targetAgentRunId: "remote_2", node: MAC })).resolves.toMatchObject({ code: "NODE_MISMATCH" });
      await expect(nodes.check({ sender: from, targetAgentRunId: "remote_2", node: STUDIO })).resolves.toBeNull();
    }
    await expect(nodes.nodeOf(otherSender, "remote_2")).resolves.toBe(STUDIO.nodeId);
  });

  it("CR-587-03: a run on a node that is no longer a paired peer is refused NODE_NOT_PAIRED, naming no node to pass", async () => {
    const { nodes } = setup({ linked: { remote_1: STUDIO.nodeId }, registered: [MAC.nodeId] });
    const notPaired = { accepted: false, code: "NODE_NOT_PAIRED",
      message: "This agent runs on a node that is no longer paired with this node, so nothing was sent. The user can pair them again on the Nodes page." };
    await expect(nodes.check({ sender, targetAgentRunId: "remote_1", node: null })).resolves.toEqual(notPaired);
    await expect(nodes.check({ sender, targetAgentRunId: "remote_1", node: MAC })).resolves.toEqual(notPaired);
    const message = (await nodes.check({ sender, targetAgentRunId: "remote_1", node: null }))!.message!;
    expect(message).not.toContain(STUDIO.nodeId);
  });

  it("a run this node does not place on a peer passes (local, or unknown); SR-011: a run the caller knows is local, given node, is NODE_MISMATCH naming this node", async () => {
    const { nodes, channel } = setup();
    await expect(nodes.check({ sender, targetAgentRunId: "local_run", node: null })).resolves.toBeNull();
    await expect(nodes.check({ sender, targetAgentRunId: "local_run", node: STUDIO })).resolves.toBeNull();
    await expect(nodes.check({ sender, targetAgentRunId: "local_copy", node: null, localTarget: true })).resolves.toBeNull();
    await expect(nodes.check({ sender, targetAgentRunId: "local_copy", node: STUDIO, localTarget: true }))
      .resolves.toEqual({ accepted: false, code: "NODE_MISMATCH", message: 'This agent runs on this node, not "studio"; leave out node.' });
    expect(channel.registeredPeerName).not.toHaveBeenCalled();
  });

  it("with remote collaboration off, a run known on a peer is refused as off", async () => {
    const { nodes } = setup({ linked: { remote_1: STUDIO.nodeId }, channel: false });
    await expect(nodes.check({ sender, targetAgentRunId: "remote_1", node: null })).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
  });
});
