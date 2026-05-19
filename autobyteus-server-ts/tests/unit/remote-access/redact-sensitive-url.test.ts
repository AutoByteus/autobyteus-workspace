import { describe, expect, it } from "vitest";
import { redactSensitiveUrl } from "../../../src/api/security/redact-sensitive-url.js";

describe("redactSensitiveUrl", () => {
  it("redacts websocket access tokens while preserving useful path and non-sensitive query", () => {
    expect(redactSensitiveUrl("/ws/agent/run-1?access_token=secret&view=live")).toBe(
      "/ws/agent/run-1?access_token=%5BREDACTED%5D&view=live",
    );
  });

  it("redacts mixed-case sensitive keys", () => {
    expect(redactSensitiveUrl("http://node/graphql?PairingCode=abc&foo=bar")).toBe(
      "http://node/graphql?PairingCode=%5BREDACTED%5D&foo=bar",
    );
  });

  it("redacts mobile pairing payload query while preserving non-sensitive diagnostics", () => {
    expect(redactSensitiveUrl("/mobile?pairing=eyJwYWlyaW5nQ29kZSI6InNlY3JldCJ9&source=qr")).toBe(
      "/mobile?pairing=%5BREDACTED%5D&source=qr",
    );
  });

  it("redacts pairing code query variants", () => {
    expect(redactSensitiveUrl("/mobile?pairing_code=secret-one&pairingCode=secret-two&status=check")).toBe(
      "/mobile?pairing_code=%5BREDACTED%5D&pairingCode=%5BREDACTED%5D&status=check",
    );
  });
});
