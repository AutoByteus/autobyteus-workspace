import { describe, expect, it } from "vitest";
import { createDiscoveryAdmissionPolicy } from "../../../../src/discovery/admission/discovery-admission-policy.js";

describe("createDiscoveryAdmissionPolicy", () => {
  it("allows all ingress for lan_open mode", () => {
    const policy = createDiscoveryAdmissionPolicy("lan_open");
    expect(
      policy.evaluateAdmission({
        nodeId: "node-a",
        baseUrl: "http://10.0.0.10:8000",
        requestIp: "192.168.1.2",
      }),
    ).toEqual({ allow: true });
  });
});

