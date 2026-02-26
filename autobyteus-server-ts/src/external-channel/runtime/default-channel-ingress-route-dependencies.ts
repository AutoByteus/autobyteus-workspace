import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { ChannelIngressRouteDependencies } from "../../api/rest/channel-ingress.js";
import { getDefaultTeamCommandIngressService } from "../../distributed/bootstrap/default-distributed-runtime-composition.js";
import { SqlChannelBindingProvider } from "../providers/sql-channel-binding-provider.js";
import { SqlChannelIdempotencyProvider } from "../providers/sql-channel-idempotency-provider.js";
import { SqlChannelMessageReceiptProvider } from "../providers/sql-channel-message-receipt-provider.js";
import { SqlDeliveryEventProvider } from "../providers/sql-delivery-event-provider.js";
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

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    const idempotencyService = new ChannelIdempotencyService(
      new SqlChannelIdempotencyProvider(),
    );
    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
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
      teamCommandIngressService: getDefaultTeamCommandIngressService(),
    });
    const ingressService = new ChannelIngressService({
      idempotencyService,
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });
    const deliveryEventService = new DeliveryEventService(
      new SqlDeliveryEventProvider(),
    );

    cachedDependencies = {
      ingressService,
      deliveryEventService,
      gatewaySecret: process.env.CHANNEL_GATEWAY_SHARED_SECRET ?? null,
      allowInsecureGatewayRequests:
        parseBoolean(process.env.CHANNEL_GATEWAY_ALLOW_INSECURE_REQUESTS) ?? false,
    };
    return cachedDependencies;
  };

const parseBoolean = (value: string | undefined): boolean | null => {
  if (value === undefined) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return null;
};
