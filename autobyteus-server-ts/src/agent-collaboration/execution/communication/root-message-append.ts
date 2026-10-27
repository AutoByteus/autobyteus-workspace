import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type {
  AgentRunInputReservation,
  CommittedAgentRunInput,
} from "../../../agent-execution/input/agent-run-input-contract.js";
import type { StoredMessageLogOwner } from "../../../run-history/store/task-agent-message-logs.js";
import type { CollaborationCommunicationMessage } from "./collaboration-communication-message.js";

/** What `prepare` decided under the root's lock: append to these logs, or append nothing. */
export type RootMessageAppendPreparation =
  | Readonly<{ kind: "append"; logOwners: readonly StoredMessageLogOwner[] }>
  /** The root stopped accepting messages, or the message ID is already in the list. */
  | Readonly<{ kind: "conflict" }>
  /** The Task scope refused the message (closed, or a different Task). */
  | Readonly<{ kind: "refused" }>;

/** A coordinator's result for one append. An indeterminate write is thrown, never returned. */
export type RootMessageAppendResult =
  | Readonly<{ outcome: "committed" }>
  | Readonly<{ outcome: "conflict" }>
  | Readonly<{ outcome: "refused" }>
  | Readonly<{ outcome: "not_committed"; cause: Error }>;

/**
 * One message append, built by RootCommunicationEngine and run once by the root's persistence coordinator under
 * its lock (DS-004): `prepare`, the log write, then `cancelBeforeDurability` (not written) or
 * `commitAfterDurability` (written). The coordinator never touches the recipient's slot.
 */
export type RootMessageAppend = Readonly<{
  message: CollaborationCommunicationMessage;
  /** Open, duplicate and Task-scope checks against the current list. A genuine error is thrown with nothing changed. */
  prepare(): RootMessageAppendPreparation;
  cancelBeforeDurability(): void;
  /** Throws only on a genuine local failure (list update, publish, present), which fail-stops the root. */
  commitAfterDurability(): void;
}>;

/** The Task-scope refusal the root's scope check gave, in the agent-readable form. */
export type TaskScopeRefusal = Readonly<{ accepted: false; code: string; message: string }>;

/** What happened to the recipient's input when the message was not delivered after all. */
export type RootMessageAppendClosure =
  /** The Task scope refused it: under the lock, or after the durable write (REQ-012). */
  | Readonly<{ kind: "task_scope"; refusal: TaskScopeRefusal }>
  /** The recipient stopped accepting input after the durable write: its slot can no longer be committed. */
  | Readonly<{ kind: "recipient_stopped" }>;

export type RootMessageAppendControl = Readonly<{
  append: RootMessageAppend;
  /** Drops the slot when the coordinator threw before the append finished (fail-stopped root, genuine error). */
  abandon(): void;
  closure(): RootMessageAppendClosure | null;
}>;

/** The recipient of a same-root or remote-to-local message: its held slot and how its input is shown. */
export type RootMessageAppendReceiver = Readonly<{
  reservation: AgentRunInputReservation;
  input: AgentInputUserMessage;
  /** The root's Task-scope check of this message; it throws the scope error when the pair may not exchange it. */
  checkTaskScope(): void;
  present(): void;
}>;

type AppendState = "sealed" | "prepared" | "cancelled" | "refused" | "committed" | "closed_after_durability";

export const createRootMessageAppend = (input: Readonly<{
  message: CollaborationCommunicationMessage;
  /** `null` for the sender record of a message a peer node already accepted (nothing is held here). */
  receiver: RootMessageAppendReceiver | null;
  isOpen(): boolean;
  getMessages(): readonly CollaborationCommunicationMessage[];
  setMessages(messages: readonly CollaborationCommunicationMessage[]): void;
  logOwnersOf(message: CollaborationCommunicationMessage): readonly StoredMessageLogOwner[];
  /** The root-view publish of this entry form; `null` when the form does not publish (remote endpoints). */
  publishToRootView: (() => void) | null;
  /** Classifies a scope error as the agent-readable refusal; `null` means a genuine error (rethrown). */
  scopeRefusalOf(error: unknown): TaskScopeRefusal | null;
}>): RootMessageAppendControl => {
  let state: AppendState = "sealed";
  let next: readonly CollaborationCommunicationMessage[] = [];
  let closure: RootMessageAppendClosure | null = null;

  /**
   * Gives the held slot back. The recipient may already have dropped it (its runtime was force-released or
   * fenced for shutdown, e.g. by a Task closure); there is then nothing to give back, and the drop never
   * replaces the outcome the caller is reporting.
   */
  const dropSlot = () => {
    try { input.receiver?.reservation.cancel(); } catch { /* the recipient already dropped the slot */ }
  };

  const append: RootMessageAppend = Object.freeze({
    message: input.message,
    prepare: (): RootMessageAppendPreparation => {
      if (state !== "sealed") throw new Error(`Root message append '${input.message.messageId}' is not sealed.`);
      const current = input.getMessages();
      if (!input.isOpen() || current.some((row) => row.messageId === input.message.messageId)) {
        state = "cancelled";
        dropSlot();
        return Object.freeze({ kind: "conflict" as const });
      }
      if (input.receiver) {
        try {
          input.receiver.checkTaskScope();
        } catch (error) {
          const refusal = input.scopeRefusalOf(error);
          if (!refusal) throw error;
          state = "refused";
          closure = Object.freeze({ kind: "task_scope" as const, refusal });
          dropSlot();
          return Object.freeze({ kind: "refused" as const });
        }
      }
      const logOwners = input.logOwnersOf(input.message);
      next = Object.freeze([...current, input.message]);
      state = "prepared";
      return Object.freeze({ kind: "append" as const, logOwners });
    },
    cancelBeforeDurability: () => {
      if (state !== "prepared") return;
      state = "cancelled";
      dropSlot();
    },
    commitAfterDurability: () => {
      if (state !== "prepared") return;
      input.setMessages(next);
      const receiver = input.receiver;
      if (!receiver) {
        state = "committed";
        input.publishToRootView?.();
        return;
      }
      // REQ-012: closing after the durable write keeps the record (and shows it in the root view, so the live
      // view matches the stored log), drops the slot and never presents or releases the input. Not a fail-stop.
      const closeAfterDurability = (found: RootMessageAppendClosure) => {
        input.publishToRootView?.();
        state = "closed_after_durability";
        closure = Object.freeze(found);
        dropSlot();
      };
      try {
        receiver.checkTaskScope();
      } catch (error) {
        const refusal = input.scopeRefusalOf(error);
        if (!refusal) throw error;
        closeAfterDurability({ kind: "task_scope", refusal });
        return;
      }
      let committed: CommittedAgentRunInput;
      try {
        committed = receiver.reservation.commit();
      } catch {
        closeAfterDurability({ kind: "recipient_stopped" });
        return;
      }
      state = "committed";
      try {
        input.publishToRootView?.();
        receiver.present();
      } finally {
        committed.release();
      }
    },
  });

  return Object.freeze({
    append,
    abandon: () => {
      if (state !== "sealed" && state !== "prepared") return;
      state = "cancelled";
      dropSlot();
    },
    closure: () => closure,
  });
};
