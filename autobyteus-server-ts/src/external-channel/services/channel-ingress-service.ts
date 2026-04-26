import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelBinding, ChannelMessageReceipt, ChannelRunOutputTarget } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "../runtime/channel-run-dispatch-result.js";
import type { ChannelRunOutputDeliveryRuntime } from "../runtime/channel-run-output-delivery-runtime.js";
import { getChannelRunOutputDeliveryRuntime } from "../runtime/channel-run-output-runtime-singleton.js";
import { ChannelRunFacade } from "../runtime/channel-run-facade.js";
import { ChannelBindingService } from "./channel-binding-service.js";
import { ChannelMessageReceiptService } from "./channel-message-receipt-service.js";
import { ChannelThreadLockService } from "./channel-thread-lock-service.js";

export type ChannelIngressDisposition = "ACCEPTED" | "UNBOUND" | "DUPLICATE";

export type ChannelIngressServiceDependencies = {
  bindingService?: ChannelBindingService;
  threadLockService?: ChannelThreadLockService;
  runFacade?: ChannelRunFacade;
  messageReceiptService?: ChannelMessageReceiptService;
  outputDeliveryRuntime?: ChannelRunOutputDeliveryRuntime;
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
  private readonly outputDeliveryRuntime: ChannelRunOutputDeliveryRuntime;
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
    this.outputDeliveryRuntime =
      deps.outputDeliveryRuntime ?? getChannelRunOutputDeliveryRuntime();
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
          await this.attachExistingAcceptedReceipt(existing);
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
          (existing.ingressState === "UNBOUND" ||
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

        const dispatch = await this.runFacade.dispatchToBinding(
          resolved.binding,
          envelope,
        );

        const normalizedDispatch = normalizeDispatchTarget(dispatch);
        await this.messageReceiptService.recordAcceptedDispatch({
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
          dispatchAcceptedAt: normalizedDispatch.dispatch.dispatchedAt,
        });
        await this.outputDeliveryRuntime.attachAcceptedDispatch({
          binding: resolved.binding,
          route: {
            provider: envelope.provider,
            transport: envelope.transport,
            accountId: envelope.accountId,
            peerId: envelope.peerId,
            threadId: envelope.threadId,
          },
          latestCorrelationMessageId: envelope.externalMessageId,
          target: toRunOutputTarget(resolved.binding, normalizedDispatch.dispatch),
          turnId: normalizedDispatch.dispatch.turnId,
        });

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

  private async attachExistingAcceptedReceipt(
    receipt: ChannelMessageReceipt,
  ): Promise<void> {
    if (!receipt.turnId) {
      return;
    }
    const resolved = await this.bindingService.resolveBinding({
      provider: receipt.provider,
      transport: receipt.transport,
      accountId: receipt.accountId,
      peerId: receipt.peerId,
      threadId: receipt.threadId,
    });
    if (!resolved) {
      return;
    }
    const target = toRunOutputTargetFromReceipt(resolved.binding, receipt);
    if (!target) {
      return;
    }
    await this.outputDeliveryRuntime.attachAcceptedDispatch({
      binding: resolved.binding,
      route: {
        provider: receipt.provider,
        transport: receipt.transport,
        accountId: receipt.accountId,
        peerId: receipt.peerId,
        threadId: receipt.threadId,
      },
      latestCorrelationMessageId: receipt.externalMessageId,
      target,
      turnId: receipt.turnId,
    });
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
    const agentRunId = normalizeRequiredString(
      dispatch.agentRunId,
      "dispatch.agentRunId",
    );
    return {
      dispatch: {
        dispatchTargetType: "AGENT",
        agentRunId,
        turnId: normalizeRequiredString(dispatch.turnId, "dispatch.turnId"),
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
      turnId: normalizeRequiredString(dispatch.turnId, "dispatch.turnId"),
      dispatchedAt,
    },
    persistedAgentRunId: memberRunId,
    persistedTeamRunId: teamRunId,
  };
};

const toRunOutputTarget = (
  binding: ChannelBinding,
  dispatch: ChannelRunDispatchResult,
): ChannelRunOutputTarget => {
  if (dispatch.dispatchTargetType === "AGENT") {
    return { targetType: "AGENT", agentRunId: dispatch.agentRunId };
  }
  return {
    targetType: "TEAM",
    teamRunId: dispatch.teamRunId,
    entryMemberRunId: normalizeNullableString(dispatch.memberRunId ?? null),
    entryMemberName:
      normalizeNullableString(dispatch.memberName ?? null) ??
      normalizeNullableString(binding.targetNodeName ?? null),
  };
};

const toRunOutputTargetFromReceipt = (
  binding: ChannelBinding,
  receipt: ChannelMessageReceipt,
): ChannelRunOutputTarget | null => {
  if (binding.targetType === "AGENT") {
    const agentRunId = normalizeNullableString(receipt.agentRunId);
    return agentRunId ? { targetType: "AGENT", agentRunId } : null;
  }
  const teamRunId = normalizeNullableString(receipt.teamRunId);
  if (!teamRunId) {
    return null;
  }
  return {
    targetType: "TEAM",
    teamRunId,
    entryMemberRunId: normalizeNullableString(receipt.agentRunId),
    entryMemberName: normalizeNullableString(binding.targetNodeName ?? null),
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
  if (value === undefined || value === null) {
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
