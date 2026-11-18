import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { CLAUDE_SESSION_SETTING_KEYS } from "../../agent-execution/backends/claude/session/claude-session-config.js";
import { CODEX_SESSION_SETTING_KEYS } from "../../agent-execution/backends/codex/codex-app-server-model-normalizer.js";
import { ACP_SESSION_SETTING_KEYS } from "../../agent-execution/backends/acp/session/acp-session-launcher.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

/**
 * The model settings keys each external runtime's backend reads from a run's stored `llmConfig`.
 * Antigravity CLI's backend reads none. Each backend exports its own set; this table only names which
 * set serves which runtime.
 */
const EXTERNAL_RUNTIME_SETTING_KEYS: Readonly<Record<Exclude<RuntimeKind, RuntimeKind.AUTOBYTEUS>, readonly string[]>> = {
  [RuntimeKind.CLAUDE_AGENT_SDK]: CLAUDE_SESSION_SETTING_KEYS,
  [RuntimeKind.CODEX_APP_SERVER]: CODEX_SESSION_SETTING_KEYS,
  [RuntimeKind.GROK_BUILD]: ACP_SESSION_SETTING_KEYS,
  [RuntimeKind.DEEPSEEK_HARNESS]: ACP_SESSION_SETTING_KEYS,
  [RuntimeKind.ANTIGRAVITY_CLI]: [],
};

/**
 * The `llmConfig` a new standalone agent or team scope stores and launches: only declared settings.
 * - AutoByteus: the keys the selected model's schema declares (standard config fields kept), written
 *   as top-level keys, via the factory that applies the same rule when the run activates.
 * - External runtimes: the setting keys the runtime's backend reads. The model's own schema is not
 *   read here: that needs a runtime catalog read (a Claude CLI spawn) on every launch.
 * Returns `null` when nothing remains.
 */
export const projectNewRunLlmConfig = async (input: {
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null | undefined;
}): Promise<Record<string, unknown> | null> => {
  if (!input.llmConfig) {
    return null;
  }
  if (input.runtimeKind === RuntimeKind.AUTOBYTEUS) {
    return LLMFactory.canonicalRunLlmConfig(input.llmModelIdentifier, input.llmConfig as Record<string, unknown>);
  }
  const declaredKeys = EXTERNAL_RUNTIME_SETTING_KEYS[input.runtimeKind];
  const kept = Object.fromEntries(
    Object.entries(input.llmConfig).filter(([key]) => declaredKeys.includes(key)),
  );
  return Object.keys(kept).length > 0 ? kept : null;
};
