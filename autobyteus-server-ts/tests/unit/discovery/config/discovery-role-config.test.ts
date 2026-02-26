import { describe, expect, it } from "vitest";
import { resolveDiscoveryRoleConfig } from "../../../../src/discovery/config/discovery-role-config.js";

describe("resolveDiscoveryRoleConfig", () => {
  it("defaults to discovery disabled and registry role", () => {
    const result = resolveDiscoveryRoleConfig({});

    expect(result).toEqual({
      discoveryEnabled: false,
      role: "registry",
      registryUrl: null,
    });
  });

  it("parses enabled registry role", () => {
    const result = resolveDiscoveryRoleConfig({
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
    });

    expect(result).toEqual({
      discoveryEnabled: true,
      role: "registry",
      registryUrl: null,
    });
  });

  it("parses client role and normalizes trailing slash in registry url", () => {
    const result = resolveDiscoveryRoleConfig({
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: "client",
      AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL: "http://10.0.0.12:8000/",
    });

    expect(result).toEqual({
      discoveryEnabled: true,
      role: "client",
      registryUrl: "http://10.0.0.12:8000",
    });
  });

  it("infers client role and enabled state when registry url is provided", () => {
    const result = resolveDiscoveryRoleConfig({
      AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL: "http://10.0.0.20:9000/",
    });

    expect(result).toEqual({
      discoveryEnabled: true,
      role: "client",
      registryUrl: "http://10.0.0.20:9000",
    });
  });

  it("throws for unsupported role", () => {
    expect(() =>
      resolveDiscoveryRoleConfig({ AUTOBYTEUS_NODE_DISCOVERY_ROLE: "worker" }),
    ).toThrow("AUTOBYTEUS_NODE_DISCOVERY_ROLE must be one of");
  });

  it("throws when enabled client role has no registry url", () => {
    expect(() =>
      resolveDiscoveryRoleConfig({
        AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
        AUTOBYTEUS_NODE_DISCOVERY_ROLE: "client",
      }),
    ).toThrow("AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL is required");
  });

  it("throws for unsupported registry url protocol", () => {
    expect(() =>
      resolveDiscoveryRoleConfig({
        AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
        AUTOBYTEUS_NODE_DISCOVERY_ROLE: "client",
        AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL: "ftp://registry.local:8000",
      }),
    ).toThrow("must use http or https protocol");
  });
});
