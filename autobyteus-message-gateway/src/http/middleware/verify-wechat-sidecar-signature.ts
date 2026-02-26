import { timingSafeEqual } from "node:crypto";
import { createWechatSidecarSignature } from "../../infrastructure/adapters/wechat-personal/wechat-sidecar-signature.js";

export type WechatSidecarAuthResult = {
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

export type VerifyWechatSidecarSignatureInput = {
  rawBody: string;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  secret: string | null | undefined;
  maxSkewSeconds?: number;
  now?: Date;
};

export function verifyWechatSidecarSignature(
  input: VerifyWechatSidecarSignatureInput,
): WechatSidecarAuthResult {
  const secret = normalizeOptionalString(input.secret);
  if (!secret) {
    return invalid("MISSING_SECRET", "WeChat sidecar shared secret is missing.");
  }

  const signatureHeader = normalizeOptionalString(input.signatureHeader);
  if (!signatureHeader) {
    return invalid("MISSING_SIGNATURE", "WeChat sidecar signature header is missing.");
  }

  const timestampHeader = normalizeOptionalString(input.timestampHeader);
  if (!timestampHeader) {
    return invalid("MISSING_TIMESTAMP", "WeChat sidecar timestamp header is missing.");
  }

  const timestampSeconds = Number(timestampHeader);
  if (!Number.isFinite(timestampSeconds)) {
    return invalid("INVALID_TIMESTAMP", "WeChat sidecar timestamp header is invalid.");
  }

  const now = input.now ?? new Date();
  const maxSkewSeconds = input.maxSkewSeconds ?? 300;
  const ageSeconds = Math.abs(now.getTime() / 1000 - timestampSeconds);
  if (ageSeconds > maxSkewSeconds) {
    return invalid(
      "TIMESTAMP_OUT_OF_RANGE",
      "WeChat sidecar timestamp is outside the allowed time window.",
    );
  }

  const expectedSignature = createWechatSidecarSignature(
    input.rawBody,
    timestampHeader,
    secret,
  );
  if (!safeEqual(expectedSignature, signatureHeader)) {
    return invalid("INVALID_SIGNATURE", "WeChat sidecar signature mismatch.");
  }

  return valid("WeChat sidecar signature verified.");
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

const valid = (message: string): WechatSidecarAuthResult => ({
  valid: true,
  errorCode: null,
  message,
});

const invalid = (
  errorCode: NonNullable<WechatSidecarAuthResult["errorCode"]>,
  message: string,
): WechatSidecarAuthResult => ({
  valid: false,
  errorCode,
  message,
});
