import { describe, expect, it } from "vitest";
import { createWechatSidecarSignature } from "../../../../src/infrastructure/adapters/wechat-personal/wechat-sidecar-signature.js";
import { verifyWechatSidecarSignature } from "../../../../src/http/middleware/verify-wechat-sidecar-signature.js";

describe("verifyWechatSidecarSignature", () => {
  it("rejects requests when no sidecar secret is configured", () => {
    const result = verifyWechatSidecarSignature({
      rawBody: "{}",
      signatureHeader: null,
      timestampHeader: null,
      secret: null,
    });
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("MISSING_SECRET");
  });

  it("rejects missing signature when secret is configured", () => {
    const result = verifyWechatSidecarSignature({
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
    const signatureHeader = createWechatSidecarSignature(
      rawBody,
      timestampHeader,
      secret,
    );

    const result = verifyWechatSidecarSignature({
      rawBody,
      signatureHeader,
      timestampHeader,
      secret,
      now: new Date(Number(timestampHeader) * 1000),
    });

    expect(result.valid).toBe(true);
  });
});
