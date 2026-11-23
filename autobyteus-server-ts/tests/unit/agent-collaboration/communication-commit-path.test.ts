import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { RootCommunicationEngine } from "../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { createRootMessageAppend } from "../../../src/agent-collaboration/execution/communication/root-message-append.js";
import { MessageLog } from "../../../src/run-history/store/message-log.js";
import { OWN_RUN_LOG } from "../../../src/run-history/store/message-log-owners.js";
import { TeamRunPersistenceCoordinator } from "../../../src/agent-team-execution/services/team-run-persistence-coordinator.js";
import { communicationPortDouble } from "./helpers/communication-port-double.js";
import { StandaloneRootPersistenceCoordinator } from "../../../src/standalone-agent-run-root/services/standalone-root-persistence-coordinator.js";

/**
 * The commit path after append-only message logs (REQ-001, REQ-002; AC-002; ARCH-F-002, ARCH-F-004):
 * only the new message is validated; a message whose id is already in the in-memory list is refused by
 * the append under the root coordinator's lock before anything is persisted (the guarantee that a log never holds
 * a message twice; the stores append unconditionally); a package-creation retry after the log was written
 * and the tree write failed succeeds, because the first log write replaces the log.
 */

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const tempDir = async () => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "commit-path-")); roots.push(dir); return dir; };
const message = (messageId: string, second: number, overrides: Partial<CollaborationCommunicationMessage> = {}): CollaborationCommunicationMessage => Object.freeze({
  messageId, senderAgentRunId: "sender", receiverAgentRunId: "receiver", content: messageId, messageType: "agent_message",
  referenceFiles: Object.freeze([]), createdAt: `2026-10-18T10:00:${String(second).padStart(2, "0")}.000Z`, ...overrides,
});
const reservation = () => ({ agentRunId: "receiver", cancel: vi.fn(), commit: vi.fn(() => ({ release: vi.fn() })) });
const okWrite = { outcome: "committed" as const, file: "communication_messages" };

describe("RootCommunicationEngine", () => {
  const root = { rootSubjectKind: "agent_team", rootRunId: "team-1" } as never;
  const member = (agentRunId: string) => ({ root, memberAddress: `/${agentRunId}`, agentRunId } as never);
  const engineWith = (initialMessages: readonly CollaborationCommunicationMessage[]) => {
    const reserved = reservation();
    const adapter = communicationPortDouble(root, {
      initialMessages,
      reserveRecipientInput: vi.fn(async () => ({ reserved: true as const, reservation: reserved as never })),
    });
    return { engine: new RootCommunicationEngine(adapter), adapter };
  };
  const deliver = (engine: RootCommunicationEngine, referenceFiles: readonly string[] = []) => engine.deliver({
    senderIdentity: member("a"), senderDisplayName: "a", senderAddress: null, receiverIdentity: member("b"), receiverDisplayName: "b",
    content: "hello", referenceFiles,
  });

  it("validates the new message once, before reserving the receiver's input", async () => {
    const { engine, adapter } = engineWith([]);
    await expect(deliver(engine, ["relative/notes.md"])).rejects.toThrow("normalized absolute local path");
    expect(adapter.reserveRecipientInput).not.toHaveBeenCalled();
  });

  it("forms the committed list by appending, without validating it again", async () => {
    const { engine } = engineWith([message("old", 1)]);
    await expect(deliver(engine, ["/work/notes.md"])).resolves.toMatchObject({ accepted: true });
    const messages = engine.getMessages();
    expect(messages.map((entry) => entry.messageId)[0]).toBe("old");
    expect(messages).toHaveLength(2);
    expect(messages[1]).toMatchObject({ senderAgentRunId: "a", receiverAgentRunId: "b", content: "hello", referenceFiles: ["/work/notes.md"] });
  });
});

/** Each root's real persistence coordinator, its log store replaced by a spy that always writes durably. */
const coordinators = {
  standalone: () => {
    // The run's own log exists: each message is appended to it (autobyteus-461: the run's log is in its own folder).
    const store = { appendMessage: vi.fn(async () => okWrite), logExists: vi.fn(async () => true), writeMessages: vi.fn() };
    return { store, coordinator: new StandaloneRootPersistenceCoordinator({
      agentRunId: "host", runDir: "/memory/agents/host", store: store as never,
      getMessages: () => ({ schemaVersion: 1, subjectKind: "agent", agentRunId: "host", messages: [] }),
      enterPersistenceFailStop: vi.fn(),
    }) };
  },
  team: () => {
    const store = { appendMessage: vi.fn(async () => okWrite) };
    return { store, coordinator: new TeamRunPersistenceCoordinator({
      rootTeamRunId: "team", teamMemoryDir: "/memory/agent_teams/team", executionTreeStore: {} as never,
      communicationStore: store as never, enterPersistenceFailStop: vi.fn(),
    }) };
  },
} as const;

/** One append for `next` against the list `current`, as the engine builds it for a same-root message. */
const appendFor = (current: readonly CollaborationCommunicationMessage[], next: CollaborationCommunicationMessage) => {
  const reserved = reservation();
  const committed: { messages: readonly CollaborationCommunicationMessage[] | null } = { messages: null };
  const control = createRootMessageAppend({
    message: next,
    receiver: { reservation: reserved as never, input: {} as never, checkTaskScope: () => undefined, present: vi.fn() },
    isOpen: () => true,
    getMessages: () => current,
    setMessages: (messages) => { committed.messages = messages; },
    logOwnersOf: () => [OWN_RUN_LOG],
    publishToRootView: vi.fn(),
    scopeRefusalOf: () => null,
  });
  return { reserved, committed, append: control.append };
};

describe.each(Object.keys(coordinators) as (keyof typeof coordinators)[])("%s coordinator's commitMessageAppend", (kind) => {
  it("refuses a message whose id is already in memory, before persisting (no duplicate in any log)", async () => {
    const { coordinator, store } = coordinators[kind]();
    const { append, reserved } = appendFor([message("m1", 1)], message("m1", 1));
    expect(await coordinator.commitMessageAppend(append)).toEqual({ outcome: "conflict" });
    expect(reserved.cancel).toHaveBeenCalledTimes(1);
    expect(store.appendMessage).not.toHaveBeenCalled();
  });

  it("forms the next list by appending, without validating the history again", async () => {
    const { coordinator, store } = coordinators[kind]();
    // A stored message the whole-list validation would have rejected (not a canonical timestamp).
    const { append, committed } = appendFor([message("old", 1, { createdAt: "yesterday" })], message("m2", 2));
    expect(await coordinator.commitMessageAppend(append)).toEqual({ outcome: "committed" });
    expect(store.appendMessage).toHaveBeenCalledTimes(1);
    expect(committed.messages?.map((entry) => entry.messageId)).toEqual(["old", "m2"]);
  });
});
