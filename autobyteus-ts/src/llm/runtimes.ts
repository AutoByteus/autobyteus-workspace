/**
 * Represents the serving layer or environment where an LLM model is executed.
 * This is distinct from the LLMProvider, which is the creator of the model.
 */
export enum LLMRuntime {
  API = "api",
  OLLAMA = "ollama",
  LMSTUDIO = "lmstudio",
  AUTOBYTEUS = "autobyteus",
}
