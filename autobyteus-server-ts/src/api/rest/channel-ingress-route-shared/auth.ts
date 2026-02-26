import {
  verifyGatewaySignature,
} from "../middleware/verify-gateway-signature.js";
import type { ChannelIngressRouteDependencies } from "./types.js";

export const verifyGatewayRequestSignature = (
  body: unknown,
  headers: Record<string, unknown>,
  deps: ChannelIngressRouteDependencies,
): { code: string; detail: string } | null => {
  const secret = normalizeOptionalString(deps.gatewaySecret);
  if (!secret && deps.allowInsecureGatewayRequests === true) {
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
