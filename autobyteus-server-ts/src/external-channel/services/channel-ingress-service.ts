import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "../runtime/channel-run-dispatch-result.js";
import type { AcceptedReceiptRecoveryRuntime } from "../runtime/accepted-receipt-recovery-runtime.js";
import { ChannelRunFacade } from "../runtime/channel-run-facade.js";
import { getAcceptedReceiptRecoveryRuntime } from "../runtime/accepted-receipt-recovery-runtime.js";
import { ChannelBindingService } from "./channel-binding-service.js";
import { ChannelMessageReceiptService } from "./channel-message-receipt-service.js";
import { ChannelThreadLockService } from "./channel-thread-lock-service.js";

export type ChannelIngressDisposition = "ACCEPTED" | "UNBOUND" | "DUPLICATE";

export type ChannelIngressServiceDependencies = {
  bindingService?: ChannelBindingService;
  threadLockService?: ChannelThreadLockService;
  runFacade?: ChannelRunFacade;
  messageReceiptService?: ChannelMessageReceiptService;
  acceptedReceiptRecoveryRuntime?: AcceptedReceiptRecoveryRuntime;
};

export type ChannelIngressServiceOptions = {
  dispatchLeaseDurationMs?: number;
};

export type ChannelIngressResult = {
  duplicate: boolean;
  idempotencyKey: string;
  disposition: ChannelIngressDisposition;
  bindingResolved: boolean;
  binding: ChannelBinding | null;
  usedTransportFallback: boolean;
  dispatch: ChannelRunDispatchResult | null;
};

export class ChannelIngressService {
  private readonly bindingService: ChannelBindingService;
  private readonly threadLockService: ChannelThreadLockService;
  private readonly runFacade: ChannelRunFacade;
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly acceptedReceiptRecoveryRuntime: AcceptedReceiptRecoveryRuntime;
  private readonly dispatchLeaseDurationMs: number;

  constructor(
    deps: ChannelIngressServiceDependencies = {},
    options: ChannelIngressServiceOptions = {},
  ) {
    this.bindingService = deps.bindingService ?? new ChannelBindingService();
    this.threadLockService = deps.threadLockService ?? new ChannelThreadLockService();
    this.runFacade = deps.runFacade ?? new ChannelRunFacade();
    this.messageReceiptService =
      deps.messageReceiptService ?? new ChannelMessageReceiptService();
    this.acceptedReceiptRecoveryRuntime =
      deps.acceptedReceiptRecoveryRuntime ?? getAcceptedReceiptRecoveryRuntime();
    this.dispatchLeaseDurationMs = normalizeDispatchLeaseDurationMs(
      options.dispatchLeaseDurationMs ?? 30_000,
    );
  }

