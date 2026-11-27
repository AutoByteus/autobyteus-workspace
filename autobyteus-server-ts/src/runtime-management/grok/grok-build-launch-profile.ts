import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import {
  releaseNothing,
  type AcpAgentLaunchProfile,
  type AcpDiscoveryLaunchRequest,
  type AcpLaunch,
  type AcpRelayAccess,
  type AcpRunLaunchRequest,
} from "../acp/acp-agent-launch-profile.js";

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

/**
 * Workspace trust for a Grok run (autobyteus-551, DEC-003): Grok loads a folder's own `.grok/skills` (the skills
 * AutoByteus links into a run's workspace among them) only in a trusted folder. `GROK_FOLDER_TRUST=0` turns Grok's
 * trust gate off for this process alone and writes nothing to the user's Grok settings (`--trust` would save the folder
 * in `~/.grok/trusted_folders.toml`). A trusted Grok also loads the workspace's Grok hooks, MCP/LSP servers, project
 * instructions and permission rules, as Claude runs load the workspace's project settings. Runs only: discovery and
 * extension-request processes stay untrusted.
 */
const GROK_BUILD_RUN_TRUST_ENV: Readonly<Record<string, string>> = Object.freeze({
  GROK_FOLDER_TRUST: "0",
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

/**
 * Models of a Grok model state `{ availableModels }` (Grok extension): the one in `initialize._meta.modelState`, or the
 * params of Grok's `_x.ai/models/update` announcement, which have the same shape.
 */
export const normalizeGrokBuildModels = (modelState: unknown): ModelInfo[] => {
  const available = isRecord(modelState) && Array.isArray(modelState.availableModels)
    ? modelState.availableModels.filter(isRecord) : [];
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

/** The node's own xAI credentials, which a relayed Grok never sees. */
const GROK_OWN_CREDENTIAL_ENV = ["XAI_API_KEY", "GROK_API_KEY", "GROK_AUTH_PROVIDER_ACCESS_TOKEN", "GROK_XAI_API_BASE_URL"] as const;

/**
 * On a relayed node: xAI's address is the relay (`GROK_XAI_API_BASE_URL`, P-7) and the pass travels in the variable of
 * the relay credential kind: `XAI_API_KEY` (API key) or `GROK_AUTH_PROVIDER_ACCESS_TOKEN` (login token, U-2).
 */
const grokRelayEnvironment = (relay: AcpRelayAccess | null): NodeJS.ProcessEnv => {
  if (!relay) return { ...process.env };
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of GROK_OWN_CREDENTIAL_ENV) delete env[key];
  env.GROK_XAI_API_BASE_URL = `${relay.baseUrl}/v1`;
  if (relay.relayCredentialKind === "loginToken") env.GROK_AUTH_PROVIDER_ACCESS_TOKEN = relay.pass;
  else env.XAI_API_KEY = relay.pass;
  return env;
};

/**
 * One Grok process: model and effort as arguments (both absent for discovery), the server environment (with the relay
 * on a relayed node) plus the switches, and workspace trust for a run.
 */
const grokLaunch = (
  model: string | null,
  reasoningEffort: string | null,
  trustWorkspace: boolean,
  relay: AcpRelayAccess | null,
): AcpLaunch => Object.freeze({
  // One process per run: `--no-leader` overrides a user config that enables the shared leader.
  args: [
    "agent", "--no-leader",
    ...(model ? ["--model", model] : []),
    ...(reasoningEffort ? ["--reasoning-effort", reasoningEffort] : []),
    "stdio",
  ],
  env: { ...grokRelayEnvironment(relay), ...GROK_BUILD_DISABLED_TOOL_ENV, ...(trustWorkspace ? GROK_BUILD_RUN_TRUST_ENV : {}) },
  release: releaseNothing,
});

/**
 * Grok keeps the instructions it got at `session/new` (`_meta.rules`) and calls its provider itself, or, on a relayed
 * node, through the xAI relay.
 */
export const grokBuildLaunchProfile: AcpAgentLaunchProfile = Object.freeze({
  agentLabel: GROK_BUILD_AGENT_LABEL,
  relay: Object.freeze({ relayId: "xai", runtimeKind: "grok_build", use: "whenRelayed" }),
  command: grokBuildCommand,
  runLaunch: async (request: AcpRunLaunchRequest) => grokLaunch(request.model, request.reasoningEffort, true, request.relayAccess),
  discoveryLaunch: async (request: AcpDiscoveryLaunchRequest) => grokLaunch(null, null, false, request.nodeRelayAccess),
});
