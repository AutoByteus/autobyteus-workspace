import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import {
  bindProcessRemoteRunChannel,
  releaseProcessRemoteRunChannel,
  type RemoteRunChannel,
} from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentConversationActivityInspector } from "../../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentOrgCommunicationMessagesStore } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { InMemoryTaskExecutionResources, ingressOfOutcome } from "../../fixtures/task-execution-resource-fixtures.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { buildOrg, cleanupDirectories as cleanupOrgDirectories } from "../agent-org-execution/helpers/org-collaborator-harness.js";
import { cleanupDirectories as cleanupTeamDirectories, harness as teamHarness } from "../agent-team-execution/helpers/team-root-collaborator-harness.js";
import { HOST, buildManager, cleanupDirectories as cleanupStandaloneDirectories } from "../standalone-agent-run-root/helpers/standalone-root-harness.js";

/**
 * Baseline contract of teammate and remote message delivery in each real root (standalone, AgentOrg, Team) and
 * each entry form (same-root `deliver` by run ID, by address and as existing-copy Task work; `acceptFromRemote`;
 * the sender record of a remote send, `commitSentToRemote`): agent-input-delivery-simplification V-2 and V-3.
 *
 * Every value is RECORDED FROM THE BASELINE CODE (`0216c6fb14`) into `root-communication-baseline-contract.json`,
 * under a frozen clock (`messageId` hashes `createdAt`), and later code must reproduce it exactly:
 * - every file under the root's directory after each step (message log lines and their log-owner placement,
 *   trees), with only temp-directory prefixes masked;
 * - the recipient input (content, `message_id`, `dedupe_key`, metadata) and the transmission sent to the peer;
 * - each caller-visible result, refusal code and message, and thrown error name and text;
 * - the events the root publishes for each step.
 *
 * Not recorded: agent status events that come from the handle test doubles (their reservation `commit()` emits
 * `running`, which a real AgentRun reservation never does); they are not published by the delivery path.
 *
 * "Communication admission closed" (the not-accepting codes per entry form) closes only the root's message
 * admission through its private `communication.closeAdmission()` (the same name before and after the refactor),
 * so the public calls pass the root's own gate and reach the delivery path's checks.
 *
 * Re-record only from known-good baseline code:
 * `TEST_RECORD_ROOT_COMMUNICATION_BASELINE=1 pnpm exec vitest run <this file> --no-watch`.
 */
const FIXTURE = path.join(path.dirname(new URL(import.meta.url).pathname), "root-communication-baseline-contract.json");
const RECORD = process.env["TEST_RECORD_ROOT_COMMUNICATION_BASELINE"] === "1";
const FROZEN_NOW = new Date("2026-10-24T08:00:00.000Z");
const PEER_ID = "srv_node_peer_0000000000000000000000000";
const PEER_NAME = "docker";
const REMOTE_RUN = "publisher_r1";

type Outcome = unknown;
type Handle = { reserveInput: ReturnType<typeof vi.fn> };

type RootSubject = Readonly<{
  tmp: string;
  rootDir: string;
  /** The store class and method that append one message to the root's logs. */
  appendStore: Readonly<{ prototype: object; method: string }>;
  copyRunId: string;
  /** The local agent that delegated to the remote run and receives its replies. */
  remoteReceiverRunId: string;
  events: unknown[];
  transmissions: unknown[];
  lastCopyInput(): unknown;
  /** The last input reserved for this local run (the receiver of a message by address). */
  lastInputOf(agentRunId: string): unknown;
  lastRemoteReceiverInput(): unknown;
  rejectNextCopyReservation(): void;
  terminateWhileReservingCopy(): Readonly<{ cancel: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }>;
  sendByRunId(content: string): Promise<AgentOperationResult>;
  sendByAddress(content: string): Promise<AgentOperationResult>;
  closeTaskA(): Promise<void>;
  assignExistingCopy(): Promise<unknown>;
  delegateRemote(): Promise<unknown>;
  sendToRemote(content: string): Promise<AgentOperationResult>;
  receiveFromRemote(messageId: string, content: string): Promise<AgentOperationResult>;
  closeCommunicationAdmission(): void;
  failStop(): void;
}>;

