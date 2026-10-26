import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { CollaborationCommunicationMessage } from "../../../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { createRootMessageAppend } from "../../../../../src/agent-collaboration/execution/communication/root-message-append.js";
import { TaskDelegationError } from "../../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { COORDINATING_LOG } from "../../../../../src/run-history/store/task-agent-message-logs.js";

/** The one append protocol (DS-004): its states, the slot rule, and the closure classification. */
const message: CollaborationCommunicationMessage = Object.freeze({
  messageId: "message-1", senderAgentRunId: "sender-run", receiverAgentRunId: "receiver-run", content: "hello",
  messageType: "agent_message", referenceFiles: Object.freeze([]), createdAt: "2026-08-15T00:00:00.000Z",
});
const refusalOf = (error: unknown) => error instanceof TaskDelegationError
  ? { accepted: false as const, code: error.code, message: error.message } : null;

const subject = (options: { current?: readonly CollaborationCommunicationMessage[]; open?: boolean; receiver?: boolean; publishes?: boolean } = {}) => {
  const order: string[] = [];
  const scope = { error: null as Error | null };
  const slot = {
    agentRunId: "receiver-run",
    cancel: vi.fn(() => { order.push("cancel"); }),
    commit: vi.fn(() => { order.push("commit"); return Object.freeze({ release: () => { order.push("release"); } }); }),
  };
  const setMessages = vi.fn((messages: readonly CollaborationCommunicationMessage[]) => { order.push(`list:${messages.length}`); });
  const control = createRootMessageAppend({
    message,
    receiver: options.receiver === false ? null : {
      reservation: slot as never,
      input: new AgentInputUserMessage("hello", SenderType.AGENT),
      checkTaskScope: () => { if (scope.error) throw scope.error; },
      present: () => { order.push("present"); },
    },
    isOpen: () => options.open ?? true,
    getMessages: () => options.current ?? [],
    setMessages,
    logOwnersOf: () => [COORDINATING_LOG],
    publishToRootView: options.publishes === false ? null : () => { order.push("publish"); },
    scopeRefusalOf: refusalOf,
  });
  return { ...control, order, scope, slot, setMessages };
};

