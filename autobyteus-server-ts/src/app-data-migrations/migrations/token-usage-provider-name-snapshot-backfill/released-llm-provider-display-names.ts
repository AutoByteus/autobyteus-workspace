// Historical, migration-only. The built-in LLM provider display names as released app-data
// migrations classified them before the remote AutoByteus provider was removed from the runtime
// (frozen at origin/personal beb6b3b49). Owned by released app-data migrations; current runtime
// must not import it.
export const RELEASED_LLM_PROVIDER_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  MISTRAL: "Mistral",
  GEMINI: "Gemini",
  OLLAMA: "Ollama",
  DEEPSEEK: "DeepSeek",
  GROK: "Grok",
  AUTOBYTEUS: "AutoByteus",
  KIMI: "Kimi",
  QWEN: "Qwen",
  LMSTUDIO: "LM Studio",
  GLM: "GLM",
  MINIMAX: "MiniMax",
};

export const isReleasedBuiltInLlmProviderId = (providerId: string): boolean =>
  Object.hasOwn(RELEASED_LLM_PROVIDER_DISPLAY_NAMES, providerId);
