import { describe, expect, it } from "vitest";
import { RootCommunicationEngine } from "../../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { communicationPortDouble } from "../../helpers/communication-port-double.js";

/**
 * autobyteus-461 SR-072 (CR-461-054): a committed message is published once, into the node's message feed, with its
 * sender's run: a message inside the run at its one commit; a message from another run at this, the receiver's, commit.
 * The sender's later commit of a message between runs does not publish it again.
 */
const team: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "team-1" };
const manager: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const member = (root: RootExecutionIdentity, agentRunId: string): CollaborationMemberExecutionIdentity => ({ root, memberAddress: `/${agentRunId}`, agentRunId } as never);
const message = { messageId: "m-1", senderAgentRunId: "manager", receiverAgentRunId: "lead", content: "Status?", messageType: "agent_message",
  referenceFiles: [], createdAt: "2026-11-13T00:00:00.000Z" };

describe("RootCommunicationEngine publication (SR-072)", () => {
  it("a message between the run's own agents is published at its commit, with this run as the sender's", async () => {
    const port = communicationPortDouble(team);
    await expect(new RootCommunicationEngine(port).deliver({ senderIdentity: member(team, "lead"), senderDisplayName: "lead", senderAddress: null,
      receiverIdentity: member(team, "coder"), receiverDisplayName: "coder", content: "Review it." })).resolves.toMatchObject({ accepted: true });
    expect(port.publishMessage).toHaveBeenCalledOnce();
    expect(port.publishMessage).toHaveBeenCalledWith(expect.objectContaining({ senderAgentRunId: "lead", receiverAgentRunId: "coder" }), team);
  });

  it("a message from another run is published at the receiver's commit, with the sender's run; the sender's commit does not publish it", async () => {
    const receiverPort = communicationPortDouble(team);
    await expect(new RootCommunicationEngine(receiverPort).acceptFromRun({ message, senderIdentity: member(manager, "manager"), senderDisplayName: "manager",
      senderAddress: null, receiverIdentity: member(team, "lead"), receiverDisplayName: "lead", assertAllowed: () => undefined, publishToViews: true })).resolves.toMatchObject({ accepted: true });
    expect(receiverPort.publishMessage).toHaveBeenCalledOnce();
    expect(receiverPort.publishMessage).toHaveBeenCalledWith(message, manager);
    const senderPort = communicationPortDouble(manager);
    await new RootCommunicationEngine(senderPort).commitSentToRun(message);
    expect(senderPort.commitMessageAppend).toHaveBeenCalledOnce();
    expect(senderPort.publishMessage).not.toHaveBeenCalled();
  });

  it("autobyteus-492 G-1 (DEC-014): a message between unrelated runs is committed to the receiver's log and delivered, but published to no run view", async () => {
    const receiverPort = communicationPortDouble(team);
    await expect(new RootCommunicationEngine(receiverPort).acceptFromRun({ message, senderIdentity: member(manager, "manager"), senderDisplayName: "manager",
      senderAddress: null, receiverIdentity: member(team, "lead"), receiverDisplayName: "lead", assertAllowed: () => undefined, publishToViews: false })).resolves.toMatchObject({ accepted: true });
    expect(receiverPort.commitMessageAppend).toHaveBeenCalledOnce();
    expect(receiverPort.publishMessage).not.toHaveBeenCalled();
  });
});
