import type { SecretConsumerIdentity } from "../../secret-management/domain/secret-id.js";
import type { DeliveryRoute } from "../delivery-definitions.js";

/** The stream protocols a relay reads usage and stop reason from. */
export type ProviderRelayStreamReaderKind = "anthropic-messages";

/**
 * One provider relay (app-owned, never read from an imported source): where a runtime's model calls may go, which
 * vault entry supplies the key, and how the relay reads the calls it forwards.
 */
export type ProviderRelay = Readonly<{
  id: string;
  /** The provider's name in refusals and the key-missing message. */
  providerName: string;
  route: DeliveryRoute;
  consumer: SecretConsumerIdentity;
  /** The request header whose value `1` marks a compaction call. */
  compactionHeader: string;
  streamReader: ProviderRelayStreamReaderKind;
}>;

export const DEEPSEEK_PROVIDER_RELAY_ID = "deepseek";

const MESSAGES_PATH = "/anthropic/v1/messages";

/** DeepSeek's Messages API for DeepSeek Harness runs (dsh appends `/v1/messages` to its base URL). */
export const createDeepSeekProviderRelay = (origin = "https://api.deepseek.com"): ProviderRelay => Object.freeze({
  id: DEEPSEEK_PROVIDER_RELAY_ID,
  providerName: "DeepSeek",
  route: Object.freeze({
    id: "messages",
    origin,
    basePath: "/anthropic",
    auth: "x-api-key",
    buffersRequestBody: false,
    redactsTextBodies: false,
    mapsUnauthorizedToForbidden: false,
    allows: (method: string, pathname: string) => method === "POST" && pathname === MESSAGES_PATH,
  }),
  consumer: Object.freeze({ kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey" }),
  compactionHeader: "x-deepseek-harness-compact",
  streamReader: "anthropic-messages",
});

/** The provider relays this app runs. */
export class ProviderRelays {
  private readonly byId: ReadonlyMap<string, ProviderRelay>;

  constructor(relays: readonly ProviderRelay[] = [createDeepSeekProviderRelay()]) {
    this.byId = new Map(relays.map((relay) => [relay.id, relay]));
  }

  get(relayId: string): ProviderRelay | null {
    return this.byId.get(relayId) ?? null;
  }
}

/** The relay's base URL for a runtime (no pass: the pass travels in the API-key header). */
export const providerRelayBaseUrl = (proxyBaseUrl: string, relayId: string): string => `${proxyBaseUrl}/relay/${relayId}`;

/** The user-facing text when the vault holds no key for a relay. */
export const providerRelayKeyMissingText = (relay: ProviderRelay): string =>
  `The ${relay.providerName} API key is not set in AutoByteus. Save it in Settings → API Keys.`;
