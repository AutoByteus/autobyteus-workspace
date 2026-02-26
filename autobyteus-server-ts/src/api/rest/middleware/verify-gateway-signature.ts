import { createHmac, timingSafeEqual } from "node:crypto";

export type GatewayAuthResult = {
  valid: boolean;
  errorCode:
    | null
    | "MISSING_SECRET"
    | "MISSING_SIGNATURE"
    | "MISSING_TIMESTAMP"
    | "INVALID_TIMESTAMP"
    | "TIMESTAMP_OUT_OF_RANGE"
    | "INVALID_SIGNATURE";
  message: string;
};

export type VerifyGatewaySignatureInput = {
  rawBody: string;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  secret: string | null | undefined;
  maxSkewSeconds?: number;
  now?: Date;
};

export function verifyGatewaySignature(
  input: VerifyGatewaySignatureInput,
): GatewayAuthResult {
  const secret = normalizeOptionalString(input.secret);
  if (!secret) {
    return invalid("MISSING_SECRET", "Gateway secret is missing.");
  }

  const signatureHeader = normalizeOptionalString(input.signatureHeader);
  if (!signatureHeader) {
    return invalid("MISSING_SIGNATURE", "Gateway signature header is missing.");
  }

  const timestampHeader = normalizeOptionalString(input.timestampHeader);
  if (!timestampHeader) {
    return invalid("MISSING_TIMESTAMP", "Gateway timestamp header is missing.");
  }

  const timestampSeconds = Number(timestampHeader);
  if (!Number.isFinite(timestampSeconds)) {
    return invalid("INVALID_TIMESTAMP", "Gateway timestamp header is invalid.");
  }

  const now = input.now ?? new Date();
  const maxSkewSeconds = input.maxSkewSeconds ?? 300;
  const ageSeconds = Math.abs(now.getTime() / 1000 - timestampSeconds);
  if (ageSeconds > maxSkewSeconds) {
    return invalid(
      "TIMESTAMP_OUT_OF_RANGE",
      "Gateway timestamp is outside the allowed time window.",
    );
  }

  const expectedSignature = buildGatewaySignature({
    rawBody: input.rawBody,
    timestampHeader,
    secret,
  });

  if (!safeEqual(expectedSignature, signatureHeader)) {
    return invalid("INVALID_SIGNATURE", "Gateway signature mismatch.");
  }

  return {
    valid: true,
    errorCode: null,
    message: "Gateway signature verified.",
  };
}

export function buildGatewaySignature(input: {
  rawBody: string;
  timestampHeader: string;
  secret: string;
}): string {
  const payload = `${input.timestampHeader}.${input.rawBody}`;
  return createHmac("sha256", input.secret).update(payload).digest("hex");
}

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const invalid = (
  errorCode: NonNullable<GatewayAuthResult["errorCode"]>,
  message: string,
): GatewayAuthResult => ({
  valid: false,
  errorCode,
  message,
});
