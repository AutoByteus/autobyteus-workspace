import { DEFAULT_QWEN_BASE_URL } from "autobyteus-ts/llm/qwen-provider-config.js";
import type { SecretConsumerIdentity } from "../../secret-management/domain/secret-id.js";
import type { DeliveryRoute } from "../delivery-definitions.js";
import type { RelayCredentialKind } from "./provider-relay-settings.js";

/** The stream protocols a relay reads usage and stop reason from. */
export type ProviderRelayStreamReaderKind = "anthropic-messages";

/** Where a relay node finds the credential of one route: its vault, or its own Grok login (C10). */
export type RelayCredentialSource =
  | Readonly<{ kind: "vault"; consumer: SecretConsumerIdentity }>
  | Readonly<{ kind: "grokLogin" }>;

/** A credential as the relay node attaches it. */
export type RelayCredential = Readonly<{ secret: string }>;

/**
 * One way a relay reaches its provider, for one relay credential kind: the upstream route (origin, base path, allowed
 * methods and paths), where the credential comes from, the headers it becomes, and the caller headers removed beyond
 * the forwarder's own list.
 */
export type RelayCredentialRoute = Readonly<{
  route: DeliveryRoute;
  source: RelayCredentialSource;
  attach(credential: RelayCredential): Readonly<Record<string, string>>;
  dropFromCaller: readonly string[];
}>;

/**
 * One provider relay (app-owned, never read from an imported source, C3): its route per relay credential kind (no
 * login-token route: login tokens are not offered for it), and how a relay reads the calls it forwards (only relays
 * whose stream is read report observations).
 */
export type ProviderRelay = Readonly<{
  id: string;
  /** The provider's name in refusals and the key-missing message. */
  providerName: string;
  routes: Readonly<{ apiKey: RelayCredentialRoute; loginToken: RelayCredentialRoute | null }>;
  observation: Readonly<{ streamReader: ProviderRelayStreamReaderKind | null; compactionHeader: string | null }>;
}>;

export const DEEPSEEK_PROVIDER_RELAY_ID = "deepseek";

type PathRule = Readonly<{ methods: readonly string[]; path: string | RegExp }>;
const rule = (methods: string, path: string | RegExp): PathRule => ({ methods: methods.split("|"), path });
const allowsBy = (rules: readonly PathRule[]) => (method: string, pathname: string): boolean =>
  rules.some((entry) => entry.methods.includes(method)
    && (typeof entry.path === "string" ? entry.path === pathname : entry.path.test(pathname)));

const route = (id: string, origin: string, rules: readonly PathRule[]): DeliveryRoute => Object.freeze({
  id,
  origin,
  basePath: "",
  buffersRequestBody: false,
  redactsTextBodies: false,
  mapsUnauthorizedToForbidden: false,
  allows: allowsBy(rules),
});

const bearer = (credential: RelayCredential) => ({ authorization: `Bearer ${credential.secret}` });
const apiKeyHeader = (credential: RelayCredential) => ({ "x-api-key": credential.secret });
const googApiKey = (credential: RelayCredential) => ({ "x-goog-api-key": credential.secret });

const vault = (relayId: string, relayCredentialKind: RelayCredentialKind): RelayCredentialSource =>
  Object.freeze({ kind: "vault", consumer: Object.freeze({ kind: "providerRelay", relayId, relayCredentialKind }) });

const apiKeyRoute = (
  relayId: string,
  upstream: DeliveryRoute,
  attach: RelayCredentialRoute["attach"],
): RelayCredentialRoute => Object.freeze({ route: upstream, source: vault(relayId, "apiKey"), attach, dropFromCaller: Object.freeze([]) });

const OPENAI_COMPATIBLE_CHAT = [rule("POST", /^\/v1\/chat\/completions$/), rule("GET", /^\/v1\/models(\/[^/]+)?$/)];

/** Maps a provider's own origin to where a relay forwards (tests point every origin at a fake provider). */
export type ProviderOriginMap = (providerOrigin: string) => string;
const sameOrigin: ProviderOriginMap = (origin) => origin;

/**
 * The relays (C3). Paths are the provider's own (base path empty), as a client given the relay as its endpoint calls
 * them; only inference, model-listing and the CLIs' own account paths are allowed.
 */
