import { describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { PreparedRemoteSend } from "../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import {
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { delegatedRunEndpoint, delegatorEndpoint } from "../../../src/agent-collaboration/execution/remote/remote-endpoint.js";
import { RemoteMessageSend } from "../../../src/agent-collaboration/execution/remote/remote-message-send.js";
import { RemoteRunLinks } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteRunChannel } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { RootTaskExecutionLifecycle } from "../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { RootTaskExecutionResourceScope } from "../../../src/agent-collaboration/execution/task/root-task-execution-resource-scope.js";
import type { RemoteTaskAgentExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";

/**
 * Design § Remote Messaging: Owners And Order (AR-005 … AR-008) and § Task Closure Of A Remote Run (AR-007):
 * the two endpoint kinds and their rules, the one shared owner of the outbound sequence, the existing-copy
 * refusal in the shared lifecycle, and the closure fence.
 */

const DELEGATOR = "agent_delegator";
const REMOTE = "publisher_7f3";
const HOST = "publisher_host";
const PEER_NODE = "srv_peer_b";
const link: RemoteTaskAgentExecution = Object.freeze({ kind: "agent", address: "/publisher", agentRunId: REMOTE, nodeId: PEER_NODE, delegatorAgentRunId: DELEGATOR, startedAt: "2026-10-20T10:00:00.000Z" });
const delegatedFrom = Object.freeze({ nodeId: "srv_node_a", coordinatingRun: Object.freeze({ kind: "agent_team" as const, runId: "team_a" }), delegatorAgentRunId: DELEGATOR });
const message = (sender: string, receiver: string): CollaborationCommunicationMessage => Object.freeze({
  messageId: "collabmsg_1", senderAgentRunId: sender, receiverAgentRunId: receiver, content: "hello", messageType: "agent_message",
  referenceFiles: Object.freeze([]), createdAt: "2026-10-20T10:01:00.000Z",
});

describe("remote endpoint kinds (AR-006)", () => {
  it("a delegated run (on the delegating node): only its delegator, the link's Task, a plain message request", () => {
    const endpoint = delegatedRunEndpoint(link);
    expect(endpoint).toMatchObject({ kind: "delegated_run", reference: { nodeId: PEER_NODE, agentRunId: REMOTE }, pairedAgentRunId: DELEGATOR, displayName: "publisher" });
    expect([endpoint.allowsSender(DELEGATOR), endpoint.allowsSender("other"), endpoint.allowsTarget(DELEGATOR), endpoint.allowsTarget("other")]).toEqual([true, false, true, false]);
    expect(endpoint.ownershipChain()).toEqual([{ agentRunId: REMOTE }]);
    expect(endpoint.transmission(message(DELEGATOR, REMOTE))).toEqual({ nodeId: PEER_NODE, kind: "message", messageId: "collabmsg_1",
      senderAgentRunId: DELEGATOR, targetAgentRunId: REMOTE, content: "hello", messageType: "agent_message", createdAt: "2026-10-20T10:01:00.000Z" });
    expect(endpoint.refusals.notPermitted).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
  });

  it("a delegator (on the node that runs the delegated run): only the host, no Task here, the coordinating run echoed, the work packet", () => {
    const endpoint = delegatorEndpoint(HOST, delegatedFrom);
    expect(endpoint).toMatchObject({ kind: "delegator", reference: { nodeId: "srv_node_a", agentRunId: DELEGATOR }, pairedAgentRunId: HOST });
    expect([endpoint.allowsSender(HOST), endpoint.allowsSender("child"), endpoint.allowsTarget(HOST), endpoint.allowsTarget("child")]).toEqual([true, false, true, false]);
    expect(endpoint.ownershipChain()).toEqual([]);
    expect(endpoint.transmission(message(HOST, DELEGATOR))).toMatchObject({ nodeId: "srv_node_a", coordinatingRun: { kind: "agent_team", runId: "team_a" } });
    expect(endpoint.admitsWorkPacket("srv_node_a", DELEGATOR, HOST)).toBe(true);
    expect(endpoint.admitsWorkPacket("srv_other", DELEGATOR, HOST)).toBe(false);
    expect(endpoint.admitsWorkPacket("srv_node_a", "someone", HOST)).toBe(false);
    expect(endpoint.admitsWorkPacket("srv_node_a", DELEGATOR, "child")).toBe(false);
  });

  it("RemoteRunLinks holds membership only: both kinds by run ID, and the inbound link check by node, sender and target", () => {
    const links = new RemoteRunLinks({ remoteRuns: () => [link], backLink: { hostRunId: HOST, delegatedFrom } });
    expect(links.endpointFor(REMOTE)?.kind).toBe("delegated_run");
    expect(links.endpointFor(DELEGATOR)?.kind).toBe("delegator");
    expect(links.has(HOST)).toBe(false);
    expect(links.inboundEndpoint(PEER_NODE, REMOTE, DELEGATOR)?.kind).toBe("delegated_run");
    expect(links.inboundEndpoint("srv_elsewhere", REMOTE, DELEGATOR)).toBeNull();
    expect(links.inboundEndpoint(PEER_NODE, REMOTE, "another_local")).toBeNull();
  });
});

describe("RemoteMessageSend: the one owner of the outbound sequence (AR-005, AR-008)", () => {
  const sender = createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(DELEGATOR), memberAddress: "/lead" as never, agentRunId: DELEGATOR });
  const endpoint = delegatedRunEndpoint(link);
  const harness = (options: { prepared?: PreparedRemoteSend; receipt?: { accepted: true } | { accepted: false; code: string; message: string } } = {}) => {
    const calls: string[] = [];
    const prepared: PreparedRemoteSend = options.prepared ?? { ok: true, message: message(DELEGATOR, REMOTE), endpoint };
    const engine = {
      prepareRemoteSend: vi.fn(() => { calls.push("prepare"); return prepared; }),
      commitSentToRemote: vi.fn(async () => { calls.push("commit"); return { accepted: true as const, agentRunId: REMOTE, displayName: "publisher" }; }),
    };
    const channel: RemoteRunChannel = {
      findPeer: vi.fn(), startDelegatedRun: vi.fn(),
      peerName: vi.fn(async () => "docker"),
      deliverMessage: vi.fn(async () => { calls.push("deliver"); return options.receipt ?? { accepted: true as const }; }),
    };
    const send = new RemoteMessageSend({ engine: () => engine as never, links: new RemoteRunLinks({ remoteRuns: () => [link], channel: () => channel }) });
    return { send, engine, channel, calls };
  };

  it("prepares, delivers, then commits; the result names the node", async () => {
    const h = harness();
    await expect(h.send.send({ sender, endpoint, content: "hello" })).resolves.toEqual({
      accepted: true, agentRunId: REMOTE, displayName: "publisher", message: `Delivered message to ${REMOTE} on node "docker".` });
    expect(h.calls).toEqual(["prepare", "deliver", "commit"]);
    expect(h.channel.deliverMessage).toHaveBeenCalledWith(expect.objectContaining({ nodeId: PEER_NODE, kind: "message", messageId: "collabmsg_1" }));
  });

  it("refuses by the kind's pair rule before anything else", async () => {
    const h = harness();
    const other = { ...sender, agentRunId: "not_the_delegator" };
    await expect(h.send.send({ sender: other, endpoint, content: "hello" })).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    expect(h.calls).toEqual([]);
  });

  it("returns the engine's refusal and sends nothing", async () => {
    const refusal = { accepted: false as const, code: "REMOTE_ATTACHMENTS_NOT_SUPPORTED", message: "no files" };
    const h = harness({ prepared: { ok: false, refusal } });
    await expect(h.send.send({ sender, endpoint, content: "hello", referenceFiles: ["/a.md"] })).resolves.toEqual(refusal);
    expect(h.calls).toEqual(["prepare"]);
  });

  it("returns the peer's refusal and writes nothing", async () => {
    const h = harness({ receipt: { accepted: false, code: "PEER_UNREACHABLE", message: "Node \"docker\" could not be reached." } });
    await expect(h.send.send({ sender, endpoint, content: "hello" })).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE" });
    expect(h.calls).toEqual(["prepare", "deliver"]);
  });
});

