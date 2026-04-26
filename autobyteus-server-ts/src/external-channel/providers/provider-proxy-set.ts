import type {
  ChannelBinding,
  ChannelBindingLookup,
  ChannelBindingProviderDefaultLookup,
  ChannelAcceptedIngressReceiptInput,
  ChannelClaimIngressDispatchInput,
  ChannelDispatchTarget,
  ChannelDeliveryEvent,
  ChannelIngressReceiptKey,
  ChannelIngressReceiptState,
  ChannelMessageReceipt,
  ChannelPendingIngressReceiptInput,
  ChannelRunOutputDeliveryRecord,
  ChannelRunOutputDeliveryStatus,
  ChannelRunOutputObservedTurnInput,
  ChannelRunOutputPublishedInput,
  ChannelRunOutputPublishPendingInput,
  ChannelRunOutputReplyFinalizedInput,
  ChannelRunOutputTerminalInput,
  ChannelSourceContext,
  ChannelSourceRoute,
  ChannelUnboundIngressReceiptInput,
  UpsertChannelBindingInput,
  UpsertChannelDeliveryEventInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "./channel-binding-provider.js";
import type { ChannelMessageReceiptProvider } from "./channel-message-receipt-provider.js";
import type { ChannelRunOutputDeliveryProvider } from "./channel-run-output-delivery-provider.js";
import type { DeliveryEventProvider } from "./delivery-event-provider.js";

type ChannelProviderSet = {
  bindingProvider: ChannelBindingProvider;
  messageReceiptProvider: ChannelMessageReceiptProvider;
  runOutputDeliveryProvider: ChannelRunOutputDeliveryProvider;
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

const loadFileProviderSet = async (): Promise<ChannelProviderSet> => {
  const [bindingProvider, receipt, runOutput, delivery] = await Promise.all([
    loadBindingProvider(),
    importChannelProviderModule<{
      FileChannelMessageReceiptProvider: new () => ChannelMessageReceiptProvider;
    }>("file-channel-message-receipt-provider.js"),
    importChannelProviderModule<{
      FileChannelRunOutputDeliveryProvider: new () => ChannelRunOutputDeliveryProvider;
    }>("file-channel-run-output-delivery-provider.js"),
    importChannelProviderModule<{
      FileDeliveryEventProvider: new () => DeliveryEventProvider;
    }>("file-delivery-event-provider.js"),
  ]);

  return {
    bindingProvider,
    messageReceiptProvider: new receipt.FileChannelMessageReceiptProvider(),
    runOutputDeliveryProvider: new runOutput.FileChannelRunOutputDeliveryProvider(),
    deliveryEventProvider: new delivery.FileDeliveryEventProvider(),
  };
};

const resolveProviderSet = async (): Promise<ChannelProviderSet> => loadFileProviderSet();

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

class DeferredChannelMessageReceiptProvider implements ChannelMessageReceiptProvider {
  async getReceiptByExternalMessage(
    input: ChannelIngressReceiptKey,
  ): Promise<ChannelMessageReceipt | null> {
    return (await getProviderSet()).messageReceiptProvider.getReceiptByExternalMessage(input);
  }

  async createPendingIngressReceipt(
    input: ChannelPendingIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    return (await getProviderSet()).messageReceiptProvider.createPendingIngressReceipt(input);
  }

  async claimIngressDispatch(
    input: ChannelClaimIngressDispatchInput,
  ): Promise<ChannelMessageReceipt> {
    return (await getProviderSet()).messageReceiptProvider.claimIngressDispatch(input);
  }

  async recordAcceptedDispatch(
    input: ChannelAcceptedIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    return (await getProviderSet()).messageReceiptProvider.recordAcceptedDispatch(input);
  }

  async markIngressUnbound(
    input: ChannelUnboundIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    return (await getProviderSet()).messageReceiptProvider.markIngressUnbound(input);
  }

  async listReceiptsByIngressState(
    state: ChannelIngressReceiptState,
  ): Promise<ChannelMessageReceipt[]> {
    return (await getProviderSet()).messageReceiptProvider.listReceiptsByIngressState(state);
  }

  async findLatestAcceptedSourceForRoute(
    route: ChannelSourceRoute,
  ): Promise<ChannelSourceContext | null> {
    return (await getProviderSet()).messageReceiptProvider.findLatestAcceptedSourceForRoute(route);
  }
}

class DeferredChannelRunOutputDeliveryProvider
  implements ChannelRunOutputDeliveryProvider
{
  async getByDeliveryKey(
    deliveryKey: string,
  ): Promise<ChannelRunOutputDeliveryRecord | null> {
    return (await getProviderSet()).runOutputDeliveryProvider.getByDeliveryKey(deliveryKey);
  }

  async upsertObservedTurn(
    input: ChannelRunOutputObservedTurnInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return (await getProviderSet()).runOutputDeliveryProvider.upsertObservedTurn(input);
  }

  async markReplyFinalized(
    input: ChannelRunOutputReplyFinalizedInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return (await getProviderSet()).runOutputDeliveryProvider.markReplyFinalized(input);
  }

  async markPublishPending(
    input: ChannelRunOutputPublishPendingInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return (await getProviderSet()).runOutputDeliveryProvider.markPublishPending(input);
  }

  async markPublished(
    input: ChannelRunOutputPublishedInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return (await getProviderSet()).runOutputDeliveryProvider.markPublished(input);
  }

  async markTerminal(
    input: ChannelRunOutputTerminalInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return (await getProviderSet()).runOutputDeliveryProvider.markTerminal(input);
  }

  async listByStatuses(
    statuses: ChannelRunOutputDeliveryStatus[],
  ): Promise<ChannelRunOutputDeliveryRecord[]> {
    return (await getProviderSet()).runOutputDeliveryProvider.listByStatuses(statuses);
  }

  async listByBindingId(bindingId: string): Promise<ChannelRunOutputDeliveryRecord[]> {
    return (await getProviderSet()).runOutputDeliveryProvider.listByBindingId(bindingId);
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
      messageReceiptProvider: ChannelMessageReceiptProvider;
      runOutputDeliveryProvider: ChannelRunOutputDeliveryProvider;
      deliveryEventProvider: DeliveryEventProvider;
    }
  | null = null;

export const getProviderProxySet = () => {
  if (!deferredProviders) {
    deferredProviders = {
      bindingProvider: new DeferredChannelBindingProvider(),
      messageReceiptProvider: new DeferredChannelMessageReceiptProvider(),
      runOutputDeliveryProvider: new DeferredChannelRunOutputDeliveryProvider(),
      deliveryEventProvider: new DeferredDeliveryEventProvider(),
    };
  }

  return deferredProviders;
};

export const resetProviderProxySetForTests = (): void => {
  providerSetPromise = null;
  deferredProviders = null;
};
