import { vi } from "vitest";
import type { ProviderRelayAccess } from "../../src/credential-proxy/provider-relays/provider-relay-access.js";

/**
 * A `ProviderRelayAccess` double of an unrelayed node: every method a mock (DeepSeek Harness on its relay, the others
 * direct), with `overrides` taking their place.
 */
export const providerRelayAccessDouble = <T extends Partial<ProviderRelayAccess>>(overrides: T = {} as T) => ({
  isRelayed: vi.fn(() => false),
  routeFor: vi.fn((runtimeKind: string) => (runtimeKind === "deepseek_harness"
    ? { kind: "relay" as const, relayId: "deepseek", relayCredentialKind: "apiKey" as const }
    : { kind: "direct" as const })),
  routeForNativeProvider: vi.fn(() => ({ kind: "direct" as const })),
  statusOf: vi.fn(() => ({ state: "signedOut" as const, detail: "This node is not relayed." })),
  prepareForRun: vi.fn(),
  prepareForNode: vi.fn(),
  relayBaseUrl: vi.fn(),
  observe: vi.fn(),
  ...overrides,
}) satisfies ProviderRelayAccess;
