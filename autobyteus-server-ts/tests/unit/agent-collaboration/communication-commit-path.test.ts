import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RootCommunicationEngine } from "../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import type { RootCommunicationAdapter } from "../../../src/agent-collaboration/execution/communication/root-communication-adapter.js";
import { AgentOrgCommunicationMessagesStore } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { AgentOrgCommunicationAdapter } from "../../../src/agent-org-execution/services/agent-org-communication-adapter.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import type { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { MessageLog } from "../../../src/run-history/store/message-log.js";
import { COORDINATING_LOG } from "../../../src/run-history/store/task-agent-message-logs.js";
import { createTeamCommunicationMessageAppendPlan } from "../../../src/services/team-communication/team-communication-message-append-plan.js";
import { emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { StandaloneRootCommunicationAdapter } from "../../../src/standalone-agent-run-root/services/standalone-root-communication-adapter.js";
import { StandaloneRootPersistenceCoordinator } from "../../../src/standalone-agent-run-root/services/standalone-root-persistence-coordinator.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * The commit path after append-only message logs (REQ-001, REQ-002; AC-002; ARCH-F-002, ARCH-F-004):
 * only the new message is validated; a message whose id is already in the in-memory list is refused by
 * the adapter or the team append plan before anything is persisted (the guarantee that a log never holds
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
const appendInput = (current: readonly CollaborationCommunicationMessage[], next: CollaborationCommunicationMessage) => {
  const reserved = reservation();
  const committed: { messages: readonly CollaborationCommunicationMessage[] | null } = { messages: null };
  return {
    reserved, committed,
    input: {
      message: next, inputMessage: {} as never, reservation: reserved,
      getCurrentMessages: () => current,
      commitMessages: (messages: readonly CollaborationCommunicationMessage[]) => { committed.messages = messages; },
    },
  };
};
const persistence = () => ({
  commitCommunication: vi.fn(async (input: { commitAfterDurability(): void }) => { input.commitAfterDurability(); return { committed: true as const }; }),
});

describe("RootCommunicationEngine", () => {
  const root = { rootSubjectKind: "agent_team", rootRunId: "team-1" } as never;
  const member = (agentRunId: string) => ({ root, memberAddress: `/${agentRunId}`, agentRunId } as never);
  const engineWith = (initialMessages: readonly CollaborationCommunicationMessage[]) => {
    const reserved = reservation();
    const adapter: RootCommunicationAdapter = {
      root, initialMessages, isOpen: () => true, assertDeliveryAllowed: () => undefined, isCurrentAgent: () => true,
      buildRecipientInput: () => new AgentInputUserMessage("x"),
      reserveRecipientInput: vi.fn(async () => ({ reserved: true as const, reservation: reserved as never })),
      commitAppend: vi.fn(async (input) => { input.commitMessages(Object.freeze([...input.getCurrentMessages(), input.message])); return { committed: true as const }; }),
    };
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

  it("keeps the committed list as the adapter formed it, without validating it again", async () => {
    const { engine } = engineWith([message("old", 1)]);
    await expect(deliver(engine, ["/work/notes.md"])).resolves.toMatchObject({ accepted: true });
    const messages = engine.getMessages();
    expect(messages.map((entry) => entry.messageId)[0]).toBe("old");
    expect(messages).toHaveLength(2);
    expect(messages[1]).toMatchObject({ senderAgentRunId: "a", receiverAgentRunId: "b", content: "hello", referenceFiles: ["/work/notes.md"] });
  });
});

describe("standalone and organization adapters", () => {
  const adapters = () => {
    const standalonePersistence = persistence();
    const orgPersistence = persistence();
    const common = {
      isOpen: () => true, isCurrentAgent: () => true, messageLogOwnerOf: () => COORDINATING_LOG, assertDeliveryAllowed: () => undefined,
      reserveRecipientInput: vi.fn(), replaceMessages: vi.fn(), publish: vi.fn(), presentCommittedMessage: vi.fn(),
    };
    return {
      standalone: { persistence: standalonePersistence, code: "AGENT_ROOT_MESSAGE_COMMIT_CONFLICT", adapter: new StandaloneRootCommunicationAdapter({
        ...common, root: { rootRunId: "host" } as never, persistence: standalonePersistence as never,
        initial: { schemaVersion: 1, subjectKind: "agent", hostRunId: "host", messages: [] } }) },
      org: { persistence: orgPersistence, code: "AGENT_ORG_MESSAGE_COMMIT_CONFLICT", adapter: new AgentOrgCommunicationAdapter({
        ...common, root: { rootRunId: "org" } as never, persistence: orgPersistence as never,
        initial: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org", messages: [] } }) },
    };
  };

  it.each(["standalone", "org"] as const)("%s: refuses a message whose id is already in memory, before persisting (no duplicate in any log)", async (family) => {
    const { adapter, persistence: port, code } = adapters()[family];
    const { input, reserved } = appendInput([message("m1", 1)], message("m1", 1));
    expect(await adapter.commitAppend(input)).toMatchObject({ committed: false, code });
    expect(reserved.cancel).toHaveBeenCalledTimes(1);
    expect(port.commitCommunication).not.toHaveBeenCalled();
  });

  it.each(["standalone", "org"] as const)("%s: forms the next list by appending, without validating the history again", async (family) => {
    const { adapter, persistence: port } = adapters()[family];
    // A stored message the whole-list validation would have rejected (not a canonical timestamp).
    const history = [message("old", 1, { createdAt: "yesterday" })];
    const { input, committed } = appendInput(history, message("m2", 2));
    expect(await adapter.commitAppend(input)).toEqual({ committed: true });
    expect(port.commitCommunication).toHaveBeenCalledTimes(1);
    expect(committed.messages?.map((entry) => entry.messageId)).toEqual(["old", "m2"]);
  });
});

describe("team append plan", () => {
  const plan = (current: readonly CollaborationCommunicationMessage[], next: CollaborationCommunicationMessage) => {
    const reserved = reservation();
    return { reserved, plan: createTeamCommunicationMessageAppendPlan({
      rootTeamRunId: "team", message: next, receiver: { inputMessage: {} as never, reservation: reserved as never }, isAccepting: () => true,
      getCurrent: () => ({ schemaVersion: 1, rootTeamRunId: "team", messages: current }), resolveLogOwners: () => [COORDINATING_LOG],
      replaceCurrent: vi.fn(), publish: vi.fn(),
    }) };
  };

  it("refuses a message whose id is already in memory (TEAM_MESSAGE_COMMIT_CONFLICT)", () => {
    const { plan: append, reserved } = plan([message("m1", 1)], message("m1", 1));
    expect(append.prepareAgainstCurrent()).toMatchObject({ prepared: false, code: "TEAM_MESSAGE_COMMIT_CONFLICT" });
    expect(reserved.cancel).toHaveBeenCalledTimes(1);
  });

  it("forms the next snapshot by appending, without validating the history again", () => {
    const { plan: append } = plan([message("old", 1, { createdAt: "yesterday" })], message("m2", 2));
    const prepared = append.prepareAgainstCurrent();
    expect(prepared.prepared).toBe(true);
    if (prepared.prepared) expect(prepared.commit.nextMessages.messages.map((entry) => entry.messageId)).toEqual(["old", "m2"]);
  });
});

describe("package-creation retry after the log was written and the tree write failed (ARCH-F-002)", () => {
  it("standalone: the retried first tree commit rewrites the host's log and succeeds", async () => {
    const dir = path.join(await tempDir(), "agents", "host", "collaboration");
    const store = new StandaloneRootPackageStore();
    const writeTree = store.writeTree.bind(store);
    vi.spyOn(store, "writeTree").mockImplementationOnce(async () => ({ outcome: "not_renamed", file: "execution_tree", stage: "rename", cause: new Error("disk full") }))
      .mockImplementation(writeTree);
    const coordinator = new StandaloneRootPersistenceCoordinator({
      hostRunId: "host", collaborationDir: dir, store, packageExists: false,
      getMessages: () => ({ schemaVersion: 1, subjectKind: "agent", hostRunId: "host", messages: [message("m1", 1)] }),
      onPackageCreated: async () => undefined, enterPersistenceFailStop: vi.fn(),
    });
    const tree = emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: "host", agentDefinitionId: "assistant" }, createdAt: "2026-10-18T10:00:00.000Z" });
    const mutation = () => ({ prepareAgainstCurrent: () => ({ nextTree: tree, commitAfterDurability: vi.fn(), cancelBeforeDurability: vi.fn() }) });
    await expect(coordinator.commitTreeMutation(mutation())).rejects.toThrow("disk full");
    expect((await new MessageLog(dir, "communication_messages").read())?.map((entry) => entry.messageId)).toEqual(["m1"]);
    await expect(coordinator.commitTreeMutation(mutation())).resolves.toBeUndefined();
    expect((await new MessageLog(dir, "communication_messages").read())?.map((entry) => entry.messageId)).toEqual(["m1"]);
    expect(await store.readTree(dir, "host")).toEqual(tree);
  });

  it("organization: the retried initial commit rewrites the run's log and succeeds", async () => {
    const dir = path.join(await tempDir(), "agent_orgs", "org");
    let treeWrites = 0;
    const executionTreeStore = { write: vi.fn(async () => (++treeWrites === 1
      ? { outcome: "not_renamed" as const, file: "execution_tree", stage: "rename" as const, cause: new Error("disk full") }
      : { outcome: "committed" as const, file: "execution_tree" })) } as unknown as AgentOrgRunExecutionTreeStore;
    const communicationStore = new AgentOrgCommunicationMessagesStore();
    const coordinator = new AgentOrgRunPersistenceCoordinator({ orgRunId: "org", orgMemoryDir: dir, executionTreeStore, communicationStore, enterPersistenceFailStop: vi.fn() });
    const initial = { tree: testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/director", "director")] }),
      messages: { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: "org", messages: [] } };
    await expect(coordinator.commitInitial(initial)).rejects.toThrow("disk full");
    await expect(coordinator.commitInitial(initial)).resolves.toBeUndefined();
    expect(await communicationStore.readLog(dir, "org")).toEqual({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org", messages: [] });
  });
});