export const createProviderRelayTable = (origin: ProviderOriginMap = sameOrigin): readonly ProviderRelay[] => {
  const relay = (
    id: string,
    providerName: string,
    apiKey: RelayCredentialRoute,
    loginToken: RelayCredentialRoute | null = null,
    observation: ProviderRelay["observation"] = { streamReader: null, compactionHeader: null },
  ): ProviderRelay => Object.freeze({ id, providerName, routes: Object.freeze({ apiKey, loginToken }), observation: Object.freeze(observation) });

  const anthropicPaths = [
    rule("POST", /^\/v1\/messages(\/count_tokens)?$/),
    rule("GET", /^\/v1\/models(\/[^/]+)?$/),
  ];
  const openAiPaths = [
    rule("POST", /^\/v1\/responses(\/compact)?$/),
    rule("GET|DELETE", /^\/v1\/responses\/[^/]+$/),
    ...OPENAI_COMPATIBLE_CHAT,
  ];
  const xaiPaths = [
    rule("POST", /^\/v1\/(chat\/completions|responses|messages)$/),
    rule("GET", /^\/v1\/(models|language-models)(\/[^/]+)?$/),
    rule("GET", "/v1/api-key"),
  ];
  const qwen = new URL(DEFAULT_QWEN_BASE_URL);
  const qwenPath = qwen.pathname.replace(/\/+$/, "");

  return Object.freeze([
    relay("anthropic", "Anthropic",
      apiKeyRoute("anthropic", route("anthropic-api-key", origin("https://api.anthropic.com"), anthropicPaths), apiKeyHeader),
      Object.freeze({
        route: route("anthropic-login-token", origin("https://api.anthropic.com"), anthropicPaths),
        source: vault("anthropic", "loginToken"),
        // Claude Code's own `anthropic-beta` (with the OAuth beta) passes unchanged (P-4).
        attach: bearer,
        dropFromCaller: Object.freeze([]),
      })),
    // No login-token route: Codex cannot run on a relayed login token (DEC-115, IMP-12).
    relay("openai", "OpenAI",
      apiKeyRoute("openai", route("openai-api-key", origin("https://api.openai.com"), openAiPaths), bearer)),
    relay("xai", "xAI",
      apiKeyRoute("xai", route("xai-api-key", origin("https://api.x.ai"), xaiPaths), bearer),
      Object.freeze({
        route: route("xai-login-token", origin("https://api.x.ai"), xaiPaths),
        source: Object.freeze({ kind: "grokLogin" }),
        attach: bearer,
        dropFromCaller: Object.freeze([]),
      })),
    relay(DEEPSEEK_PROVIDER_RELAY_ID, "DeepSeek",
      // DeepSeek Harness's Messages API (its base URL ends in `/anthropic`) and native DeepSeek's chat API.
      apiKeyRoute(DEEPSEEK_PROVIDER_RELAY_ID, route("deepseek-api-key", origin("https://api.deepseek.com"),
        [rule("POST", "/anthropic/v1/messages"), rule("POST", "/chat/completions")]), apiKeyHeader),
      null,
      { streamReader: "anthropic-messages", compactionHeader: "x-deepseek-harness-compact" }),
    relay("gemini", "Google AI Studio",
      apiKeyRoute("gemini", route("gemini-api-key", origin("https://generativelanguage.googleapis.com"), [
        rule("POST", /^\/v1(beta)?\/models\/[^/]+:(generateContent|streamGenerateContent|countTokens)$/),
        rule("GET", /^\/v1(beta)?\/models(\/[^/]+)?$/),
      ]), googApiKey)),
    relay("kimi", "Kimi", apiKeyRoute("kimi", route("kimi-api-key", origin("https://api.moonshot.ai"), OPENAI_COMPATIBLE_CHAT), bearer)),
    relay("glm", "GLM", apiKeyRoute("glm", route("glm-api-key", origin("https://open.bigmodel.cn"),
      [rule("POST", "/api/coding/paas/v4/chat/completions")]), bearer)),
    relay("qwen", "Qwen", apiKeyRoute("qwen", route("qwen-api-key", origin(qwen.origin),
      [rule("POST", `${qwenPath}/chat/completions`), rule("GET", `${qwenPath}/models`)]), bearer)),
    relay("mistral", "Mistral", apiKeyRoute("mistral", route("mistral-api-key", origin("https://api.mistral.ai"), OPENAI_COMPATIBLE_CHAT), bearer)),
    relay("minimax", "MiniMax", apiKeyRoute("minimax", route("minimax-api-key", origin("https://api.minimax.io"), OPENAI_COMPATIBLE_CHAT), bearer)),
  ]);
};

/** The provider relays this app runs. */
export class ProviderRelays {
  private readonly byId: ReadonlyMap<string, ProviderRelay>;

  constructor(relays: readonly ProviderRelay[] = createProviderRelayTable()) {
    this.byId = new Map(relays.map((relay) => [relay.id, relay]));
  }

  get(relayId: string): ProviderRelay | null {
    return this.byId.get(relayId) ?? null;
  }
}

/** The relay's base URL for a runtime (no pass: the pass travels in the runtime's own credential header). */
export const providerRelayBaseUrl = (proxyBaseUrl: string, relayId: string): string => `${proxyBaseUrl}/relay/${relayId}`;

/** The user-facing text when the vault holds no key for a relay. */
export const providerRelayKeyMissingText = (relay: Pick<ProviderRelay, "providerName">): string =>
  `The ${relay.providerName} API key is not set in AutoByteus. Save it in Settings → API Keys.`;
