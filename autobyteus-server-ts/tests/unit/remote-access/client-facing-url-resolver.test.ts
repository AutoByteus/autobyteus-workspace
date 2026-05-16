import { describe, expect, it } from "vitest";
import { DefaultClientFacingUrlResolver } from "../../../src/remote-access/services/client-facing-url-resolver.js";

describe("ClientFacingUrlResolver", () => {
  it("normalizes rest paths to root-relative URLs by default", () => {
    const resolver = new DefaultClientFacingUrlResolver();
    expect(resolver.toRestRelativePath("http://127.0.0.1:29695/rest/files/images/a.png?download=1")).toBe(
      "/rest/files/images/a.png?download=1",
    );
    expect(resolver.resolveRestResourceUrl({
      context: { localFallbackBaseUrl: "http://127.0.0.1:29695" },
      restPath: "/files/images/a.png",
    })).toBe("/rest/files/images/a.png");
  });

  it("uses paired mobile base URL when an absolute URL is required", () => {
    const resolver = new DefaultClientFacingUrlResolver();
    expect(resolver.resolveRestResourceUrl({
      context: {
        localFallbackBaseUrl: "http://127.0.0.1:29695",
        authContext: {
          mode: "mobile",
          isAuthenticated: true,
          deviceId: "device_1",
          clientFacingBaseUrl: "http://100.64.1.2:29695",
        },
      },
      restPath: "/rest/files/images/a.png",
      prefer: "absolute",
    })).toBe("http://100.64.1.2:29695/rest/files/images/a.png");
  });
});
