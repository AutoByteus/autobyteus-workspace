/**
 * The answer of `list_available_agent_runtimes` and of GraphQL `availableAgentRuntimes`: only what is useful for
 * choosing (REQ-004). No plans, tiers, credits, account data or vendor texts; an AutoByteus provider's money balance
 * is shown because it is that provider's limit.
 */

/** One usage limit: what it covers and its window, how much is left, when it resets (ISO-8601). */
export type UsageLimitView = Readonly<{ name: string; remainingPercent: number | null; resetsAt: string | null }>;

/** Why a model cannot run now: until the reset (null when unknown), by a limit's name or the provider's reason. */
export type ModelBlock = Readonly<{ until: string | null; by: string }>;

export type AvailableModel = Readonly<{
  id: string;
  name: string;
  /** Present where known. */
  contextTokens?: number;
  /** Present only when the model cannot run now. */
  blocked?: ModelBlock;
}>;

export type ExternalAgentRuntimeKindName = "codex_app_server" | "claude_agent_sdk" | "antigravity_cli" | "grok_build";

/** `unknown: <reason>`: a step failed or timed out; nothing is guessed (REQ-007). */
export type UnknownText = `unknown: ${string}`;

export type ExternalAgentRuntimeEntry = Readonly<{
  runtime: ExternalAgentRuntimeKindName;
  name: string;
  /**
   * Present only when the sign-in step could not tell: the runtime is listed because it is not known to be signed out
   * (DEC-002). Shown as "sign-in could not be checked".
   */
  signIn?: "not checked";
  limits: readonly UsageLimitView[] | "not reported" | UnknownText;
  /** One short sentence from the runtime, only with read limits, when a runtime-specific fact changes how to read them. */
  limitsNote?: string;
  /** Never an empty list: a runtime whose models cannot be read says why. */
  models: readonly AvailableModel[] | UnknownText;
}>;

export type AutoByteusProviderEntry = Readonly<{
  /** The provider's display name. */
  provider: string;
  /** "0.14 USD". */
  balance?: string;
  /** Why the provider cannot run now; its models carry the same block. */
  blocked?: string;
  limits?: "not reported" | UnknownText;
  /** `unknown: <reason>`: a keyed discovered provider (custom endpoint) whose models could not be read now. */
  models: readonly AvailableModel[] | UnknownText;
}>;

export type AutoByteusEntry = Readonly<{
  runtime: "autobyteus";
  name: "AutoByteus";
  providers: readonly AutoByteusProviderEntry[];
}>;

export type AvailableAgentRuntimeEntry = ExternalAgentRuntimeEntry | AutoByteusEntry;

export type AvailableAgentRuntimesReport = Readonly<{
  /** When this read started (ISO-8601). */
  checkedAt: string;
  agentRuntimes: readonly AvailableAgentRuntimeEntry[];
}>;