describe("RootMessageAppend", () => {
  it("prepares under the lock, then after durability: list, slot commit, publish, present, release", () => {
    const s = subject();
    expect(s.append.prepare()).toEqual({ kind: "append", logOwners: [COORDINATING_LOG] });
    s.append.commitAfterDurability();
    expect(s.order).toEqual(["list:1", "commit", "publish", "present", "release"]);
    expect(s.closure()).toBeNull();
  });

  it("a form that does not publish (a message from a remote run) presents and releases without the root-view publish", () => {
    const s = subject({ publishes: false });
    s.append.prepare();
    s.append.commitAfterDurability();
    expect(s.order).toEqual(["list:1", "commit", "present", "release"]);
  });

  it("the sender record of a remote send updates the list only: no slot, no Task check, no events", () => {
    const s = subject({ receiver: false, publishes: false });
    s.scope.error = new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "closed");
    expect(s.append.prepare()).toMatchObject({ kind: "append" });
    s.append.commitAfterDurability();
    expect(s.order).toEqual(["list:1"]);
  });

  it("a root that is not open or a message ID already in the list is a conflict: the slot is dropped, nothing appended", () => {
    for (const s of [subject({ open: false }), subject({ current: [message] })]) {
      expect(s.append.prepare()).toEqual({ kind: "conflict" });
      expect(s.order).toEqual(["cancel"]);
      s.append.commitAfterDurability();
      expect(s.order).toEqual(["cancel"]);
    }
  });

  it.each(["TASK_AGENT_RESOURCE_CLOSED", "TASK_AGENT_RESOURCE_CONFLICT"] as const)(
    "C-2: a %s scope error under the lock is the refusal with the error's own text; the slot is dropped", (code) => {
    const s = subject();
    s.scope.error = new TaskDelegationError(code, `Refused: ${code}`);
    expect(s.append.prepare()).toEqual({ kind: "refused" });
    expect(s.closure()).toEqual({ kind: "task_scope", refusal: { accepted: false, code, message: `Refused: ${code}` } });
    expect(s.order).toEqual(["cancel"]);
  });

  it("RR-003: a genuine scope error is rethrown with nothing changed, so abandon drops the slot", () => {
    const s = subject();
    s.scope.error = new Error("storage is gone");
    expect(() => s.append.prepare()).toThrow("storage is gone");
    expect(s.order).toEqual([]);
    s.abandon();
    expect(s.order).toEqual(["cancel"]);
  });

  it("REQ-012: the Task closing after durability keeps the record and its publish, drops the slot, never presents", () => {
    const s = subject();
    s.append.prepare();
    s.scope.error = new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task is DONE.");
    s.append.commitAfterDurability();
    expect(s.order).toEqual(["list:1", "publish", "cancel"]);
    expect(s.slot.commit).not.toHaveBeenCalled();
    expect(s.closure()).toEqual({ kind: "task_scope", refusal: { accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "The Task is DONE." } });
  });

  it("REQ-012: a recipient that stopped accepting input after durability is a closure, not a throw; no publish for a form that does not publish", () => {
    const s = subject({ publishes: false });
    s.slot.commit.mockImplementation(() => { throw new Error("AgentRun input reservation '1' cannot be committed."); });
    s.append.prepare();
    expect(() => s.append.commitAfterDurability()).not.toThrow();
    expect(s.order).toEqual(["list:1", "cancel"]);
    expect(s.closure()).toEqual({ kind: "recipient_stopped" });
  });

  it("a genuine scope error after durability is rethrown (the root fail-stops), and a present failure still releases", () => {
    const s = subject();
    s.append.prepare();
    s.scope.error = new Error("index corrupted");
    expect(() => s.append.commitAfterDurability()).toThrow("index corrupted");
    const p = subject();
    p.append.prepare();
    const failing = createRootMessageAppend({
      message, receiver: { reservation: p.slot as never, input: {} as never, checkTaskScope: () => undefined, present: () => { throw new Error("present failed"); } },
      isOpen: () => true, getMessages: () => [], setMessages: vi.fn(), logOwnersOf: () => [], publishToRootView: null, scopeRefusalOf: refusalOf,
    });
    failing.append.prepare();
    expect(() => failing.append.commitAfterDurability()).toThrow("present failed");
    expect(p.order).toEqual(["commit", "release"]);
    failing.abandon();
    expect(p.slot.cancel).not.toHaveBeenCalled();
  });

  it("dropping a slot the recipient already dropped never replaces the outcome", () => {
    const s = subject({ current: [message] });
    s.slot.cancel.mockImplementation(() => { throw new Error("AgentRun input reservation '1' cannot be cancelled."); });
    expect(s.append.prepare()).toEqual({ kind: "conflict" });
    const refused = subject();
    refused.slot.cancel.mockImplementation(() => { throw new Error("cannot be cancelled"); });
    refused.scope.error = new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "closed");
    expect(refused.append.prepare()).toEqual({ kind: "refused" });
    const abandoned = subject();
    abandoned.slot.cancel.mockImplementation(() => { throw new Error("cannot be cancelled"); });
    abandoned.append.prepare();
    expect(() => abandoned.abandon()).not.toThrow();
  });

  it("a slot held through an indeterminate write is dropped by abandon; a late post-durability step then does nothing", () => {
    const s = subject();
    expect(s.append.prepare()).toMatchObject({ kind: "append" });
    s.abandon();
    expect(s.order).toEqual(["cancel"]);
    s.append.commitAfterDurability();
    expect(s.order).toEqual(["cancel"]);
    expect(s.setMessages).not.toHaveBeenCalled();
    expect(() => s.append.prepare()).toThrow("is not sealed");
  });
});
