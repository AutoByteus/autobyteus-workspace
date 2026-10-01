import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CompactionRetryRequest } from "autobyteus-ts/memory/compaction/compaction-recovery.js";
import type { CompactionRecoveryBlockDto } from "@autobyteus/agent-presentation-contracts";
import type { AgentRunBackend } from "../backends/agent-run-backend.js";

const same = (a: CompactionRecoveryBlockDto | null, b: CompactionRecoveryBlockDto | null) =>
  a?.operationId === b?.operationId && a?.failureEpoch === b?.failureEpoch;
type AdmissionClaim = { request: CompactionRetryRequest; acknowledged: boolean; dispatched: boolean };

/** AgentRun-owned admission/ACK bookkeeping; the native snapshot is the gate authority. */
export class AgentRunCompactionRecovery {
  private observed: CompactionRecoveryBlockDto | null = null;
  private admissionCut = 0;
  private claim: AdmissionClaim | null = null;
  constructor(private readonly options: {
    runInstanceId: string; backend: AgentRunBackend; highWaterMark(): number;
    serialize<T>(action: () => T | Promise<T>): Promise<T>;
    changed(): void;
  }) {}

  reconcile(): CompactionRecoveryBlockDto | null {
    const block = this.options.backend.compactionRecovery === "supported"
      ? this.options.backend.getCompactionRecovery?.() ?? null : null;
    if (!same(block, this.observed)) {
      this.observed = block;
      this.admissionCut = this.options.highWaterMark();
      this.claim = null;
    } else this.observed = block;
    return block;
  }

  claimAdmission(message: AgentInputUserMessage, sequence: number): AdmissionClaim | null {
    const block = this.observed; // captured before immediate admit under the same dispatch lock
    if (!block || block.state !== "awaiting_user" || this.claim || sequence <= this.admissionCut
      || message.senderType !== SenderType.USER) return null;
    this.claim = { request: { block: { operationId: block.operationId, failureEpoch: block.failureEpoch },
      userAdmissionId: `${this.options.runInstanceId}:${sequence}` }, acknowledged: false, dispatched: false };
    return this.claim;
  }

  async authorize(claim: AdmissionClaim): Promise<void> {
    try {
      const result = await this.options.backend.authorizeCompactionRetry!(claim.request);
      await this.options.serialize(() => {
        this.reconcile();
        if (this.claim === claim && result === "accepted") claim.acknowledged = true;
        this.options.changed();
      });
    } catch {
      // Unknown acknowledgment is not a forwarding/retry instruction. Keep the claim gated.
      await this.options.serialize(() => { this.reconcile(); this.options.changed(); });
    }
  }

  canDispatch(): boolean {
    const block = this.reconcile();
    return !block || block.position.kind === "next_turn" && block.state === "authorized"
      && this.claim?.acknowledged === true && !this.claim.dispatched;
  }

  bindDispatch(): CompactionRetryRequest | null {
    if (!this.observed || !this.claim) return null;
    this.claim.dispatched = true;
    return this.claim.request;
  }

  async revokeUndelivered(request: CompactionRetryRequest): Promise<void> {
    await this.options.backend.revokeUnusedCompactionRetry?.({ ...request, reason: "input_not_delivered" });
    await this.options.serialize(() => { this.reconcile(); this.options.changed(); });
  }
}