const outcomeOf = async (operation: () => Promise<unknown>): Promise<Outcome> => {
  try {
    return await operation();
  } catch (error) {
    const typed = error as { name?: string; code?: unknown; message?: string };
    return { thrown: { name: typed.name ?? "Error", code: typeof typed.code === "string" ? typed.code : null, message: typed.message ?? String(error) } };
  }
};

/** A peer node that accepts everything: one delegated Agent run, and every message. */
const peerChannel = (transmissions: unknown[]): RemoteRunChannel => ({
  findPeer: vi.fn(async (name: string) => (name === PEER_NAME ? { nodeId: PEER_ID, name: PEER_NAME } : { accepted: false as const, code: "PEER_NOT_FOUND", message: `No peer '${name}'.` })),
  peerName: vi.fn(async () => PEER_NAME),
  startDelegatedRun: vi.fn(async () => ({ accepted: true as const, kind: "agent" as const, agentRunId: REMOTE_RUN })),
  deliverMessage: vi.fn(async (input: unknown) => { transmissions.push(input); return { accepted: true as const }; }),
  runSummaries: vi.fn(async () => ({ accepted: true as const, runs: [] })),
  agentProjection: vi.fn(async () => ({ accepted: false as const, code: "NOT_USED", message: "Not used." })),
  ownerCommand: vi.fn(async () => ({ accepted: true as const })),
  observeRun: vi.fn(() => ({ close: () => undefined })),
}) as unknown as RemoteRunChannel;

let boundChannel: RemoteRunChannel | null = null;
const bindPeer = (transmissions: unknown[]) => {
  boundChannel = peerChannel(transmissions);
  bindProcessRemoteRunChannel(boundChannel);
};

const terminatingReservation = (handle: Handle, agentRunId: string, terminate: () => Promise<unknown>) => {
  const slot = { cancel: vi.fn(), commit: vi.fn(() => ({ release: vi.fn() })) };
  handle.reserveInput.mockImplementationOnce(async () => {
    void terminate().catch(() => undefined);
    return { reserved: true as const, reservation: { agentRunId, ...slot } };
  });
  return slot;
};
const notAcceptingReservation = { reserved: false as const, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input." };
const remoteMessage = (messageId: string, receiverAgentRunId: string, content: string) => Object.freeze({
  messageId, senderAgentRunId: REMOTE_RUN, receiverAgentRunId, content, messageType: "agent_message",
  referenceFiles: Object.freeze([]), createdAt: new Date().toISOString(),
});

const standalone = async (): Promise<RootSubject> => {
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("A");
  resources.addTask("B", "Follow-up cleanup");
  const transmissions: unknown[] = [];
  bindPeer(transmissions);
  const f = await buildManager(resources);
  const root = (await f.manager.resolveRoot(HOST))!;
  const events: unknown[] = [];
  root.subscribeToEvents((sequenced) => { events.push((sequenced as { event: unknown }).event); });
  const copyRunId = ingressOfOutcome(await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "A" }));
  await flushMicrotasks();
  const copy = () => f.handles.get(copyRunId)!.handle as unknown as Handle;
  const sender = { kind: "agent" as const, identity: f.hostIdentity, displayName: "research_assistant" };
  const copyIdentity = () => {
    const entry = (root.getExecutionTreeSnapshot().taskExecutions as readonly { agentRunId?: string; address: string }[])
      .find((execution) => execution.agentRunId === copyRunId)!;
    return createCollaborationMemberExecutionIdentity({ root: f.hostIdentity.root, memberAddress: entry.address as never, agentRunId: copyRunId });
  };
  return {
    tmp: f.memoryDir, rootDir: f.memoryDir,
    appendStore: { prototype: StandaloneRootPackageStore.prototype, method: "appendMessage" },
    copyRunId, remoteReceiverRunId: HOST, events, transmissions,
    lastCopyInput: () => copy().reserveInput.mock.calls.at(-1)?.[0],
    lastInputOf: (agentRunId) => (agentRunId === HOST ? f.host.run.reserveUserMessage : copy().reserveInput).mock.calls.at(-1)?.[0],
    lastRemoteReceiverInput: () => f.host.run.reserveUserMessage.mock.calls.at(-1)?.[0],
    rejectNextCopyReservation: () => { copy().reserveInput.mockResolvedValueOnce(notAcceptingReservation); },
    terminateWhileReservingCopy: () => terminatingReservation(copy(), copyRunId, () => root.terminate()),
    sendByRunId: (content) => root.deliverExactAgentMessage({ sender, targetAgentRunId: copyRunId, content }),
    // The copy messages the host by the host's address (a copy is reached by run ID, the host by address).
    sendByAddress: (content) => root.deliverLogicalMessage(copyIdentity(), { recipientAddress: "/research_assistant" as never, content }),
    closeTaskA: async () => { await root.releaseTaskExecutions(resources.close("A")); },
    assignExistingCopy: () => root.assignToExistingCopy({ identity: f.hostIdentity }, { copy: { agentRunId: copyRunId }, taskId: "B" }),
    delegateRemote: () => root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/publisher", node: PEER_NAME, description: "Publish the report" }),
    sendToRemote: (content) => root.deliverExactAgentMessage({ sender, targetAgentRunId: REMOTE_RUN, content }),
    receiveFromRemote: (messageId, content) => root.acceptRemoteMessage({ fromNodeId: PEER_ID, fromNodeName: PEER_NAME, message: remoteMessage(messageId, HOST, content) }),
    closeCommunicationAdmission: () => { (root as unknown as { communication: { closeAdmission(): void } }).communication.closeAdmission(); },
    failStop: () => root.enterPersistenceFailStop(),
  };
};

