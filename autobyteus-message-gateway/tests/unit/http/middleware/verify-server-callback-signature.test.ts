import { describe, expect, it } from "vitest";
import { createServerSignature } from "../../../../src/infrastructure/server-api/server-signature.js";
import { verifyServerCallbackSignature } from "../../../../src/http/middleware/verify-server-callback-signature.js";

describe("verifyServerCallbackSignature", () => {
  it("rejects requests when no callback secret is configured", () => {
    const result = verifyServerCallbackSignature({
      rawBody: "{}",
      signatureHeader: null,
      timestampHeader: null,
      secret: null,
    });
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("MISSING_SECRET");
  });

  it("accepts requests without secret only in explicit insecure mode", () => {
    const result = verifyServerCallbackSignature({
      rawBody: "{}",
      signatureHeader: null,
      timestampHeader: null,
      secret: null,
      allowInsecureWhenSecretMissing: true,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing signature when secret is configured", () => {
    const result = verifyServerCallbackSignature({
      rawBody: "{}",
      signatureHeader: null,
      timestampHeader: "1700000000",
      secret: "secret-1",
    });
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("MISSING_SIGNATURE");
  });

  it("accepts matching signature and timestamp", () => {
    const rawBody = '{"hello":"world"}';
    const timestampHeader = "1700000000";
    const secret = "secret-1";
    const signatureHeader = createServerSignature(rawBody, timestampHeader, secret);

    const result = verifyServerCallbackSignature({
      rawBody,
      signatureHeader,
      timestampHeader,
      secret,
      now: new Date(Number(timestampHeader) * 1000),
    });

    expect(result.valid).toBe(true);
  });
});
