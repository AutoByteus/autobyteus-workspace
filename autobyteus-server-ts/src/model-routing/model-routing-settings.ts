import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { appConfigProvider } from "../config/app-config-provider.js";
import type { RunModelSelectionValidationResult, RunModelSelectionValidator } from "../llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../runtime-management/runtime-kind-enum.js";

/** Model Routing on this node (REQ-002): `true` turns it on; off by default. */
export const MODEL_ROUTING_ENABLED_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTING_ENABLED";
/** The Model Router agent's runtime (REQ-003), set on the Model Routing page. */
export const MODEL_ROUTER_RUNTIME_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTER_RUNTIME";
/** The Model Router agent's model on that runtime. */
export const MODEL_ROUTER_MODEL_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTER_MODEL";
/**
 * The Model Router agent's model settings (`llmConfig`, e.g. its thinking level) as one JSON object (autobyteus-313
 * DEC-001); absent or empty means no settings, as before this key existed (REQ-005).
 */
export const MODEL_ROUTER_LLM_CONFIG_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG";

/** Model settings of a launch: the same `llmConfig` object as any agent's launch configuration. */
export type ModelRouterLlmConfig = Readonly<Record<string, unknown>>;

/** The Model Router agent's launch configuration as the page set it: runtime, model and model settings (REQ-002). */
export type ModelRouterLaunch = Readonly<{ runtimeKind: string; llmModelIdentifier: string; llmConfig: ModelRouterLlmConfig | null }>;

const RUNTIME_KINDS: ReadonlySet<string> = new Set(Object.values(RuntimeKind));

const parseBoolean = (rawValue: string | undefined): boolean | null => {
  const normalized = rawValue?.trim().toLowerCase();
  return normalized === "true" ? true : normalized === "false" ? false : null;
};
const nonEmpty = (rawValue: string | undefined): string | null => rawValue?.trim() || null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The JSON object in `rawValue`; null for none, and an error text for text that is not one. */
const parseLlmConfig = (rawValue: string | undefined): Readonly<{ config: ModelRouterLlmConfig | null; error: string | null }> => {
  const text = rawValue?.trim();
  if (!text) return { config: null, error: null };
  try {
    const value: unknown = JSON.parse(text);
    return isPlainObject(value) ? { config: Object.freeze(value), error: null } : { config: null, error: "it is not a JSON object" };
  } catch {
    return { config: null, error: "it is not valid JSON" };
  }
};

/** The last unreadable model-settings text already reported, so a bad value is logged once, not on every read. */
let reportedUnreadableLlmConfig: string | null = null;

/** The three settings, read on each use so a change applies to the next delegation (design § Ownership Map). */
export const readModelRoutingEnabled = (
  rawValue: string | undefined = appConfigProvider.config.get(MODEL_ROUTING_ENABLED_SETTING_KEY),
): boolean => parseBoolean(rawValue) === true;

/**
 * The router's launch configuration; null until runtime and model are both set (the router is then "not set"). Model
 * settings that cannot be read count as none, with one warning (DESIGN.md rule 7).
 */
export const readModelRouterLaunch = (
  runtime: string | undefined = appConfigProvider.config.get(MODEL_ROUTER_RUNTIME_SETTING_KEY),
  model: string | undefined = appConfigProvider.config.get(MODEL_ROUTER_MODEL_SETTING_KEY),
  llmConfig: string | undefined = appConfigProvider.config.get(MODEL_ROUTER_LLM_CONFIG_SETTING_KEY),
): ModelRouterLaunch | null => {
  const runtimeKind = nonEmpty(runtime);
  const llmModelIdentifier = nonEmpty(model);
  if (!runtimeKind || !llmModelIdentifier) return null;
  const settings = parseLlmConfig(llmConfig);
  if (settings.error && reportedUnreadableLlmConfig !== llmConfig) {
    reportedUnreadableLlmConfig = llmConfig ?? null;
    console.warn(`Model Routing: ${MODEL_ROUTER_LLM_CONFIG_SETTING_KEY} is ignored (${settings.error}); the Model Router runs with no model settings.`);
  }
  return Object.freeze({ runtimeKind, llmModelIdentifier, llmConfig: settings.config });
};

export const normalizeModelRoutingEnabledForPersistence = (rawValue: string): [true, string] | [false, string] => {
  const parsed = parseBoolean(rawValue);
  return parsed === null ? [false, "Model Routing must be true or false."] : [true, String(parsed)];
};

