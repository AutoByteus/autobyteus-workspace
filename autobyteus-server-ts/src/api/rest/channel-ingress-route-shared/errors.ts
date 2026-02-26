import { ExternalChannelParseError } from "autobyteus-ts/external-channel/errors.js";
import { ChannelIngressNotConfiguredError } from "./types.js";

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