describe("the existing-copy refusal, once in the shared lifecycle (AR-003, AR-008)", () => {
  const root = createTeamRootExecutionIdentity("team_a");
  const manager = { identity: createCollaborationMemberExecutionIdentity({ root, memberAddress: "/manager" as never, agentRunId: "manager_run" }) } as never;
  const setup = () => {
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("task-1");
    const adapter = {
      root, isOpen: () => true, authorize: () => undefined, assertCurrentSchemaReady: () => undefined,
      ownershipChainFor: () => [], taskExecutionChainFor: () => [], taskExecutionTargetOf: vi.fn(() => null), taskExecutionWithIngress: vi.fn(() => null),
    };
    const lifecycle = new RootTaskExecutionLifecycle(adapter as never, {
      taskExecutionResources: resources, remoteEndpoints: { isRemoteEndpoint: (agentRunId) => agentRunId === REMOTE },
    });
    const assignSpy = vi.spyOn(resources, "assignExistingTaskExecution");
    const assignableSpy = vi.spyOn(resources, "assertAssignable");
    return { lifecycle, adapter, assignSpy, assignableSpy };
  };

  it("refuses a run on a peer node after the named Task resolves, before the copy is resolved or any Task change", async () => {
    const s = setup();
    const deliver = vi.fn();
    await expect(s.lifecycle.assignToExistingCopy(manager, { copy: { agentRunId: REMOTE }, taskId: "task-1" }, deliver))
      .resolves.toEqual({ delegated: false, message: expect.stringContaining("can't be given to an agent on another node") });
    expect(s.adapter.taskExecutionTargetOf).not.toHaveBeenCalled();
    expect(s.assignableSpy).not.toHaveBeenCalled();
    expect(s.assignSpy).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("lets the named Task's own refusal come first", async () => {
    const s = setup();
    await expect(s.lifecycle.assignToExistingCopy(manager, { copy: { agentRunId: REMOTE }, taskId: "no-such-task" }, vi.fn()))
      .resolves.toEqual({ delegated: false, message: "Task 'no-such-task' was not found." });
  });

  it("leaves a local copy to today's path", async () => {
    const s = setup();
    await s.lifecycle.assignToExistingCopy(manager, { copy: { agentRunId: "local_copy" }, taskId: "task-1" }, vi.fn());
    expect(s.adapter.taskExecutionTargetOf).toHaveBeenCalledWith({ agentRunId: "local_copy" });
  });
});

describe("Task closure of a remote run (AR-007)", () => {
  it("fences it with an explicit result and invokes no release; a hosted run is still released", async () => {
    const root = createAgentRootExecutionIdentity(DELEGATOR);
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("task-1");
    for (const agentRunId of [REMOTE, "local_copy"]) {
      await resources.linkNewTaskExecution({ hostRoot: root, execution: { agentRunId }, role: "assigned", assignedBy: DELEGATOR, recipientAddress: "/publisher", taskId: "task-1" } as never);
    }
    const adapter = {
      root, containsTaskExecution: () => false, publishTaskExecutionsClosed: vi.fn(), registrationFor: vi.fn(() => null),
      cancelOwnedExecution: vi.fn(), releaseOwnedExecution: vi.fn(async () => ({ accepted: true })),
    };
    const channel = { peerName: async () => "docker" } as unknown as RemoteRunChannel;
    const scope = new RootTaskExecutionResourceScope(adapter as never, resources, new RemoteRunLinks({ remoteRuns: () => [link], channel: () => channel }));
    const closed = resources.close("task-1");

    const results = await scope.releaseTaskExecutions(closed);

    expect(results).toEqual([
      { execution: { agentRunId: REMOTE }, outcome: "fenced_remote", stopped: false,
        message: `/publisher runs on node "docker". This Task sends it no more messages; it stops there when it goes idle.` },
      { execution: { agentRunId: "local_copy" }, stopped: true },
    ]);
    expect(adapter.releaseOwnedExecution).toHaveBeenCalledTimes(1);
    expect(adapter.releaseOwnedExecution).toHaveBeenCalledWith({ agentRunId: "local_copy" });
    expect(adapter.cancelOwnedExecution).not.toHaveBeenCalledWith({ agentRunId: REMOTE });
  });
});