const org = async (): Promise<RootSubject> => {
  const transmissions: unknown[] = [];
  bindPeer(transmissions);
  const o = await buildOrg();
  o.resources.addTask("A");
  o.resources.addTask("B", "Follow-up cleanup");
  const events: unknown[] = [];
  o.publisher.subscribe((sequenced) => { events.push((sequenced as { event: unknown }).event); });
  const director = createCollaborationMemberExecutionIdentity({ root: o.root, memberAddress: "/director", agentRunId: "director" });
  const copyRunId = ingressOfOutcome(await o.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/code_reviewer", task_id: "A" }));
  await flushMicrotasks();
  const handle = (runId: string) => o.handles.get(runId)!.handle as unknown as Handle;
  const sender = { kind: "agent" as const, identity: director, displayName: "director" };
  return {
    tmp: o.orgMemoryDir, rootDir: o.orgMemoryDir,
    appendStore: { prototype: AgentOrgCommunicationMessagesStore.prototype, method: "appendMessage" },
    copyRunId, remoteReceiverRunId: "director", events, transmissions,
    lastCopyInput: () => handle(copyRunId).reserveInput.mock.calls.at(-1)?.[0],
    lastInputOf: (agentRunId) => handle(agentRunId).reserveInput.mock.calls.at(-1)?.[0],
    lastRemoteReceiverInput: () => handle("director").reserveInput.mock.calls.at(-1)?.[0],
    rejectNextCopyReservation: () => { handle(copyRunId).reserveInput.mockResolvedValueOnce(notAcceptingReservation); },
    terminateWhileReservingCopy: () => terminatingReservation(handle(copyRunId), copyRunId, () => o.owner.terminate()),
    sendByRunId: (content) => o.owner.deliverExactAgentMessage({ sender, targetAgentRunId: copyRunId, content }),
    // A configured member of the Org's mounted Team, by its address.
    sendByAddress: (content) => o.owner.deliverLogicalMessage(director, { recipientAddress: "/target/lead" as never, content }),
    closeTaskA: async () => { await o.owner.releaseTaskExecutions(o.resources.close("A")); },
    assignExistingCopy: () => o.owner.assignToExistingCopy({ identity: director }, { copy: { agentRunId: copyRunId }, taskId: "B" }),
    delegateRemote: () => o.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/publisher", node: PEER_NAME, description: "Publish the report" }),
    sendToRemote: (content) => o.owner.deliverExactAgentMessage({ sender, targetAgentRunId: REMOTE_RUN, content }),
    receiveFromRemote: (messageId, content) => o.owner.acceptRemoteMessage({ fromNodeId: PEER_ID, fromNodeName: PEER_NAME, message: remoteMessage(messageId, "director", content) }),
    closeCommunicationAdmission: () => { (o.owner as unknown as { communication: { closeAdmission(): void } }).communication.closeAdmission(); },
    failStop: () => o.owner.enterPersistenceFailStop(),
  };
};

const team = async (): Promise<RootSubject> => {
  // A restored Team copy needs its saved conversation (the existing-copy assignment restores it).
  vi.spyOn(AgentConversationActivityInspector.prototype, "inspect").mockReturnValue({ kind: "present" } as never);
  const transmissions: unknown[] = [];
  bindPeer(transmissions);
  const h = await teamHarness({ withTeammate: true });
  const resources = h.dependencies.taskExecutionResources;
  resources.addTask("A");
  resources.addTask("B", "Follow-up cleanup");
  const events: unknown[] = [];
  h.root.subscribeToEvents((sequenced) => { events.push((sequenced as { event: unknown }).event); });
  const coordinator = h.identity("/coordinator", "run-coordinator");
  const copyRunId = ingressOfOutcome(await h.root.delegateToNewCopy({ identity: coordinator }, { recipient_address: "/code_reviewer", task_id: "A" }));
  await flushMicrotasks();
  const handle = (runId: string) => h.handles.get(runId)!.handle as unknown as Handle;
  const sender = { kind: "agent" as const, identity: coordinator, displayName: "coordinator" };
  return {
    tmp: h.memoryDir, rootDir: h.memoryDir,
    appendStore: { prototype: TeamCommunicationStore.prototype, method: "appendMessage" },
    copyRunId, remoteReceiverRunId: "run-coordinator", events, transmissions,
    lastCopyInput: () => handle(copyRunId).reserveInput.mock.calls.at(-1)?.[0],
    lastInputOf: (agentRunId) => handle(agentRunId).reserveInput.mock.calls.at(-1)?.[0],
    lastRemoteReceiverInput: () => handle("run-coordinator").reserveInput.mock.calls.at(-1)?.[0],
    rejectNextCopyReservation: () => { handle(copyRunId).reserveInput.mockResolvedValueOnce(notAcceptingReservation); },
    terminateWhileReservingCopy: () => terminatingReservation(handle(copyRunId), copyRunId, () => h.root.terminate()),
    sendByRunId: (content) => h.root.deliverExactAgentMessage({ sender, targetAgentRunId: copyRunId, content }),
    // A configured teammate, by its address.
    sendByAddress: (content) => h.message(coordinator, "/worker", content),
    closeTaskA: async () => { await h.root.releaseTaskExecutions(resources.close("A")); },
    assignExistingCopy: () => h.root.assignToExistingCopy({ identity: coordinator }, { copy: { agentRunId: copyRunId }, taskId: "B" }),
    delegateRemote: () => h.root.delegateToNewCopy({ identity: coordinator }, { recipient_address: "/publisher", node: PEER_NAME, description: "Publish the report" }),
    sendToRemote: (content) => h.root.deliverExactAgentMessage({ sender, targetAgentRunId: REMOTE_RUN, content }),
    receiveFromRemote: (messageId, content) => h.root.acceptRemoteMessage({ fromNodeId: PEER_ID, fromNodeName: PEER_NAME, message: remoteMessage(messageId, "run-coordinator", content) }),
    closeCommunicationAdmission: () => { (h.root as unknown as { communication: { closeAdmission(): void } }).communication.closeAdmission(); },
    failStop: () => h.root.enterPersistenceFailStop(),
  };
};

const ROOTS = { standalone, org, team } as const;
type RootKind = keyof typeof ROOTS;

/** Plain JSON with temp paths masked; drops functions as persisted JSON would. */
const recorded = (subject: RootSubject, value: unknown): unknown =>
  value === undefined ? null : JSON.parse(JSON.stringify(value).split(subject.tmp).join("<TMP>"));

/** Every file under the root's directory, by relative path, with temp paths masked. */
const filesOf = async (subject: RootSubject): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out[path.relative(subject.rootDir, full)] = (await fs.readFile(full, "utf8")).split(subject.tmp).join("<TMP>");
    }
  };
  await walk(subject.rootDir);
  return out;
};

