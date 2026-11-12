import type { TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import { COLLABORATOR_ADD_FAILED, collaboratorAddRejectionOf } from '~/services/collaborators/collaboratorAddFailures';

/**
 * The Team stream's pending message admissions: one per AgentRun, settled by the root's
 * `MEMBER_INPUT_MESSAGE` for the same identity or rejected by its send failure (`ERROR`).
 */

type PendingTeamSend = Readonly<{
  agentRunId: string;
  content: string;
  promise: Promise<void>;
  resolve(): void;
  reject(error: Error): void;
}>;

export type TeamSendIdentity = Readonly<{ agentRunId: string; messageId: string; dedupeKey: string }>;

const teamSendFailureCodes = new Set([
  'INVALID_TARGET',
  'TEAM_SEND_MESSAGE_REJECTED',
  'TEAM_SEND_MESSAGE_FAILED',
  COLLABORATOR_ADD_FAILED,
]);
const sendKey = ({ agentRunId, messageId, dedupeKey }: TeamSendIdentity): string =>
  `${agentRunId}\0${messageId}\0${dedupeKey}`;

export class TeamSendAdmissions {
  private readonly pending = new Map<string, PendingTeamSend>();

  /**
   * Registers the admission of a send. The same identity sent again returns its pending admission
   * (`isNew: false`); another pending send to the same AgentRun is refused.
   */
  begin(identity: TeamSendIdentity, content: string): { promise: Promise<void>; isNew: boolean } {
    const key = sendKey(identity);
    const existing = this.pending.get(key);
    if (existing) {
      if (existing.content !== content) throw new Error('Team message identity cannot be reused for different content.');
      return { promise: existing.promise, isNew: false };
    }
    if ([...this.pending.values()].some((pending) => pending.agentRunId === identity.agentRunId)) {
      throw new Error(`AgentRun '${identity.agentRunId}' already has a pending Team message admission.`);
    }
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
    this.pending.set(key, Object.freeze({ agentRunId: identity.agentRunId, content, promise, resolve, reject }));
    return { promise, isNew: true };
  }

  /** The send itself failed: the admission ends with its error. */
  fail(identity: TeamSendIdentity, error: unknown): void {
    const key = sendKey(identity);
    const pending = this.pending.get(key);
    this.pending.delete(key);
    pending?.reject(error instanceof Error ? error : new Error(String(error)));
  }

  resolve(message: Extract<TeamStreamServerMessage, { type: 'MEMBER_INPUT_MESSAGE' }>): void {
    const key = sendKey({
      agentRunId: message.payload.recipient_agent_run_id,
      messageId: message.payload.message_id,
      dedupeKey: message.payload.dedupe_key,
    });
    const pending = this.pending.get(key);
    // CR-003: settle on identity only; the root may compose the content (the mention note).
    if (!pending || message.payload.input_origin !== 'user_message') return;
    this.pending.delete(key);
    pending.resolve();
  }

  /** Rejects the AgentRun's pending admission for its send failure; `false` when the error is not one. */
  reject(message: Extract<TeamStreamServerMessage, { type: 'ERROR' }>): boolean {
    if (!teamSendFailureCodes.has(message.payload.code) || !message.payload.agent_run_id) return false;
    const entry = [...this.pending.entries()].find(
      ([, pending]) => pending.agentRunId === message.payload.agent_run_id,
    );
    if (!entry) return false;
    this.pending.delete(entry[0]);
    entry[1].reject(collaboratorAddRejectionOf(message.payload) ?? new Error(message.payload.message));
    return true;
  }

  drain(message: string): void {
    const pending = [...this.pending.values()];
    this.pending.clear();
    pending.forEach((entry) => entry.reject(new Error(message)));
  }
}
