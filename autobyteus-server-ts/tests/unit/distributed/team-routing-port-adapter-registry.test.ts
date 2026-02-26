import { describe, expect, it } from "vitest";
import type { TeamRoutingPort } from "autobyteus-ts";
import {
  MissingRoutingAdapterError,
  TeamRoutingPortAdapterRegistry,
} from "../../../src/distributed/routing/team-routing-port-adapter-registry.js";

describe("TeamRoutingPortAdapterRegistry", () => {
  const makeAdapterStub = (): TeamRoutingPort => ({
    dispatchUserMessage: async () => ({ accepted: true }),
    dispatchInterAgentMessageRequest: async () => ({ accepted: true }),
    dispatchToolApproval: async () => ({ accepted: true }),
    dispatchControlStop: async () => ({ accepted: true }),
  });

  it("stores and resolves adapter registrations by teamRunId", () => {
    const registry = new TeamRoutingPortAdapterRegistry();
    const adapter = makeAdapterStub();

    registry.initialize({
      teamRunId: "run-1",
      runVersion: 3,
      adapter,
    });

    expect(registry.resolve("run-1")).toBe(adapter);
    expect(registry.resolveRunVersion("run-1")).toBe(3);
    expect(registry.size()).toBe(1);
  });

  it("throws when resolving missing registration", () => {
    const registry = new TeamRoutingPortAdapterRegistry();

    expect(() => registry.resolve("missing")).toThrow(MissingRoutingAdapterError);
    expect(() => registry.resolveRunVersion("missing")).toThrow(MissingRoutingAdapterError);
  });

  it("disposes registrations", () => {
    const registry = new TeamRoutingPortAdapterRegistry();
    registry.initialize({
      teamRunId: "run-1",
      runVersion: 1,
      adapter: makeAdapterStub(),
    });

    expect(registry.dispose("run-1")).toBe(true);
    expect(registry.size()).toBe(0);
    expect(registry.dispose("run-1")).toBe(false);
  });
});
