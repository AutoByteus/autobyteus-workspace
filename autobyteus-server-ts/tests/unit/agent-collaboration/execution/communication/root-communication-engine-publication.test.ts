import { describe, expect, it } from "vitest";
import { RootCommunicationEngine } from "../../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { delegatedRunEndpoint, unlinkedRunEndpoint } from "../../../../../src/agent-collaboration/execution/remote/remote-endpoint.js";
import { communicationPortDouble } from "../../helpers/communication-port-double.js";

/**
 * autobyteus-461 SR-072 (CR-461-054), autobyteus-565: a committed message is published once, into the node's message feed,
 * at its publishing commit, with its relation, its two sides and its two parties: a message inside the run at its one
 * commit (`same_run`); a message from another run at this, the receiver's, commit (`related` / `unrelated`); a message with
 * another node at this node's own commit, sent (`commitSentToRemote`) or received (`acceptFromRemote`). The sender's later
 * commit of a message between two runs of this node never publishes. A line with an unrelated run or another node records
 * the other agent (`counterpart`); the views and events get the message's own fields only.
 */
const team: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "team-1" };
const manager: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const member = (root: RootExecutionIdentity, agentRunId: string): CollaborationMemberExecutionIdentity => ({ root, memberAddress: `/${agentRunId}`, agentRunId } as never);
const message = { messageId: "m-1", senderAgentRunId: "manager", receiverAgentRunId: "lead", content: "Status?", messageType: "agent_message",
  referenceFiles: [], createdAt: "2026-11-13T00:00:00.000Z" };
const local = (agentRunId: string) => ({ agentRunId, address: `/${agentRunId}`, nodeName: null });

