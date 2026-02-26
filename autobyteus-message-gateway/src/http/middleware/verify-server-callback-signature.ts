import { timingSafeEqual } from "node:crypto";
import { createServerSignature } from "../../infrastructure/server-api/server-signature.js";

export type ServerCallbackAuthResult = {
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

export type VerifyServerCallbackSignatureInput = {
  rawBody: string;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  secret: string | null | undefined;
  allowInsecureWhenSecretMissing?: boolean;
  maxSkewSeconds?: number;
  now?: Date;
};

export function verifyServerCallbackSignature(
  input: VerifyServerCallbackSignatureInput,
): ServerCallbackAuthResult {
  const secret = normalizeOptionalString(input.secret);
  if (!secret) {
    if (input.allowInsecureWhenSecretMissing === true) {
      return valid("Server callback signature bypassed (insecure mode).");
    }
    return invalid("MISSING_SECRET", "Server callback shared secret is missing.");
  }

  const signatureHeader = normalizeOptionalString(input.signatureHeader);
  if (!signatureHeader) {
    return invalid("MISSING_SIGNATURE", "Server callback signature header is missing.");
  }

  const timestampHeader = normalizeOptionalString(input.timestampHeader);
  if (!timestampHeader) {
    return invalid("MISSING_TIMESTAMP", "Server callback timestamp header is missing.");
  }

  const timestampSeconds = Number(timestampHeader);
  if (!Number.isFinite(timestampSeconds)) {
    return invalid("INVALID_TIMESTAMP", "Server callback timestamp header is invalid.");
  }

  const now = input.now ?? new Date();
  const maxSkewSeconds = input.maxSkewSeconds ?? 300;
  const ageSeconds = Math.abs(now.getTime() / 1000 - timestampSeconds);
  if (ageSeconds > maxSkewSeconds) {
    return invalid(
      "TIMESTAMP_OUT_OF_RANGE",
      "Server callback timestamp is outside the allowed time window.",
    );
  }

  const expectedSignature = createServerSignature(
    input.rawBody,
    timestampHeader,
    secret,
  );
  if (!safeEqual(expectedSignature, signatureHeader)) {
    return invalid("INVALID_SIGNATURE", "Server callback signature mismatch.");
  }

  return valid("Server callback signature verified.");
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

const valid = (message: string): ServerCallbackAuthResult => ({
  valid: true,
  errorCode: null,
  message,
});

const invalid = (
  errorCode: NonNullable<ServerCallbackAuthResult["errorCode"]>,
  message: string,
): ServerCallbackAuthResult => ({
  valid: false,
  errorCode,
  message,
});