export const normalizeModelRouterRuntimeForPersistence = (rawValue: string): [true, string] | [false, string] => {
  const runtimeKind = rawValue.trim();
  return RUNTIME_KINDS.has(runtimeKind)
    ? [true, runtimeKind]
    : [false, `The Model Router's runtime must be one of ${[...RUNTIME_KINDS].join(", ")}.`];
};

export const normalizeModelRouterModelForPersistence = (rawValue: string): [true, string] | [false, string] => {
  const model = rawValue.trim();
  return model ? [true, model] : [false, "The Model Router's model must not be empty."];
};

/** Empty, or one JSON object (written compact). */
export const normalizeModelRouterLlmConfigForPersistence = (rawValue: string): [true, string] | [false, string] => {
  const { config, error } = parseLlmConfig(rawValue);
  if (error) return [false, `The Model Router's model settings must be a JSON object (${error}).`];
  return [true, config ? JSON.stringify(config) : ""];
};

/** The settings writes the Model Routing page makes (the server settings service owns persistence and validation). */
export type ModelRoutingSettingsWriter = Readonly<{ updateSetting(key: string, value: string): [boolean, string] }>;

export type ModelRoutingSettingsDependencies = Readonly<{
  writer: ModelRoutingSettingsWriter;
  /** The check every agent launch passes (model offered, settings valid for the model; autobyteus-313 REQ-002). */
  validator: Pick<RunModelSelectionValidator, "validate">;
  /** The Model Router agent's workspace, where its run's model catalog is read. */
  workspaceRootPath(): string;
}>;

/** The refusal for a launch the check did not accept. */
const refusalOf = (launch: ModelRouterLaunch, result: RunModelSelectionValidationResult): string =>
  result.kind === "model_unavailable" ? `The model '${launch.llmModelIdentifier}' is not available on ${agentRuntimeName(launch.runtimeKind)}.`
    : result.kind === "schema_unavailable" ? `The settings of model '${launch.llmModelIdentifier}' could not be checked.`
      : result.kind === "invalid" ? `The model settings are invalid: ${result.errors.map((error) => error.message).join("; ")}`
        : "The launch could not be checked.";

/**
 * Writes the switch and the router's launch configuration (DS-005). A launch is checked like any agent launch first,
 * then its three keys are written together (the checked model settings, as the check normalized them): a runtime with
 * another runtime's model, or settings of another model, is never stored.
 */
export class ModelRoutingSettings {
  constructor(private readonly dependencies: ModelRoutingSettingsDependencies) {}

  setEnabled(enabled: boolean): void {
    this.write(MODEL_ROUTING_ENABLED_SETTING_KEY, String(enabled));
  }

  async setRouterLaunch(launch: ModelRouterLaunch): Promise<void> {
    const runtime = normalizeModelRouterRuntimeForPersistence(launch.runtimeKind);
    if (!runtime[0]) throw new Error(runtime[1]);
    const model = normalizeModelRouterModelForPersistence(launch.llmModelIdentifier);
    if (!model[0]) throw new Error(model[1]);
    if (launch.llmConfig !== null && !isPlainObject(launch.llmConfig)) throw new Error("The Model Router's model settings must be a JSON object.");
    const checked = { runtimeKind: runtime[1], llmModelIdentifier: model[1], llmConfig: launch.llmConfig };
    const result = await this.dependencies.validator.validate({
      context: { runtimeKind: checked.runtimeKind as RuntimeKind, currentModelIdentifier: checked.llmModelIdentifier,
        workspaceRootPath: this.dependencies.workspaceRootPath() },
      selection: { llmModelIdentifier: checked.llmModelIdentifier, llmConfig: checked.llmConfig },
    });
    if (result.kind !== "valid") throw new Error(refusalOf(checked, result));
    const settings = result.selection.llmConfig;
    this.write(MODEL_ROUTER_RUNTIME_SETTING_KEY, checked.runtimeKind);
    this.write(MODEL_ROUTER_MODEL_SETTING_KEY, result.selection.llmModelIdentifier);
    this.write(MODEL_ROUTER_LLM_CONFIG_SETTING_KEY, isPlainObject(settings) && Object.keys(settings).length ? JSON.stringify(settings) : "");
  }

  private write(key: string, value: string): void {
    const [ok, message] = this.dependencies.writer.updateSetting(key, value);
    if (!ok) throw new Error(message);
  }
}