  async handleInboundMessage(
    envelope: ExternalMessageEnvelope,
  ): Promise<ChannelIngressResult> {
    const idempotencyKey = createIdempotencyKey(envelope);
    return this.threadLockService.withThreadLock(
      envelope.routingKey,
      async () => {
        const existing = await this.messageReceiptService.getReceiptByExternalMessage({
          provider: envelope.provider,
          transport: envelope.transport,
          accountId: envelope.accountId,
          peerId: envelope.peerId,
          threadId: envelope.threadId,
          externalMessageId: envelope.externalMessageId,
        });
        if (existing?.ingressState === "ACCEPTED") {
          await this.acceptedReceiptRecoveryRuntime.registerAcceptedReceipt(existing);
          return {
            duplicate: true,
            idempotencyKey,
            disposition: "ACCEPTED" as const,
            bindingResolved: false,
            binding: null,
            usedTransportFallback: false,
            dispatch: null,
          };
        }

        if (
          existing &&
          (existing.ingressState === "ROUTED" ||
            existing.ingressState === "UNBOUND" ||
            (existing.ingressState === "DISPATCHING" &&
              !this.messageReceiptService.isDispatchLeaseExpired(existing)))
        ) {
          return {
            duplicate: true,
            idempotencyKey,
            disposition: "DUPLICATE" as const,
            bindingResolved: false,
            binding: null,
            usedTransportFallback: false,
            dispatch: null,
          };
        }

        await this.messageReceiptService.createPendingIngressReceipt({
          provider: envelope.provider,
          transport: envelope.transport,
          accountId: envelope.accountId,
          peerId: envelope.peerId,
          threadId: envelope.threadId,
          externalMessageId: envelope.externalMessageId,
          receivedAt: new Date(envelope.receivedAt),
        });

        const resolved = await this.bindingService.resolveBinding({
          provider: envelope.provider,
          transport: envelope.transport,
          accountId: envelope.accountId,
          peerId: envelope.peerId,
          threadId: envelope.threadId,
        });

        if (!resolved) {
          await this.messageReceiptService.markIngressUnbound({
            provider: envelope.provider,
            transport: envelope.transport,
            accountId: envelope.accountId,
            peerId: envelope.peerId,
            threadId: envelope.threadId,
            externalMessageId: envelope.externalMessageId,
            receivedAt: new Date(envelope.receivedAt),
          });
          return {
            duplicate: false,
            idempotencyKey,
            disposition: "UNBOUND" as const,
            bindingResolved: false,
            binding: null,
            usedTransportFallback: false,
            dispatch: null,
          };
        }

        const dispatchLease = await this.messageReceiptService.claimIngressDispatch({
          provider: envelope.provider,
          transport: envelope.transport,
          accountId: envelope.accountId,
          peerId: envelope.peerId,
          threadId: envelope.threadId,
          externalMessageId: envelope.externalMessageId,
          receivedAt: new Date(envelope.receivedAt),
          claimedAt: new Date(),
          leaseDurationMs: this.dispatchLeaseDurationMs,
        });

        const dispatch = await this.runFacade.dispatchToBinding(resolved.binding, envelope);
        const normalizedDispatch = normalizeDispatchTarget(dispatch);
        const acceptedReceipt = await this.messageReceiptService.recordAcceptedDispatch({
          provider: envelope.provider,
          transport: envelope.transport,
          accountId: envelope.accountId,
          peerId: envelope.peerId,
          threadId: envelope.threadId,
          externalMessageId: envelope.externalMessageId,
          receivedAt: new Date(envelope.receivedAt),
          dispatchLeaseToken: dispatchLease.dispatchLeaseToken ?? "",
          agentRunId: normalizedDispatch.persistedAgentRunId,
          teamRunId: normalizedDispatch.persistedTeamRunId,
          turnId: normalizedDispatch.dispatch.turnId,
        });
        await this.acceptedReceiptRecoveryRuntime.registerAcceptedReceipt(acceptedReceipt);

        return {
          duplicate: false,
          idempotencyKey,
          disposition: "ACCEPTED" as const,
          bindingResolved: true,
          binding: resolved.binding,
          usedTransportFallback: resolved.usedTransportFallback,
          dispatch: normalizedDispatch.dispatch,
        };
      },
    );
  }
}

const createIdempotencyKey = (envelope: ExternalMessageEnvelope): string =>
  `${envelope.routingKey}::${envelope.externalMessageId}`;

const normalizeDispatchTarget = (
  dispatch: ChannelRunDispatchResult,
): {
  dispatch: ChannelRunDispatchResult;
  persistedAgentRunId: string | null;
  persistedTeamRunId: string | null;
} => {
  const dispatchedAt = normalizeDate(dispatch.dispatchedAt) ?? new Date();
  if (dispatch.dispatchTargetType === "AGENT") {
    const agentRunId = normalizeRequiredString(dispatch.agentRunId, "dispatch.agentRunId");
    return {
      dispatch: {
        dispatchTargetType: "AGENT",
        agentRunId,
        turnId: normalizeNullableString(dispatch.turnId ?? null),
        dispatchedAt,
      },
      persistedAgentRunId: agentRunId,
      persistedTeamRunId: null,
    };
  }

  const teamRunId = normalizeRequiredString(dispatch.teamRunId, "dispatch.teamRunId");
  const memberRunId = normalizeNullableString(dispatch.memberRunId ?? null);
  return {
    dispatch: {
      dispatchTargetType: "TEAM",
      teamRunId,
      memberRunId,
      memberName: normalizeNullableString(dispatch.memberName ?? null),
      turnId: normalizeNullableString(dispatch.turnId ?? null),
      dispatchedAt,
    },
    persistedAgentRunId: memberRunId,
    persistedTeamRunId: teamRunId,
  };
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (value: string | null | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeDate = (value: Date): Date | null => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }
  return value;
};

const normalizeDispatchLeaseDurationMs = (value: number): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("dispatchLeaseDurationMs must be a positive integer.");
  }
  return value;
};
