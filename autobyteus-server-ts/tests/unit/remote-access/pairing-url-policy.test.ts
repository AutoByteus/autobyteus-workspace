import { describe, expect, it } from "vitest";
import { validatePairingServerBaseUrl } from "../../../src/remote-access/services/pairing-url-policy.js";

const expectPolicyError = (run: () => unknown, code: string): void => {
  try {
    run();
  } catch (error) {
    expect(error).toMatchObject({ code });
    return;
  }
  throw new Error(`Expected policy error ${code}.`);
};

describe("pairing URL policy", () => {
  it("allows HTTPS and preserves canonical deployment base paths", () => {
    expect(validatePairingServerBaseUrl("https://gateway.example.com/autobyteus/mobile?pairing=old"))
      .toMatchObject({
        normalizedBaseUrl: "https://gateway.example.com/autobyteus",
        transportSecurity: "https",
        trustedPrivateHttpAcknowledgementRequired: false,
      });
  });

  it.each([
    "http://192.168.1.25:29695/mobile",
    "http://10.0.0.5:29695",
    "http://172.20.0.5:29695",
    "http://169.254.1.2:29695",
    "http://100.64.1.2:29695",
    "http://printer.local:29695",
    "http://autobyteus-node:29695",
    "http://[fd00::1]:29695",
    "http://[fe80::1]:29695",
  ])("allows acknowledged trusted private HTTP URL %s", (serverBaseUrl) => {
    expect(validatePairingServerBaseUrl(serverBaseUrl, { trustedPrivateHttpAcknowledged: true }))
      .toMatchObject({
        normalizedBaseUrl: expect.stringMatching(/^http:\/\//),
        transportSecurity: "trusted_private_http",
        trustedPrivateHttpAcknowledgementRequired: true,
      });
  });

  it("requires acknowledgement for trusted private HTTP", () => {
    expectPolicyError(
      () => validatePairingServerBaseUrl("http://192.168.1.25:29695"),
      "REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED",
    );
  });

  it.each([
    "http://example.com:29695",
    "http://desktop.tailnet.ts.net:29695",
    "http://8.8.8.8:29695",
  ])("rejects public-looking HTTP URL %s", (serverBaseUrl) => {
    expectPolicyError(
      () => validatePairingServerBaseUrl(serverBaseUrl, { trustedPrivateHttpAcknowledged: true }),
      "REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED",
    );
  });

  it.each([
    "http://localhost:29695",
    "https://127.0.0.1:29695",
    "http://0.0.0.0:29695",
    "http://host.docker.internal:29695",
    "http://[::1]:29695",
  ])("rejects phone-unreachable local-only URL %s", (serverBaseUrl) => {
    expectPolicyError(
      () => validatePairingServerBaseUrl(serverBaseUrl, { trustedPrivateHttpAcknowledged: true }),
      "REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY",
    );
  });
});
