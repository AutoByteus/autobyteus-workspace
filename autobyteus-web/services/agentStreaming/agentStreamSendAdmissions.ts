import type { SendMessageCommandAckPayload } from './protocol';
import { collaboratorAddRejectionOf } from '~/services/collaborators/collaboratorAddFailures';
import { MessageNotDeliveredError, type MessageNotDeliveredCertainty } from '~/services/runSubmission/messageNotDelivered';
import { HeldUntilRebind } from './heldUntilRebind';

type PendingSend = Readonly<{
  /** A send with `@` mentions waits for its admission: a refused one rejects (the projector shows nothing for it). */
  rejectsWhenRefused: boolean;
  resolve(): void;
  reject(error: Error): void;
}>;

/** What the rebind's snapshot told the page, for deciding a held send (autobyteus-540 D-3). */
export type RebindView = Readonly<{
  /** Whether the conversation, as the snapshot left it, has a user message with this id (stored, live turn, queued). */
  has(messageId: string): boolean;
  /** Whether the snapshot carried the run's input state; without it a missing message is `unknown`, never `not_sent`. */
  inputStateKnown: boolean;
}>;

/**
 * The agent stream's sends waiting for the node's answer (autobyteus-540 D-2, D-3), by message id. Each settles once:
 * by its `AGENT_COMMAND_ACK`; held at a retryable loss and decided by the rebind's snapshot (`decideHeld`); or as
 * `unknown` at a final close. Owned by `AgentStreamingService`.
 */
export class AgentStreamSendAdmissions {
  private readonly waiting = new Map<string, PendingSend>();
  private readonly held = new HeldUntilRebind();
  private rebind: RebindView | null = null;

  /** Registers a send before it leaves; the promise settles at the node's answer. */
  begin(messageId: string, rejectsWhenRefused: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.waiting.set(messageId, Object.freeze({ rejectsWhenRefused, resolve, reject }));
    });
  }

  /** The send did not leave: it ends `not_sent`. */
  notSent(messageId: string, detail: string): void {
    const pending = this.waiting.get(messageId);
    this.waiting.delete(messageId);
    pending?.reject(new MessageNotDeliveredError('not_sent', detail));
  }

  /** The node's answer: accepted resolves; a refusal resolves too (the projector shows it), unless it is an admission. */
  acknowledge(ack: SendMessageCommandAckPayload): void {
    const pending = this.waiting.get(ack.message_id);
    if (!pending) return;
    this.waiting.delete(ack.message_id);
    if (ack.accepted || !pending.rejectsWhenRefused) pending.resolve();
    else pending.reject(collaboratorAddRejectionOf(ack) ?? new Error(ack.message ?? ack.code ?? 'The message was not accepted.'));
  }

  /** A retryable loss: every waiting send is held until the rebind's snapshot decides it. */
  holdWaiting(): void {
    for (const [messageId, pending] of this.waiting) {
      this.held.hold(() => {
        const view = this.rebind;
        if (!view) {
          pending.reject(new MessageNotDeliveredError('unknown', `The stream closed before the node answered message '${messageId}'.`));
          return;
        }
        if (view.has(messageId)) { pending.resolve(); return; }
        const certainty: MessageNotDeliveredCertainty = view.inputStateKnown ? 'not_sent' : 'unknown';
        pending.reject(new MessageNotDeliveredError(certainty,
          `The message '${messageId}' was not in the stream's snapshot after the connection was lost.`));
      });
    }
    this.waiting.clear();
  }

  /** The rebind's snapshot is applied: each held send is delivered (found) or not delivered. */
  decideHeld(view: RebindView): void {
    this.rebind = view;
    try { this.held.settle(); } finally { this.rebind = null; }
  }

  /** Closed for good: held and waiting sends may or may not have reached the node, so each settles `unknown`. */
  closeForGood(): void {
    this.holdWaiting();
    this.held.settle();
  }
}
