import { describe, expect, it } from "vitest";
import { resolveDiscoveryAdmissionMode } from "../../../../src/discovery/config/discovery-admission-mode.js";

describe("resolveDiscoveryAdmissionMode", () => {
  it("defaults to lan_open", () => {
    expect(resolveDiscoveryAdmissionMode({})).toBe("lan_open");
  });

  it("accepts explicit lan_open", () => {
    expect(
      resolveDiscoveryAdmissionMode({ AUTOBYTEUS_NODE_DISCOVERY_ADMISSION_MODE: "lan_open" }),
    ).toBe("lan_open");
  });

  it("rejects unsupported admission mode", () => {
    expect(() =>
      resolveDiscoveryAdmissionMode({ AUTOBYTEUS_NODE_DISCOVERY_ADMISSION_MODE: "strict" }),
    ).toThrow("UNSUPPORTED_DISCOVERY_ADMISSION_MODE");
  });
});

