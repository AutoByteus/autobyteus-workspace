import { getProviderProxySet } from "../providers/provider-proxy-set.js";
import { ChannelBindingService } from "../services/channel-binding-service.js";
import { CallbackIdempotencyService } from "../services/callback-idempotency-service.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import { DeliveryEventService } from "../services/delivery-event-service.js";
import { ReplyCallbackService } from "../services/reply-callback-service.js";
import { GatewayCallbackDispatchWorker } from "./gateway-callback-dispatch-worker.js";
import { resolveGatewayCallbackDispatchTarget } from "./gateway-callback-dispatch-target-resolver.js";
import { GatewayCallbackOutboxService } from "./gateway-callback-outbox-service.js";
import { FileGatewayCallbackOutboxStore } from "./gateway-callback-outbox-store.js";

const DEFAULT_CONFIG = {
  batchSize: 20,
  loopIntervalMs: 250,
  leaseDurationMs: 15_000,
  maxAttempts: 12,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  backoffFactor: 2,
} as const;

export class GatewayCallbackDeliveryRuntime {
  private readonly outboxService: GatewayCallbackOutboxService;
  private readonly deliveryEventService: DeliveryEventService;
  private readonly worker: GatewayCallbackDispatchWorker;

  constructor() {
    const providerSet = getProviderProxySet();
    this.outboxService = new GatewayCallbackOutboxService(
      new FileGatewayCallbackOutboxStore(),
    );
    this.deliveryEventService = new DeliveryEventService(
      providerSet.deliveryEventProvider,
    );
    this.worker = new GatewayCallbackDispatchWorker({
      outboxService: this.outboxService,
      deliveryEventService: this.deliveryEventService,
      targetResolver: {
        resolveGatewayCallbackDispatchTarget,
      },
      config: DEFAULT_CONFIG,
      onLoopError: (error) => {
        console.error("Gateway callback dispatch worker loop error", error);
      },
    });
  }

  start(): void {
    this.worker.start();
  }

  async stop(): Promise<void> {
    await this.worker.stop();
  }

  buildReplyCallbackService(): ReplyCallbackService {
    const providerSet = getProviderProxySet();
    return new ReplyCallbackService(
      new ChannelMessageReceiptService(providerSet.messageReceiptProvider),
      {
        callbackIdempotencyService: new CallbackIdempotencyService(
          providerSet.callbackIdempotencyProvider,
        ),
        deliveryEventService: this.deliveryEventService,
        bindingService: new ChannelBindingService(providerSet.bindingProvider),
        callbackOutboxService: this.outboxService,
        callbackTargetResolver: {
          resolveGatewayCallbackDispatchTarget,
        },
      },
    );
  }
}

let cachedRuntime: GatewayCallbackDeliveryRuntime | null = null;

export const getGatewayCallbackDeliveryRuntime =
  (): GatewayCallbackDeliveryRuntime => {
    if (!cachedRuntime) {
      cachedRuntime = new GatewayCallbackDeliveryRuntime();
    }
    return cachedRuntime;
  };

export const buildDefaultReplyCallbackService = (): ReplyCallbackService =>
  getGatewayCallbackDeliveryRuntime().buildReplyCallbackService();

export const startGatewayCallbackDeliveryRuntime = (): void => {
  getGatewayCallbackDeliveryRuntime().start();
};

export const stopGatewayCallbackDeliveryRuntime = async (): Promise<void> => {
  if (!cachedRuntime) {
    return;
  }
  await cachedRuntime.stop();
  cachedRuntime = null;
};
