import { describe, expect, it, vi } from "vitest";
import { RootCommunicationEngine } from "../../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { delegatedRunEndpoint } from "../../../../../src/agent-collaboration/execution/remote/remote-endpoint.js";
import type { ReceivedFilesPlan } from "../../../../../src/agent-collaboration/execution/remote/transferred-files.js";
import { TaskDelegationError } from "../../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { communicationPortDouble, reservationDouble, runAppendDurably } from "../../helpers/communication-port-double.js";

/**
 * autobyteus-587 (AR-002, MP-002, RF-7…RF-9): the files of a message from another node land in the receiver's own folder
 * only after every admission check passed and the receiver's slot is held; then the log line is written, naming the
 * received paths. A message refused before that (a closed Task, an empty message, a closed root) places nothing, so no
 * same-named file of the same sender is replaced; a file that can no longer be placed releases the slot.
 */
const manager: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const receiver = { root: manager, memberAddress: "/manager", agentRunId: "manager" } as unknown as CollaborationMemberExecutionIdentity;
const endpoint = delegatedRunEndpoint({ kind: "agent", address: "/publisher", agentRunId: "publisher-b", nodeId: "srv_b", delegatorAgentRunId: "manager",
  startedAt: "2026-11-13T00:00:00.000Z" } as never);
const FILES = [{ sha256: "a".repeat(64), size: 3, name: "brief.pdf" }];
const PATH = "/data/memory/agents/manager/received_files/publisher-b/brief.pdf";
const reply = (content = "Here it is.") => ({ messageId: "m-2", senderAgentRunId: "publisher-b", receiverAgentRunId: "manager", content,
  messageType: "agent_message", referenceFiles: ["/work/brief.pdf"], createdAt: "2026-11-13T00:00:00.000Z" });

const setup = (options: { place?: ReceivedFilesPlan["place"]; assertDeliveryAllowed?: () => void; open?: boolean } = {}) => {
  const calls: string[] = [];
  const reservation = reservationDouble("manager");
  const place = vi.fn(options.place ?? (async () => { calls.push("place"); return { ok: true as const }; }));
  const port = communicationPortDouble(manager, {
    isOpen: () => options.open ?? true,
    assertDeliveryAllowed: options.assertDeliveryAllowed ?? (() => undefined),
    receivedFilesFor: vi.fn(async () => { calls.push("plan"); return { paths: [PATH], place }; }),
    reserveRecipientInput: vi.fn(async () => { calls.push("reserve"); return { reserved: true as const, reservation }; }),
    commitMessageAppend: vi.fn(async (append) => { calls.push("commit"); return runAppendDurably(append); }),
  });
  const engine = new RootCommunicationEngine(port);
  const accept = (content?: string) => engine.acceptFromRemote({ message: reply(content), endpoint, receiverIdentity: receiver, receiverDisplayName: "manager",
    senderNodeName: "docker", senderAddress: "/publisher", files: FILES });
  return { engine, port, place, reservation, calls, accept };
};

describe("RootCommunicationEngine.acceptFromRemote with files (autobyteus-587)", () => {
  it("plans the paths, holds the slot, places the files, then writes the line; the line and the input name the received paths", async () => {
    const t = setup();
    await expect(t.accept()).resolves.toMatchObject({ accepted: true });
    expect(t.calls).toEqual(["plan", "reserve", "place", "commit"]);
    expect(t.port.receivedFilesFor).toHaveBeenCalledWith(receiver, "publisher-b", FILES);
    expect(t.engine.getMessages()).toEqual([expect.objectContaining({ messageId: "m-2", referenceFiles: [PATH] })]);
    const input = (t.port.reserveRecipientInput as unknown as { mock: { calls: [string, { content: string }][] } }).mock.calls[0]![1];
    expect(input.content).toContain(PATH);
    expect(input.content).not.toContain("/work/brief.pdf");
  });

  it("MP-002: a reply after the Task closed is refused before anything is placed, so no file of that sender is replaced", async () => {
    const t = setup({ assertDeliveryAllowed: () => { throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task is closed."); } });
    await expect(t.accept()).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "The Task is closed." });
    expect(t.calls).toEqual([]);
    expect(t.place).not.toHaveBeenCalled();
    expect(t.engine.getMessages()).toEqual([]);
  });

  it("an invalid message or a closed root places nothing", async () => {
    const empty = setup();
    await expect(empty.accept("  ")).rejects.toThrow("message.content");
    const closed = setup({ open: false });
    await expect(closed.accept()).resolves.toMatchObject({ accepted: false });
    expect([...empty.calls, ...closed.calls]).toEqual([]);
  });

  it("a file no longer held releases the slot and refuses the message, naming the file; nothing is written", async () => {
    const t = setup({ place: async () => ({ ok: false as const, name: "brief.pdf" }) });
    await expect(t.accept()).resolves.toMatchObject({ accepted: false, code: "REFERENCE_FILE_CHECK_FAILED", message: expect.stringContaining("brief.pdf") });
    expect(t.reservation.cancel).toHaveBeenCalledOnce();
    expect(t.calls).toEqual(["plan", "reserve"]);
    expect(t.engine.getMessages()).toEqual([]);
  });

  it("a placement that throws releases the slot and lets the error through", async () => {
    const t = setup({ place: async () => { throw new Error("disk full"); } });
    await expect(t.accept()).rejects.toThrow("disk full");
    expect(t.reservation.cancel).toHaveBeenCalledOnce();
    expect(t.port.commitMessageAppend).not.toHaveBeenCalled();
  });
});
