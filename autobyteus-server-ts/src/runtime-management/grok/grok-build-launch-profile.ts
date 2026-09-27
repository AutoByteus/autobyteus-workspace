import type { InitializeResponse } from "@agentclientprotocol/sdk";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import type { AcpAgentLaunchProfile, AcpLaunchSelection } from "../acp/acp-agent-launch-profile.js";

export const GROK_BUILD_AGENT_LABEL = "Grok Build";
export const GROK_BUILD_PROVIDER_NAME = "Grok Build";

/**
 * Per-process switches that remove Grok's native child-agent orchestration (`task`, `workflow`)
 * and its interactive `ask_user_question` tool. Environment beats user config and does not
 * modify it; AutoByteus `delegate_task`/`send_message_to` are the collaboration path.
 */
export const GROK_BUILD_DISABLED_TOOL_ENV: Readonly<Record<string, string>> = Object.freeze({
  GROK_SUBAGENTS: "0",
  GROK_WORKFLOWS: "0",
  GROK_ASK_USER_QUESTION: "0",
});

export const grokBuildCommand = (): string => process.env.GROK_BUILD_COMMAND?.trim() || "grok";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const buildReasoningSchema = (meta: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (meta.supportsReasoningEffort !== true || !Array.isArray(meta.reasoningEfforts)) return undefined;
  const efforts = meta.reasoningEfforts.filter(isRecord);
  const values = efforts.map((effort) => nonEmpty(effort.value) ?? nonEmpty(effort.id)).filter((value): value is string => !!value);
  if (values.length === 0) return undefined;
  const defaultEffort = efforts.find((effort) => effort.default === true);
  return new ParameterSchema([new ParameterDefinition({
    name: "reasoning_effort",
    type: ParameterType.ENUM,
    description: "Grok Build reasoning effort. Reasoning is always enabled.",
    required: false,
    defaultValue: (defaultEffort && (nonEmpty(defaultEffort.value) ?? nonEmpty(defaultEffort.id))) ?? values[0],
    enumValues: values,
  })]).toJsonSchemaDict();
};

/** Models reported in `initialize._meta.modelState.availableModels` (Grok extension). */
export const normalizeGrokBuildModels = (initialize: InitializeResponse): ModelInfo[] => {
  const modelState = isRecord(initialize._meta) && isRecord(initialize._meta.modelState) ? initialize._meta.modelState : null;
  const available = Array.isArray(modelState?.availableModels) ? modelState.availableModels.filter(isRecord) : [];
  const models: ModelInfo[] = [];
  for (const entry of available) {
    const id = nonEmpty(entry.modelId);
    if (!id || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) || models.some((model) => model.model_identifier === id)) continue;
    const meta = isRecord(entry._meta) ? entry._meta : {};
    const contextTokens = typeof meta.totalContextTokens === "number" && meta.totalContextTokens > 0 ? meta.totalContextTokens : null;
    models.push({
      model_identifier: id,
      display_name: nonEmpty(entry.name) ?? id,
      description: nonEmpty(entry.description),
      value: id,
      canonical_name: id,
      provider_id: LLMProvider.GROK,
      provider_name: GROK_BUILD_PROVIDER_NAME,
      provider_type: LLMProvider.GROK,
      runtime: LLMRuntime.API,
      config_schema: buildReasoningSchema(meta),
      max_context_tokens: contextTokens,
      active_context_tokens: null,
      max_input_tokens: null,
      max_output_tokens: null,
      resolved_model_metadata: null,
    });
  }
  return models;
};

export const grokBuildLaunchProfile: AcpAgentLaunchProfile = Object.freeze({
  agentLabel: GROK_BUILD_AGENT_LABEL,
  command: grokBuildCommand,
  // One process per run: `--no-leader` overrides a user config that enables the shared leader.
  args: (selection: AcpLaunchSelection): string[] => [
    "agent", "--no-leader",
    ...(selection.model ? ["--model", selection.model] : []),
    ...(selection.reasoningEffort ? ["--reasoning-effort", selection.reasoningEffort] : []),
    "stdio",
  ],
  env: (base: NodeJS.ProcessEnv): NodeJS.ProcessEnv => ({ ...base, ...GROK_BUILD_DISABLED_TOOL_ENV }),
  normalizeModels: normalizeGrokBuildModels,
});