/** See the file comment: status events from the handle doubles are not published by the delivery path. */
const isHandleDoubleStatus = (event: unknown): boolean => {
  const value = event as { kind?: string; message?: { type?: string }; eventSourceType?: string; payload?: { eventType?: string } };
  return (value.kind === "agent_presentation" && value.message?.type === "AGENT_STATUS")
    || (value.eventSourceType === "AGENT" && value.payload?.eventType === "AGENT_STATUS");
};

/** One step's record: its result, the events and peer transmissions it caused, and the files after it. */
const step = async (subject: RootSubject, operation: () => Promise<unknown>) => {
  const eventsBefore = subject.events.length;
  const sentBefore = subject.transmissions.length;
  const result = await outcomeOf(operation);
  await flushMicrotasks();
  return {
    result: recorded(subject, result),
    events: recorded(subject, subject.events.slice(eventsBefore).filter((event) => !isHandleDoubleStatus(event))),
    transmissions: recorded(subject, subject.transmissions.slice(sentBefore)),
    files: await filesOf(subject),
  };
};

const at = (seconds: number) => vi.setSystemTime(new Date(FROZEN_NOW.getTime() + seconds * 1_000));

/** The same-root `deliver` form: accepted by run ID and address, then every refusal on the delivery path. */
const captureDeliver = async (kind: RootKind) => {
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
  const subject = await ROOTS[kind]();
  const byRunId = await step(subject, () => subject.sendByRunId("Baseline teammate message"));
  const byRunIdRecipientInput = recorded(subject, subject.lastCopyInput());
  // Same sender, recipient, content and frozen time: the same message ID, so a duplicate.
  const duplicate = await step(subject, () => subject.sendByRunId("Baseline teammate message"));
  at(1);
  const byAddress = await step(subject, () => subject.sendByAddress("Baseline message by address"));
  const byAddressReceiver = (byAddress.result as { agentRunId?: string } | null)?.agentRunId;
  if (!byAddressReceiver) throw new Error(`The message by address was not delivered: ${JSON.stringify(byAddress.result)}`);
  const byAddressRecipientInput = recorded(subject, subject.lastInputOf(byAddressReceiver));
  at(2);
  subject.rejectNextCopyReservation();
  const recipientNotAccepting = await step(subject, () => subject.sendByRunId("Recipient is not accepting"));
  at(3);
  const write = vi.spyOn(subject.appendStore.prototype as Record<string, (...args: unknown[]) => unknown>, subject.appendStore.method);
  write.mockResolvedValueOnce({ outcome: "not_renamed", file: "communication_messages", cause: new Error("Controlled history write failure") });
  const historyWriteFailed = await step(subject, () => subject.sendByRunId("History write fails"));
  at(4);
  write.mockResolvedValueOnce({ outcome: "renamed_finalization_indeterminate", file: "communication_messages", stage: "directory_sync", cause: new Error("Controlled indeterminate finalization") });
  const indeterminateWrite = await step(subject, () => subject.sendByRunId("History write is indeterminate"));
  write.mockRestore();
  return { copyRunId: subject.copyRunId, byRunId, byRunIdRecipientInput, duplicate, byAddress, byAddressRecipientInput,
    recipientNotAccepting, historyWriteFailed, indeterminateWrite };
};

