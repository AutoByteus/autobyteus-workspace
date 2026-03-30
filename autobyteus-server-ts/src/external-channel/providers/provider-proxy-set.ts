import { getPersistenceProfile } from "../../persistence/profile.js";
import type {
  ChannelBinding,
  ChannelBindingLookup,
  ChannelBindingProviderDefaultLookup,
  ChannelDeliveryEvent,
  ChannelDispatchTarget,
  ChannelIngressReceiptInput,
  ChannelSourceContext,
  ChannelSourceRoute,
  ChannelTurnReceiptBindingInput,
  UpsertChannelBindingInput,
  UpsertChannelDeliveryEventInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "./channel-binding-provider.js";
import type {
  ChannelIdempotencyProvider,
  ChannelIdempotencyReservationResult,
} from "./channel-idempotency-provider.js";
import type { ChannelMessageReceiptProvider } from "./channel-message-receipt-provider.js";
import type { DeliveryEventProvider } from "./delivery-event-provider.js";

type ChannelProviderSet = {
  bindingProvider: ChannelBindingProvider;
  idempotencyProvider: ChannelIdempotencyProvider;
  callbackIdempotencyProvider: ChannelIdempotencyProvider;
  messageReceiptProvider: ChannelMessageReceiptProvider;
  deliveryEventProvider: DeliveryEventProvider;
};

let providerSetPromise: Promise<ChannelProviderSet> | null = null;

const importChannelProviderModule = async <T>(moduleName: string): Promise<T> =>
  (await import(["./", moduleName].join(""))) as T;

const loadBindingProvider = async (): Promise<ChannelBindingProvider> => {
  const binding = await importChannelProviderModule<{
    FileChannelBindingProvider: new () => ChannelBindingProvider;
  }>("file-channel-binding-provider.js");
  return new binding.FileChannelBindingProvider();
};

const loadSqlProviderSet = async (): Promise<ChannelProviderSet> => {
  const [
    bindingProvider,
    idempotency,
    callbackIdempotency,
    receipt,
    delivery,
  ] = await Promise.all([
    loadBindingProvider(),
    importChannelProviderModule<{
      SqlChannelIdempotencyProvider: new () => ChannelIdempotencyProvider;
    }>("sql-channel-idempotency-provider.js"),
    importChannelProviderModule<{
      SqlChannelCallbackIdempotencyProvider: new () => ChannelIdempotencyProvider;
    }>("sql-channel-callback-idempotency-provider.js"),
    importChannelProviderModule<{
      SqlChannelMessageReceiptProvider: new () => ChannelMessageReceiptProvider;
    }>("sql-channel-message-receipt-provider.js"),
    importChannelProviderModule<{
      SqlDeliveryEventProvider: new () => DeliveryEventProvider;
    }>("sql-delivery-event-provider.js"),
  ]);

  return {
    bindingProvider,
    idempotencyProvider: new idempotency.SqlChannelIdempotencyProvider(),
    callbackIdempotencyProvider: new callbackIdempotency.SqlChannelCallbackIdempotencyProvider(),
    messageReceiptProvider: new receipt.SqlChannelMessageReceiptProvider(),
    deliveryEventProvider: new delivery.SqlDeliveryEventProvider(),
  };
};

const loadFileProviderSet = async (): Promise<ChannelProviderSet> => {
  const [
    bindingProvider,
    idempotency,
    callbackIdempotency,
    receipt,
    delivery,
  ] = await Promise.all([
    loadBindingProvider(),
    importChannelProviderModule<{
      FileChannelIdempotencyProvider: new () => ChannelIdempotencyProvider;
    }>("file-channel-idempotency-provider.js"),
    importChannelProviderModule<{
      FileChannelCallbackIdempotencyProvider: new () => ChannelIdempotencyProvider;
    }>("file-channel-callback-idempotency-provider.js"),
    importChannelProviderModule<{
      FileChannelMessageReceiptProvider: new () => ChannelMessageReceiptProvider;
    }>("file-channel-message-receipt-provider.js"),
    importChannelProviderModule<{
      FileDeliveryEventProvider: new () => DeliveryEventProvider;
    }>("file-delivery-event-provider.js"),
  ]);

  return {
    bindingProvider,
    idempotencyProvider: new idempotency.FileChannelIdempotencyProvider(),
    callbackIdempotencyProvider: new callbackIdempotency.FileChannelCallbackIdempotencyProvider(),
    messageReceiptProvider: new receipt.FileChannelMessageReceiptProvider(),
    deliveryEventProvider: new delivery.FileDeliveryEventProvider(),
  };
};

const resolveProviderSet = async (): Promise<ChannelProviderSet> => {
  const profile = getPersistenceProfile();
  if (profile === "file") {
    return loadFileProviderSet();
  }
  return loadSqlProviderSet();
};

const getProviderSet = async (): Promise<ChannelProviderSet> => {
  if (!providerSetPromise) {
    providerSetPromise = resolveProviderSet();
  }
  return providerSetPromise;
};

class DeferredChannelBindingProvider implements ChannelBindingProvider {
  async findBinding(input: ChannelBindingLookup): Promise<ChannelBinding | null> {
    return (await getProviderSet()).bindingProvider.findBinding(input);
  }

  async findProviderDefaultBinding(
    input: ChannelBindingProviderDefaultLookup,
  ): Promise<ChannelBinding | null> {
    return (await getProviderSet()).bindingProvider.findProviderDefaultBinding(input);
  }

  async findBindingByDispatchTarget(target: ChannelDispatchTarget): Promise<ChannelBinding | null> {
    return (await getProviderSet()).bindingProvider.findBindingByDispatchTarget(target);
  }

  async isRouteBoundToTarget(
    route: ChannelSourceRoute,
    target: ChannelDispatchTarget,
  ): Promise<boolean> {
    return (await getProviderSet()).bindingProvider.isRouteBoundToTarget(route, target);
  }

  async listBindings(): Promise<ChannelBinding[]> {
    return (await getProviderSet()).bindingProvider.listBindings();
  }

  async upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding> {
    return (await getProviderSet()).bindingProvider.upsertBinding(input);
  }

  async upsertBindingAgentRunId(bindingId: string, agentRunId: string): Promise<ChannelBinding> {
    return (await getProviderSet()).bindingProvider.upsertBindingAgentRunId(bindingId, agentRunId);
  }

  async upsertBindingTeamRunId(bindingId: string, teamRunId: string): Promise<ChannelBinding> {
    return (await getProviderSet()).bindingProvider.upsertBindingTeamRunId(bindingId, teamRunId);
  }

  async deleteBinding(bindingId: string): Promise<boolean> {
    return (await getProviderSet()).bindingProvider.deleteBinding(bindingId);
  }
}

class DeferredChannelIdempotencyProvider implements ChannelIdempotencyProvider {
  constructor(private readonly key: "idempotencyProvider" | "callbackIdempotencyProvider") {}

  async reserveKey(key: string, ttlSeconds: number): Promise<ChannelIdempotencyReservationResult> {
    const providerSet = await getProviderSet();
    return providerSet[this.key].reserveKey(key, ttlSeconds);
  }
}

class DeferredChannelMessageReceiptProvider implements ChannelMessageReceiptProvider {
  async recordIngressReceipt(input: ChannelIngressReceiptInput): Promise<void> {
    return (await getProviderSet()).messageReceiptProvider.recordIngressReceipt(input);
  }

  async bindTurnToReceipt(input: ChannelTurnReceiptBindingInput): Promise<void> {
    return (await getProviderSet()).messageReceiptProvider.bindTurnToReceipt(input);
  }

  async getLatestSourceByAgentRunId(agentRunId: string): Promise<ChannelSourceContext | null> {
    return (await getProviderSet()).messageReceiptProvider.getLatestSourceByAgentRunId(agentRunId);
  }

  async getLatestSourceByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelSourceContext | null> {
    return (await getProviderSet()).messageReceiptProvider.getLatestSourceByDispatchTarget(target);
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    return (await getProviderSet()).messageReceiptProvider.getSourceByAgentRunTurn(agentRunId, turnId);
  }
}

class DeferredDeliveryEventProvider implements DeliveryEventProvider {
  async upsertByCallbackKey(
    input: UpsertChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    return (await getProviderSet()).deliveryEventProvider.upsertByCallbackKey(input);
  }

  async findByCallbackKey(
    callbackIdempotencyKey: string,
  ): Promise<ChannelDeliveryEvent | null> {
    return (await getProviderSet()).deliveryEventProvider.findByCallbackKey(callbackIdempotencyKey);
  }
}

let deferredProviders:
  | {
      bindingProvider: ChannelBindingProvider;
      idempotencyProvider: ChannelIdempotencyProvider;
      callbackIdempotencyProvider: ChannelIdempotencyProvider;
      messageReceiptProvider: ChannelMessageReceiptProvider;
      deliveryEventProvider: DeliveryEventProvider;
    }
  | null = null;

export const getProviderProxySet = () => {
  if (!deferredProviders) {
    deferredProviders = {
      bindingProvider: new DeferredChannelBindingProvider(),
      idempotencyProvider: new DeferredChannelIdempotencyProvider("idempotencyProvider"),
      callbackIdempotencyProvider: new DeferredChannelIdempotencyProvider("callbackIdempotencyProvider"),
      messageReceiptProvider: new DeferredChannelMessageReceiptProvider(),
      deliveryEventProvider: new DeferredDeliveryEventProvider(),
    };
  }

  return deferredProviders;
};

export const resetProviderProxySetForTests = (): void => {
  providerSetPromise = null;
  deferredProviders = null;
};
