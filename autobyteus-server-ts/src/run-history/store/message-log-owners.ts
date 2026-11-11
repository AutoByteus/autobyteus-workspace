import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { RunPackageFileWriteResult } from "./atomic-run-package-file-commit-writer.js";

/**
 * Per-run message logs (design D-4, contract §3.4, the email model): a message between parts of one run is stored
 * once, in that run's log; a message between two runs is stored in both logs with the same `messageId`, each by its
 * own run (autobyteus-461: a run writes only its own log; another run's side is that run's, or its node's).
 */
export type MessageLogOwner = Readonly<{ kind: "own" }> | Readonly<{ kind: "other_run" }>;

/** A log this run writes: its own. */
export type StoredMessageLogOwner = Extract<MessageLogOwner, { kind: "own" }>;

export const OWN_RUN_LOG: StoredMessageLogOwner = Object.freeze({ kind: "own" });
export const OTHER_RUN_LOG: MessageLogOwner = Object.freeze({ kind: "other_run" });

/** The logs this run writes for one message: its own, when one of the two agents is its own; else none. */
export const messageLogOwners = (
  message: Pick<CollaborationCommunicationMessage, "senderAgentRunId" | "receiverAgentRunId">,
  ownerOf: (agentRunId: string) => MessageLogOwner,
): readonly StoredMessageLogOwner[] =>
  ownerOf(message.receiverAgentRunId).kind === "own" || ownerOf(message.senderAgentRunId).kind === "own"
    ? Object.freeze([OWN_RUN_LOG]) : Object.freeze([]);

/** Writes one committed message to the run's own log, when it has one to write. */
export const appendMessageToOwnerLogs = async (
  owners: readonly StoredMessageLogOwner[],
  append: (owner: StoredMessageLogOwner) => Promise<RunPackageFileWriteResult>,
): Promise<RunPackageFileWriteResult<"communication_messages">> => {
  for (const owner of owners) {
    const result = await append(owner);
    if (result.outcome !== "committed") return { ...result, file: "communication_messages" };
  }
  return { outcome: "committed", file: "communication_messages" };
};
