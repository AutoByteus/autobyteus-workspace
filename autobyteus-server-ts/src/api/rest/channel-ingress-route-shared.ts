import { ExternalChannelParseError } from "autobyteus-ts/external-channel/errors.js";
import type { ChannelIngressService } from "../../external-channel/services/channel-ingress-service.js";
import type { DeliveryEventService } from "../../external-channel/services/delivery-event-service.js";
import {
  verifyGatewaySignature,
  type VerifyGatewaySignatureInput,
  type GatewayAuthResult,
} from "./middleware/verify-gateway-signature.js";

type ChannelIngressServicePort = Pick<ChannelIngressService, "handleInboundMessage">;

type DeliveryEventServicePort = Pick<
  DeliveryEventService,
  "recordPending" | "recordSent" | "recordFailed"
>;

type VerifyGatewaySignaturePort = (
  input: VerifyGatewaySignatureInput,
) => GatewayAuthResult;

export type ChannelIngressRouteDependencies = {
  ingressService: ChannelIngressServicePort;
  deliveryEventService: DeliveryEventServicePort;
  gatewaySecret?: string | null;
  verifyGatewaySignature?: VerifyGatewaySignaturePort;
};

export class ChannelIngressNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelIngressNotConfiguredError";
  }
}

export const createUnconfiguredDependencies =
  (): ChannelIngressRouteDependencies => ({
    ingressService: {
      handleInboundMessage: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel ingress service is not configured.",
        );
      },
    },
    deliveryEventService: {
      recordPending: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
      recordSent: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
      recordFailed: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
    },
  });

export const verifyGatewayRequestSignature = (
  body: unknown,
  headers: Record<string, unknown>,
  deps: ChannelIngressRouteDependencies,
): { code: string; detail: string } | null => {
  const secret = normalizeOptionalString(deps.gatewaySecret);
  if (!secret) {
    return null;
  }

  const verify = deps.verifyGatewaySignature ?? verifyGatewaySignature;
  const rawBody = toRawBody(body);
  const signatureHeader = normalizeHeader(
    headers["x-autobyteus-gateway-signature"],
  );
  const timestampHeader = normalizeHeader(
    headers["x-autobyteus-gateway-timestamp"],
  );
  const signatureResult = verify({
    rawBody,
    signatureHeader,
    timestampHeader,
    secret,
  });
  if (signatureResult.valid) {
    return null;
  }

  return {
    code: signatureResult.errorCode ?? "INVALID_GATEWAY_SIGNATURE",
    detail: signatureResult.message,
  };
};

export const toRawBody = (body: unknown): string => {
  if (typeof body === "string") {
    return body;
  }
  if (body === undefined || body === null) {
    return "";
  }
  return JSON.stringify(body);
};

export const resolveCallbackIdempotencyKey = (
  metadata: Record<string, unknown>,
  correlationMessageId: string,
): string => {
  const fromCamel = normalizeOptionalString(
    metadata.callbackIdempotencyKey as string | undefined,
  );
  if (fromCamel) {
    return fromCamel;
  }

  const fromSnake = normalizeOptionalString(
    metadata.callback_idempotency_key as string | undefined,
  );
  if (fromSnake) {
    return fromSnake;
  }

  return correlationMessageId;
};

export const resolveErrorMessage = (
  metadata: Record<string, unknown>,
): string | null => {
  const fromCamel = metadata.errorMessage;
  if (typeof fromCamel === "string") {
    return normalizeOptionalString(fromCamel);
  }

  const fromSnake = metadata.error_message;
  if (typeof fromSnake === "string") {
    return normalizeOptionalString(fromSnake);
  }
  return null;
};

export const handleRouteError = (
  reply: {
    code: (statusCode: number) => {
      send: (payload: unknown) => unknown;
    };
  },
  error: unknown,
): unknown => {
  if (error instanceof ExternalChannelParseError) {
    return reply.code(400).send({
      code: error.code,
      field: error.field ?? null,
      detail: error.message,
    });
  }

  if (error instanceof ChannelIngressNotConfiguredError) {
    return reply.code(503).send({
      code: "CHANNEL_INGRESS_NOT_CONFIGURED",
      detail: error.message,
    });
  }

  return reply.code(500).send({
    code: "CHANNEL_INGRESS_INTERNAL_ERROR",
    detail: "Unexpected channel ingress error.",
  });
};

const normalizeHeader = (value: unknown): string | null => {
  if (typeof value === "string") {
    return normalizeOptionalString(value);
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return normalizeOptionalString(value[0]);
  }
  return null;
};

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
