import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { ChannelIngressRouteDependencies } from "../../api/rest/channel-ingress.js";
import { getProviderProxySet } from "../providers/provider-proxy-set.js";
import { ChannelBindingService } from "../services/channel-binding-service.js";
import { ChannelIdempotencyService } from "../services/channel-idempotency-service.js";
import { ChannelIngressService } from "../services/channel-ingress-service.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import { ChannelThreadLockService } from "../services/channel-thread-lock-service.js";
import { DeliveryEventService } from "../services/delivery-event-service.js";
import { DefaultChannelRuntimeFacade } from "./default-channel-runtime-facade.js";

let cachedDependencies: ChannelIngressRouteDependencies | null = null;

export const getDefaultChannelIngressRouteDependencies =
  (): ChannelIngressRouteDependencies => {
    if (cachedDependencies) {
      return cachedDependencies;
    }

    const providerSet = getProviderProxySet();
    const bindingService = new ChannelBindingService(providerSet.bindingProvider);
    const idempotencyService = new ChannelIdempotencyService(
      providerSet.idempotencyProvider,
    );
    const messageReceiptService = new ChannelMessageReceiptService(
      providerSet.messageReceiptProvider,
    );
    const runtimeFacade = new DefaultChannelRuntimeFacade({
      agentRunManager: {
        getAgentRun: (agentRunId: string) =>
          AgentRunManager.getInstance().getAgentRun(agentRunId) as {
            postUserMessage: (
              message: import("autobyteus-ts").AgentInputUserMessage,
            ) => Promise<void>;
          } | null,
      },
      agentTeamRunManager: {
        getTeamRun: (teamRunId: string) =>
          AgentTeamRunManager.getInstance().getTeamRun(teamRunId) as {
            postMessage: (
              message: import("autobyteus-ts").AgentInputUserMessage,
              targetNodeName?: string | null,
            ) => Promise<void>;
          } | null,
      },
    });
    const ingressService = new ChannelIngressService({
      idempotencyService,
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });
    const deliveryEventService = new DeliveryEventService(
      providerSet.deliveryEventProvider,
    );

    cachedDependencies = {
      ingressService,
      deliveryEventService,
      gatewaySecret: process.env.CHANNEL_GATEWAY_SHARED_SECRET ?? null,
    };
    return cachedDependencies;
  };
