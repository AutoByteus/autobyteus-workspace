import type { ChannelIngressService } from "../../../external-channel/services/channel-ingress-service.js";
import type { DeliveryEventService } from "../../../external-channel/services/delivery-event-service.js";
import type {
  GatewayAuthResult,
  VerifyGatewaySignatureInput,
} from "../middleware/verify-gateway-signature.js";

type ChannelIngressServicePort = Pick<ChannelIngressService, "handleInboundMessage">;

type DeliveryEventServicePort = Pick<
  DeliveryEventService,
  "recordPending" | "recordSent" | "recordDelivered" | "recordFailed"
>;

export type VerifyGatewaySignaturePort = (
  input: VerifyGatewaySignatureInput,
) => GatewayAuthResult;

export type ChannelIngressRouteDependencies = {
  ingressService: ChannelIngressServicePort;
  deliveryEventService: DeliveryEventServicePort;
  gatewaySecret?: string | null;
  allowInsecureGatewayRequests?: boolean;
  verifyGatewaySignature?: VerifyGatewaySignaturePort;
};

export class ChannelIngressNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelIngressNotConfiguredError";
  }
}
