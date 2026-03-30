import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ChannelBinding } from "../domain/models.js";
import type { ChannelRunDispatchResult } from "../runtime/channel-run-dispatch-result.js";
import { ChannelRunFacade } from "../runtime/channel-run-facade.js";
import { ChannelBindingService } from "./channel-binding-service.js";
import { ChannelIdempotencyService } from "./channel-idempotency-service.js";
import { ChannelMessageReceiptService } from "./channel-message-receipt-service.js";
import { ChannelThreadLockService } from "./channel-thread-lock-service.js";

export type ChannelIngressDisposition = "ROUTED" | "UNBOUND" | "DUPLICATE";

export type ChannelIngressServiceDependencies = {
  idempotencyService?: ChannelIdempotencyService;
  bindingService?: ChannelBindingService;
  threadLockService?: ChannelThreadLockService;
  runFacade?: ChannelRunFacade;
  messageReceiptService?: ChannelMessageReceiptService;
};

export type ChannelIngressServiceOptions = {
  idempotencyTtlSeconds?: number;
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
  private readonly idempotencyTtlSeconds?: number;
  private readonly idempotencyService: ChannelIdempotencyService;
  private readonly bindingService: ChannelBindingService;
  private readonly threadLockService: ChannelThreadLockService;
  private readonly runFacade: ChannelRunFacade;
  private readonly messageReceiptService: ChannelMessageReceiptService;

  constructor(
    deps: ChannelIngressServiceDependencies = {},
    options: ChannelIngressServiceOptions = {},
  ) {
    this.idempotencyService = deps.idempotencyService ?? new ChannelIdempotencyService();
    this.bindingService = deps.bindingService ?? new ChannelBindingService();
    this.threadLockService = deps.threadLockService ?? new ChannelThreadLockService();
    this.runFacade = deps.runFacade ?? new ChannelRunFacade();
    this.messageReceiptService =
      deps.messageReceiptService ?? new ChannelMessageReceiptService();
    this.idempotencyTtlSeconds = options.idempotencyTtlSeconds;
  }

  async handleInboundMessage(
    envelope: ExternalMessageEnvelope,
  ): Promise<ChannelIngressResult> {
    const idempotencyKey = createIdempotencyKey(envelope);
    const idempotency = await this.idempotencyService.ensureFirstSeen(
      idempotencyKey,
      this.idempotencyTtlSeconds,
    );

    if (idempotency.duplicate) {
      return {
        duplicate: true,
        idempotencyKey,
        disposition: "DUPLICATE",
        bindingResolved: false,
        binding: null,
        usedTransportFallback: false,
        dispatch: null,
      };
    }

    const resolved = await this.bindingService.resolveBinding({
      provider: envelope.provider,
      transport: envelope.transport,
      accountId: envelope.accountId,
      peerId: envelope.peerId,
      threadId: envelope.threadId,
    });

    if (!resolved) {
      return {
        duplicate: false,
        idempotencyKey,
        disposition: "UNBOUND",
        bindingResolved: false,
        binding: null,
        usedTransportFallback: false,
        dispatch: null,
      };
    }

    const dispatch = await this.threadLockService.withThreadLock(
      envelope.routingKey,
      () => this.runFacade.dispatchToBinding(resolved.binding, envelope),
    );
    const normalizedDispatch = normalizeDispatchTarget(dispatch, resolved.binding);
    await this.messageReceiptService.recordIngressReceipt({
      provider: envelope.provider,
      transport: envelope.transport,
      accountId: envelope.accountId,
      peerId: envelope.peerId,
      threadId: envelope.threadId,
      externalMessageId: envelope.externalMessageId,
      receivedAt: new Date(envelope.receivedAt),
      agentRunId: normalizedDispatch.agentRunId,
      teamRunId: normalizedDispatch.teamRunId,
    });

    return {
      duplicate: false,
      idempotencyKey,
      disposition: "ROUTED",
      bindingResolved: true,
      binding: resolved.binding,
      usedTransportFallback: resolved.usedTransportFallback,
      dispatch: normalizedDispatch,
    };
  }
}

const createIdempotencyKey = (envelope: ExternalMessageEnvelope): string =>
  `${envelope.routingKey}::${envelope.externalMessageId}`;

const normalizeDispatchTarget = (
  dispatch: ChannelRunDispatchResult,
  binding: ChannelBinding,
): ChannelRunDispatchResult => {
  const agentRunId = normalizeNullableString(dispatch.agentRunId) ?? binding.agentRunId;
  const teamRunId = normalizeNullableString(dispatch.teamRunId) ?? binding.teamRunId;
  if (!agentRunId && !teamRunId) {
    throw new Error(
      "Runtime dispatch must resolve to an agentRunId or teamRunId for receipt persistence.",
    );
  }

  const dispatchedAt = normalizeDate(dispatch.dispatchedAt) ?? new Date();
  return {
    agentRunId,
    teamRunId,
    dispatchedAt,
  };
};

const normalizeNullableString = (value: string | null): string | null => {
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
