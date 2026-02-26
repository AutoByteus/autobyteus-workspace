import { describe, expect, it } from "vitest";
import {
  buildGatewaySignature,
  verifyGatewaySignature,
} from "../../../../../src/api/rest/middleware/verify-gateway-signature.js";

describe("verifyGatewaySignature", () => {
  it("accepts valid signature and timestamp", () => {
    const rawBody = '{"message":"hello"}';
    const timestampHeader = "1738972800";
    const secret = "test-secret";
    const signatureHeader = buildGatewaySignature({
      rawBody,
      timestampHeader,
      secret,
    });

    const result = verifyGatewaySignature({
      rawBody,
      signatureHeader,
      timestampHeader,
      secret,
      now: new Date(Number(timestampHeader) * 1000),
    });

    expect(result.valid).toBe(true);
    expect(result.errorCode).toBeNull();
  });

  it("rejects missing signature header", () => {
    const result = verifyGatewaySignature({
      rawBody: "{}",
      signatureHeader: null,
      timestampHeader: "1738972800",
      secret: "test-secret",
      now: new Date("2025-02-08T00:00:00.000Z"),
    });

    expect(result).toEqual({
      valid: false,
      errorCode: "MISSING_SIGNATURE",
      message: "Gateway signature header is missing.",
    });
  });

  it("rejects stale timestamps", () => {
    const rawBody = '{"message":"hello"}';
    const timestampHeader = "1738972800";
    const secret = "test-secret";
    const signatureHeader = buildGatewaySignature({
      rawBody,
      timestampHeader,
      secret,
    });

    const result = verifyGatewaySignature({
      rawBody,
      signatureHeader,
      timestampHeader,
      secret,
      now: new Date("2025-02-08T01:00:00.000Z"),
      maxSkewSeconds: 30,
    });

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("TIMESTAMP_OUT_OF_RANGE");
  });

  it("rejects signature mismatch", () => {
    const result = verifyGatewaySignature({
      rawBody: '{"message":"hello"}',
      signatureHeader: "bad-signature",
      timestampHeader: "1738972800",
      secret: "test-secret",
      now: new Date("2025-02-08T00:00:00.000Z"),
    });

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_SIGNATURE");
  });
});
