import { appConfigProvider } from "../config/app-config-provider.js";
import { RuntimeKind } from "../runtime-management/runtime-kind-enum.js";

/** Model Routing on this node (REQ-002): `true` turns it on; off by default. */
export const MODEL_ROUTING_ENABLED_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTING_ENABLED";
/** The Model Router agent's runtime (REQ-003), set on the Model Routing page. */
export const MODEL_ROUTER_RUNTIME_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTER_RUNTIME";
/** The Model Router agent's model on that runtime. */
export const MODEL_ROUTER_MODEL_SETTING_KEY = "AUTOBYTEUS_MODEL_ROUTER_MODEL";

/** The Model Router agent's launch as the page set it. */
export type ModelRouterLaunch = Readonly<{ runtimeKind: string; llmModelIdentifier: string }>;

const RUNTIME_KINDS: ReadonlySet<string> = new Set(Object.values(RuntimeKind));

const parseBoolean = (rawValue: string | undefined): boolean | null => {
  const normalized = rawValue?.trim().toLowerCase();
  return normalized === "true" ? true : normalized === "false" ? false : null;
};
const nonEmpty = (rawValue: string | undefined): string | null => rawValue?.trim() || null;

/** The three settings, read on each use so a change applies to the next delegation (design § Ownership Map). */
export const readModelRoutingEnabled = (
  rawValue: string | undefined = appConfigProvider.config.get(MODEL_ROUTING_ENABLED_SETTING_KEY),
): boolean => parseBoolean(rawValue) === true;

/** The router's runtime and model; null until both are set (the router is then "not set"). */
export const readModelRouterLaunch = (
  runtime: string | undefined = appConfigProvider.config.get(MODEL_ROUTER_RUNTIME_SETTING_KEY),
  model: string | undefined = appConfigProvider.config.get(MODEL_ROUTER_MODEL_SETTING_KEY),
): ModelRouterLaunch | null => {
  const runtimeKind = nonEmpty(runtime);
  const llmModelIdentifier = nonEmpty(model);
  return runtimeKind && llmModelIdentifier ? Object.freeze({ runtimeKind, llmModelIdentifier }) : null;
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

/** The settings writes the Model Routing page makes (the server settings service owns persistence and validation). */
export type ModelRoutingSettingsWriter = Readonly<{ updateSetting(key: string, value: string): [boolean, string] }>;

/**
 * Writes the switch and the router's launch (DS-005). The two launch keys are written together: a runtime with
 * another runtime's model is never stored.
 */
export class ModelRoutingSettings {
  constructor(private readonly writer: ModelRoutingSettingsWriter) {}

  setEnabled(enabled: boolean): void {
    this.write(MODEL_ROUTING_ENABLED_SETTING_KEY, String(enabled));
  }

  setRouterLaunch(launch: ModelRouterLaunch): void {
    const runtime = normalizeModelRouterRuntimeForPersistence(launch.runtimeKind);
    if (!runtime[0]) throw new Error(runtime[1]);
    const model = normalizeModelRouterModelForPersistence(launch.llmModelIdentifier);
    if (!model[0]) throw new Error(model[1]);
    this.write(MODEL_ROUTER_RUNTIME_SETTING_KEY, runtime[1]);
    this.write(MODEL_ROUTER_MODEL_SETTING_KEY, model[1]);
  }

  private write(key: string, value: string): void {
    const [ok, message] = this.writer.updateSetting(key, value);
    if (!ok) throw new Error(message);
  }
}