/** Task-scope refusal before the slot, then the existing-copy Task work (same-root `deliver`). */
const captureTaskWork = async (kind: RootKind) => {
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
  const subject = await ROOTS[kind]();
  await subject.closeTaskA();
  at(1);
  const taskClosedBeforeSend = await step(subject, () => subject.sendByRunId("The Task is already closed"));
  at(2);
  const existingCopyAssignment = await step(subject, () => subject.assignExistingCopy());
  const existingCopyRecipientInput = recorded(subject, subject.lastCopyInput());
  return { taskClosedBeforeSend, existingCopyAssignment, existingCopyRecipientInput };
};

/** The remote forms: the sender record of a remote send, and a message from the remote run (twice: a duplicate). */
const captureRemote = async (kind: RootKind) => {
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
  const subject = await ROOTS[kind]();
  const delegated = await step(subject, () => subject.delegateRemote());
  at(1);
  const sentToRemote = await step(subject, () => subject.sendToRemote("Baseline message to the remote run"));
  at(2);
  const fromRemote = await step(subject, () => subject.receiveFromRemote("msg_from_remote_1", "Baseline reply from the remote run"));
  const fromRemoteRecipientInput = recorded(subject, subject.lastRemoteReceiverInput());
  const fromRemoteDuplicate = await step(subject, () => subject.receiveFromRemote("msg_from_remote_1", "Baseline reply from the remote run"));
  return { delegated, sentToRemote, fromRemote, fromRemoteRecipientInput, fromRemoteDuplicate };
};

