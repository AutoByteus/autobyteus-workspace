import { vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RootCommunicationPort } from "../../../../src/agent-collaboration/execution/communication/root-communication-port.js";
import { ROOT_NOT_ACCEPTING_MESSAGES } from "../../../../src/agent-collaboration/execution/communication/root-communication-port.js";
import type { RootMessageAppend, RootMessageAppendResult } from "../../../../src/agent-collaboration/execution/communication/root-message-append.js";
import { COORDINATING_LOG } from "../../../../src/run-history/store/task-agent-message-logs.js";

/**
 * A RootCommunicationEngine port double. Its `commitMessageAppend` runs the append the way every root
 * coordinator does (prepare, the log write, the post-durability step), with the write always durable.
 */
export const runAppendDurably = async (append: RootMessageAppend): Promise<RootMessageAppendResult> => {
  const prepared = append.prepare();
  if (prepared.kind !== "append") return { outcome: prepared.kind };
  append.commitAfterDurability();
  return { outcome: "committed" };
};

export const reservationDouble = (agentRunId: string) => Object.freeze({
  agentRunId, cancel: vi.fn(), commit: vi.fn(() => Object.freeze({ release: vi.fn() })),
});

export const communicationPortDouble = (root: RootCommunicationPort["root"], overrides: Partial<RootCommunicationPort> = {}): RootCommunicationPort => ({
  root,
  initialMessages: [],
  rejections: {
    deliverNotAccepting: ROOT_NOT_ACCEPTING_MESSAGES,
    commitConflict: { code: "ROOT_COMMIT_CONFLICT", message: "Append conflicts." },
    historyCommitFailedCode: "ROOT_HISTORY_COMMIT_FAILED",
  },
  isOpen: () => true,
  isCurrentAgent: () => true,
  assertDeliveryAllowed: () => undefined,
  buildRecipientInput: () => new AgentInputUserMessage("x"),
  reserveRecipientInput: vi.fn(async (agentRunId: string) => ({ reserved: true as const, reservation: reservationDouble(agentRunId) })),
  logOwnersOf: () => [COORDINATING_LOG],
  commitMessageAppend: vi.fn(runAppendDurably),
  publishToRootView: vi.fn(),
  presentRecipientInput: vi.fn(),
  ...overrides,
});
