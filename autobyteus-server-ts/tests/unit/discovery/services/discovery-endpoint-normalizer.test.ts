import { describe, expect, it } from "vitest";
import { resolveEffectiveBaseUrl } from "../../../../src/discovery/services/discovery-endpoint-normalizer.js";

describe("resolveEffectiveBaseUrl", () => {
  it("keeps non-loopback advertised baseUrl unchanged", () => {
    expect(resolveEffectiveBaseUrl("http://10.0.0.20:8000/", "192.168.1.8")).toBe(
      "http://10.0.0.20:8000",
    );
  });

  it("rewrites loopback host to sender IP when sender is routable", () => {
    expect(resolveEffectiveBaseUrl("http://localhost:8100/", "::ffff:192.168.1.42")).toBe(
      "http://192.168.1.42:8100",
    );
  });

  it("throws when loopback host is provided without sender context", () => {
    expect(() => resolveEffectiveBaseUrl("http://127.0.0.1:8100/", null)).toThrow(
      "Loopback discovery endpoint is not allowed without sender IP context.",
    );
  });
});