/** Not-accepting codes per entry form; the root gate after a fail-stop; admission closed under a held slot. */
const captureNotAccepting = async (kind: RootKind) => {
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
  const closed = await ROOTS[kind]();
  await outcomeOf(() => closed.delegateRemote());
  at(1);
  closed.closeCommunicationAdmission();
  const deliverAfterAdmissionClosed = recorded(closed, await outcomeOf(() => closed.sendByRunId("Admission is closed")));
  const sendToRemoteAfterAdmissionClosed = recorded(closed, await outcomeOf(() => closed.sendToRemote("Admission is closed")));
  const fromRemoteAfterAdmissionClosed = recorded(closed, await outcomeOf(() => closed.receiveFromRemote("msg_from_remote_closed", "Admission is closed")));
  releaseBoundChannel();

  const stopped = await ROOTS[kind]();
  stopped.failStop();
  const deliverAfterFailStop = recorded(stopped, await outcomeOf(() => stopped.sendByRunId("Root is stopped")));
  releaseBoundChannel();

  at(2);
  const closing = await ROOTS[kind]();
  const slot = closing.terminateWhileReservingCopy();
  const closedWhileReserved = recorded(closing, await outcomeOf(() => closing.sendByRunId("Admission closes under the slot")));
  await flushMicrotasks();
  return { deliverAfterAdmissionClosed, sendToRemoteAfterAdmissionClosed, fromRemoteAfterAdmissionClosed, deliverAfterFailStop,
    closedWhileReserved, closedWhileReservedSlot: { cancelled: slot.cancel.mock.calls.length, committed: slot.commit.mock.calls.length } };
};

const releaseBoundChannel = () => {
  if (boundChannel) releaseProcessRemoteRunChannel(boundChannel);
  boundChannel = null;
};

const CAPTURES = { deliver: captureDeliver, taskWork: captureTaskWork, remote: captureRemote, notAccepting: captureNotAccepting } as const;
const results: Record<string, unknown> = {};

afterEach(async () => {
  releaseBoundChannel();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all([cleanupStandaloneDirectories(), cleanupOrgDirectories(), cleanupTeamDirectories()]);
});

describe.each(Object.keys(ROOTS) as RootKind[])("%s root message delivery matches the baseline record", (kind) => {
  it.each(Object.keys(CAPTURES) as (keyof typeof CAPTURES)[])("%s", async (capture) => {
    const actual = await CAPTURES[capture](kind);
    const key = `${kind}.${capture}`;
    if (RECORD) { results[key] = actual; return; }
    const baseline = JSON.parse(await fs.readFile(FIXTURE, "utf8")) as Record<string, unknown>;
    expect(baseline[key], `no baseline record for ${key}`).toBeDefined();
    expect(actual).toEqual(baseline[key]);
  });
});

if (RECORD) {
  describe("record", () => {
    it("writes the baseline record", async () => {
      await fs.writeFile(FIXTURE, `${JSON.stringify({ baselineCommit: process.env["TEST_RECORD_BASELINE_COMMIT"] ?? null, ...results }, null, 2)}\n`);
    });
  });
}