describe("RootCommunicationEngine publication (SR-072, autobyteus-565)", () => {
  it("a message between the run's own agents is published at its commit: same_run, both sides this run, both parties local", async () => {
    const port = communicationPortDouble(team);
    await expect(new RootCommunicationEngine(port).deliver({ senderIdentity: member(team, "lead"), senderDisplayName: "lead", senderAddress: null,
      receiverIdentity: member(team, "coder"), receiverDisplayName: "coder", content: "Review it." })).resolves.toMatchObject({ accepted: true });
    expect(port.publishMessage).toHaveBeenCalledOnce();
    expect(port.publishMessage).toHaveBeenCalledWith(expect.objectContaining({ relation: "same_run", sender: { run: team }, receiver: { run: team },
      parties: { sender: local("lead"), receiver: local("coder") }, message: expect.objectContaining({ senderAgentRunId: "lead", receiverAgentRunId: "coder" }) }));
  });

  it("a message from a related run is published at the receiver's commit, with the sender's run; the sender's commit does not publish it", async () => {
    const receiverPort = communicationPortDouble(team);
    const receiver = new RootCommunicationEngine(receiverPort);
    await expect(receiver.acceptFromRun({ message, senderIdentity: member(manager, "manager"), senderDisplayName: "manager",
      senderAddress: null, receiverIdentity: member(team, "lead"), receiverDisplayName: "lead", assertAllowed: () => undefined, relation: "related" }))
      .resolves.toMatchObject({ accepted: true, agentAddress: "/lead" });
    expect(receiverPort.publishMessage).toHaveBeenCalledExactlyOnceWith({ message, relation: "related", sender: { run: manager }, receiver: { run: team },
      parties: { sender: local("manager"), receiver: local("lead") } });
    // A related line records nothing more: the other run is in a Task's tree.
    expect(receiver.getMessages()).toEqual([message]);
    const senderPort = communicationPortDouble(manager);
    await new RootCommunicationEngine(senderPort).commitSentToRun(message, null);
    expect(senderPort.commitMessageAppend).toHaveBeenCalledOnce();
    expect(senderPort.publishMessage).not.toHaveBeenCalled();
  });

  it("an unrelated run's message: published as unrelated (MessageViewScope decides the views); each side's line records the other agent", async () => {
    const receiverPort = communicationPortDouble(team);
    const receiver = new RootCommunicationEngine(receiverPort);
    await expect(receiver.acceptFromRun({ message, senderIdentity: member(manager, "manager"), senderDisplayName: "manager",
      senderAddress: null, receiverIdentity: member(team, "lead"), receiverDisplayName: "lead", assertAllowed: () => undefined, relation: "unrelated" }))
      .resolves.toMatchObject({ accepted: true });
    expect(receiverPort.publishMessage).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ relation: "unrelated", message }));
    expect(receiver.getMessages()).toEqual([{ ...message, counterpart: { address: "/manager", nodeId: null } }]);
    const senderPort = communicationPortDouble(manager);
    const sender = new RootCommunicationEngine(senderPort);
    await sender.commitSentToRun(message, { address: "/lead", nodeId: null });
    expect(sender.getMessages()).toEqual([{ ...message, counterpart: { address: "/lead", nodeId: null } }]);
    expect(senderPort.publishMessage).not.toHaveBeenCalled();
  });

  it("a message sent to another node is recorded with the receiver's address and node, and published at the sender's commit as remote", async () => {
    const port = communicationPortDouble(manager);
    const engine = new RootCommunicationEngine(port);
    const endpoint = unlinkedRunEndpoint({ nodeId: "srv_linux", agentRunId: "linux-pm", pairedAgentRunId: "manager" });
    const prepared = engine.prepareRemoteSend({ senderIdentity: member(manager, "manager"), endpoint, content: "Hello Linux" });
    if (!prepared.ok) throw new Error(prepared.refusal.message);
    expect(prepared.senderAddress).toBe("/manager");
    await expect(engine.commitSentToRemote(prepared, { address: "/project_task_manager", nodeName: "ryan-ai-linux" })).resolves.toMatchObject({ accepted: true });
    expect(engine.getMessages()).toEqual([expect.objectContaining({ content: "Hello Linux", counterpart: { address: "/project_task_manager", nodeId: "srv_linux" } })]);
    expect(port.publishMessage).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ relation: "remote", sender: { run: manager }, receiver: { nodeId: "srv_linux" },
      parties: { sender: local("manager"), receiver: { agentRunId: "linux-pm", address: "/project_task_manager", nodeName: "ryan-ai-linux" } } }));
    // The views get the message's own fields, not this log's record.
    expect((port.publishMessage as unknown as { mock: { calls: [{ message: object }][] } }).mock.calls[0]![0].message).not.toHaveProperty("counterpart");
  });

  it("a message received from another node is recorded with the sender's address and node, and published at this commit as remote", async () => {
    const port = communicationPortDouble(manager);
    const engine = new RootCommunicationEngine(port);
    const endpoint = delegatedRunEndpoint({ kind: "agent", address: "/publisher", agentRunId: "publisher-b", nodeId: "srv_b", delegatorAgentRunId: "manager",
      startedAt: "2026-11-13T00:00:00.000Z" } as never);
    const reply = { ...message, messageId: "m-2", senderAgentRunId: "publisher-b", receiverAgentRunId: "manager" };
    await expect(engine.acceptFromRemote({ message: reply, endpoint, receiverIdentity: member(manager, "manager"), receiverDisplayName: "manager",
      senderNodeName: "docker", senderAddress: "/publisher", files: [] })).resolves.toMatchObject({ accepted: true, agentAddress: "/manager" });
    expect(engine.getMessages()).toEqual([{ ...reply, counterpart: { address: "/publisher", nodeId: "srv_b" } }]);
    expect(port.publishMessage).toHaveBeenCalledExactlyOnceWith({ message: reply, relation: "remote", sender: { nodeId: "srv_b" }, receiver: { run: manager },
      parties: { sender: { agentRunId: "publisher-b", address: "/publisher", nodeName: "docker" }, receiver: local("manager") } });
  });
});
