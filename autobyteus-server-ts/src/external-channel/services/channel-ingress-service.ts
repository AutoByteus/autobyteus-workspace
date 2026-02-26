import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type {
  ChannelBinding,
  ChannelIdempotencyDecision,
  ResolvedBinding,
} from "../domain/models.js";
import type { ChannelRuntimeDispatchResult, ChannelRuntimeFacade } from "../runtime/channel-runtime-facade.js";
import type { ChannelMessageReceiptService } from "./channel-message-receipt-service.js";

export type ChannelIngressDisposition = "ROUTED" | "UNBOUND" | "DUPLICATE";

type ChannelIdempotencyPort = {
  ensureFirstSeen(
    key: string,
    ttlSeconds?: number,
  ): Promise<ChannelIdempotencyDecision>;
};

type ChannelBindingPort = {
  resolveBinding(input: {
    provider: ExternalMessageEnvelope["provider"];
    transport: ExternalMessageEnvelope["transport"];
    accountId: string;
    peerId: string;
    threadId: string | null;
  }): Promise<ResolvedBinding | null>;
};

type ChannelThreadLockPort = {
  withThreadLock<T>(
    key: string,
    work: () => Promise<T>,
    timeoutMs?: number,
  ): Promise<T>;
};

type ChannelMessageReceiptPort = Pick<
  ChannelMessageReceiptService,
  "recordIngressReceipt"
>;

export type ChannelIngressServiceDependencies = {
  idempotencyService: ChannelIdempotencyPort;
  bindingService: ChannelBindingPort;
  threadLockService: ChannelThreadLockPort;
  runtimeFacade: ChannelRuntimeFacade;
  messageReceiptService: ChannelMessageReceiptPort;
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
  dispatch: ChannelRuntimeDispatchResult | null;
};

export class ChannelIngressService {
  private readonly idempotencyTtlSeconds?: number;
  private readonly idempotencyService: ChannelIdempotencyPort;
  private readonly bindingService: ChannelBindingPort;
  private readonly threadLockService: ChannelThreadLockPort;
  private readonly runtimeFacade: ChannelRuntimeFacade;
  private readonly messageReceiptService: ChannelMessageReceiptPort;

  constructor(
    deps: ChannelIngressServiceDependencies,
    options: ChannelIngressServiceOptions = {},
  ) {
    this.idempotencyService = deps.idempotencyService;
    this.bindingService = deps.bindingService;
    this.threadLockService = deps.threadLockService;
    this.runtimeFacade = deps.runtimeFacade;
    this.messageReceiptService = deps.messageReceiptService;
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
      () => this.runtimeFacade.dispatchToBinding(resolved.binding, envelope),
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
  dispatch: ChannelRuntimeDispatchResult,
  binding: ChannelBinding,
): ChannelRuntimeDispatchResult => {
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
