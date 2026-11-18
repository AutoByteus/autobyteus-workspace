import type { SessionConfigOption, SessionConfigSelectOption } from "@agentclientprotocol/sdk";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { getProcessProviderRelayAccess } from "../../credential-proxy/provider-relays/provider-relay-process-access.js";
import type { ProviderRelayAccess } from "../../credential-proxy/provider-relays/provider-relay-access.js";
import { AcpDiscoveryError, runAcpSessionOptionsDiscovery } from "../acp/acp-discovery-handshake.js";
import type { AcpAgentLaunchProfile } from "../acp/acp-agent-launch-profile.js";
import type { ReadDeadline } from "../read-deadline.js";
import { readRuntimeVersion } from "../agent-runtimes/runtime-version.js";
import { getDeepSeekHarnessHome, type DeepSeekHarnessHome } from "./deepseek-harness-home.js";
import {
  DEEPSEEK_HARNESS_NPM_PACKAGE,
  DEEPSEEK_HARNESS_PROVIDER_NAME,
  DEEPSEEK_HARNESS_RELAY_ID,
  DSH_PROVIDER_ROUTE,
  deepSeekHarnessCommand,
} from "./deepseek-harness-identity.js";
import { deepSeekHarnessLaunchProfile } from "./deepseek-harness-launch-profile.js";

const MODEL_CONFIG_ID = "model";
const REASONING_CONFIG_ID = "reasoning_effort";

export type DeepSeekHarnessDiagnosticCode =
  | "DEEPSEEK_HARNESS_RELAY_UNAVAILABLE"
  | "DEEPSEEK_HARNESS_RELAY_NOT_READY"
  | "DEEPSEEK_HARNESS_CLI_UNAVAILABLE"
  | "DEEPSEEK_HARNESS_DISCOVERY_FAILED"
  | "DEEPSEEK_HARNESS_CATALOG_INVALID";

export type DeepSeekHarnessDiagnostic = Readonly<{ code: DeepSeekHarnessDiagnosticCode; message: string }>;

/** The availability reason in a host without the credential proxy (DEC-020). */
export const DEEPSEEK_HARNESS_RELAY_UNAVAILABLE_MESSAGE =
  "DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run.";

const DIAGNOSTICS: Readonly<Record<DeepSeekHarnessDiagnosticCode, DeepSeekHarnessDiagnostic>> = Object.freeze({
  DEEPSEEK_HARNESS_RELAY_UNAVAILABLE: { code: "DEEPSEEK_HARNESS_RELAY_UNAVAILABLE", message: DEEPSEEK_HARNESS_RELAY_UNAVAILABLE_MESSAGE },
  DEEPSEEK_HARNESS_RELAY_NOT_READY: { code: "DEEPSEEK_HARNESS_RELAY_NOT_READY", message: "The credential proxy is starting; try again." },
  DEEPSEEK_HARNESS_CLI_UNAVAILABLE: {
    code: "DEEPSEEK_HARNESS_CLI_UNAVAILABLE",
    message: `DeepSeek Harness is unavailable; install it with npm install -g ${DEEPSEEK_HARNESS_NPM_PACKAGE} (Node.js 24.9 or later) or set DEEPSEEK_HARNESS_COMMAND and retry.`,
  },
  DEEPSEEK_HARNESS_DISCOVERY_FAILED: { code: "DEEPSEEK_HARNESS_DISCOVERY_FAILED", message: "DeepSeek Harness model discovery failed or timed out; check the dsh command and retry." },
  DEEPSEEK_HARNESS_CATALOG_INVALID: { code: "DEEPSEEK_HARNESS_CATALOG_INVALID", message: "DeepSeek Harness offered no DeepSeek models; check the dsh version and retry." },
});

/** Classified dsh failure; never carries dsh output, paths or credentials. */
export class DeepSeekHarnessDiscoveryError extends Error {
  readonly diagnostic: DeepSeekHarnessDiagnostic;
  constructor(code: DeepSeekHarnessDiagnosticCode, options?: { cause: unknown }) {
    const diagnostic = DIAGNOSTICS[code];
    super(diagnostic.message, options);
    this.name = "DeepSeekHarnessDiscoveryError";
    this.diagnostic = diagnostic;
  }
}

export const toDeepSeekHarnessDiagnostic = (error: unknown): DeepSeekHarnessDiagnostic =>
  error instanceof DeepSeekHarnessDiscoveryError ? error.diagnostic : DIAGNOSTICS.DEEPSEEK_HARNESS_DISCOVERY_FAILED;

export type DeepSeekHarnessProbeOptions = Readonly<{ deadline?: ReadDeadline }>;

/** `dsh --version`, bounded; starts no ACP session and no inference. */
export const probeDeepSeekHarnessCli = async (
  options: DeepSeekHarnessProbeOptions = {},
): Promise<{ available: boolean; diagnostic: DeepSeekHarnessDiagnostic | null }> => {
  const version = await readRuntimeVersion(deepSeekHarnessCommand(), { deadline: options.deadline });
  return version
    ? { available: true, diagnostic: null }
    : { available: false, diagnostic: DIAGNOSTICS.DEEPSEEK_HARNESS_CLI_UNAVAILABLE };
};

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** dsh's model option value: the JSON pair `[route, model]` (dsh `model-control.ts`). */
const parseModelValue = (value: unknown): Readonly<{ route: string; model: string }> | null => {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === "string" && typeof parsed[1] === "string"
      ? { route: parsed[0], model: parsed[1] } : null;
  } catch {
    return null;
  }
};

const selectOption = (options: readonly SessionConfigOption[], id: string) => {
  const option = options.find((candidate) => candidate.id === id);
  return option && option.type === "select" ? option : null;
};

/** The flat entries of a select option (dsh groups its model entries by route). */
const selectEntries = (option: Extract<SessionConfigOption, { type: "select" }>): SessionConfigSelectOption[] =>
  (option.options as readonly unknown[]).flatMap((entry) => {
    const record = entry as Partial<SessionConfigSelectOption> & { options?: SessionConfigSelectOption[] };
    return Array.isArray(record.options) ? record.options : [record as SessionConfigSelectOption];
  });

/** dsh's model option entries on its official DeepSeek route (DEC-013). */
export const deepSeekHarnessModelEntries = (options: readonly SessionConfigOption[]) => {
  const option = selectOption(options, MODEL_CONFIG_ID);
  if (!option) return [];
  return selectEntries(option).flatMap((entry) => {
    const parsed = parseModelValue(entry.value);
    return parsed && parsed.route === DSH_PROVIDER_ROUTE
      ? [{ value: entry.value, model: parsed.model, name: nonEmpty(entry.name), description: nonEmpty(entry.description) }]
      : [];
  });
};

const reasoningSchema = (options: readonly SessionConfigOption[]): Record<string, unknown> | undefined => {
  const option = selectOption(options, REASONING_CONFIG_ID);
  if (!option) return undefined;
  const values = selectEntries(option).map((entry) => nonEmpty(entry.value)).filter((value): value is string => !!value);
  if (values.length === 0) return undefined;
  const current = nonEmpty(option.currentValue);
  return new ParameterSchema([new ParameterDefinition({
    name: "reasoning_effort",
    type: ParameterType.ENUM,
    description: "DeepSeek Harness reasoning effort.",
    required: false,
    defaultValue: current && values.includes(current) ? current : values[0],
    enumValues: values,
  })]).toJsonSchemaDict();
};

/** dsh's offered DeepSeek models with the session's reasoning-effort choices (the same for each DeepSeek model). */
export const normalizeDeepSeekHarnessModels = (options: readonly SessionConfigOption[]): ModelInfo[] => {
  const schema = reasoningSchema(options);
  const models: ModelInfo[] = [];
  for (const entry of deepSeekHarnessModelEntries(options)) {
    const id = entry.model;
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) || models.some((model) => model.model_identifier === id)) continue;
    models.push({
      model_identifier: id,
      display_name: entry.name ?? id,
      description: entry.description,
      value: id,
      canonical_name: id,
      provider_id: LLMProvider.DEEPSEEK,
      provider_name: DEEPSEEK_HARNESS_PROVIDER_NAME,
      provider_type: LLMProvider.DEEPSEEK,
      runtime: LLMRuntime.API,
      config_schema: schema,
      max_context_tokens: null,
      active_context_tokens: null,
      max_input_tokens: null,
      max_output_tokens: null,
      resolved_model_metadata: null,
    });
  }
  return models;
};

/**
 * dsh's offered models from a short dsh process in the home's discovery folder (DS-005): its one discovery session is
 * resumed (or created) and closed; no prompt, no model call. Needs the process's provider relay (DEC-020); while the
 * proxy is not listening yet, a transient diagnostic that nothing caches.
 */
export const discoverDeepSeekHarnessModels = async (options: DeepSeekHarnessProbeOptions & Readonly<{
  relayAccess?: ProviderRelayAccess | null;
  home?: DeepSeekHarnessHome;
  launchProfile?: AcpAgentLaunchProfile;
}> = {}): Promise<ModelInfo[]> => {
  const relayAccess = options.relayAccess === undefined ? getProcessProviderRelayAccess() : options.relayAccess;
  if (!relayAccess) throw new DeepSeekHarnessDiscoveryError("DEEPSEEK_HARNESS_RELAY_UNAVAILABLE");
  let relayBaseUrl: string;
  try {
    relayBaseUrl = relayAccess.relayBaseUrl(DEEPSEEK_HARNESS_RELAY_ID);
  } catch (error) {
    throw new DeepSeekHarnessDiscoveryError("DEEPSEEK_HARNESS_RELAY_NOT_READY", { cause: error });
  }
  const probe = await probeDeepSeekHarnessCli({ deadline: options.deadline });
  if (!probe.available) throw new DeepSeekHarnessDiscoveryError("DEEPSEEK_HARNESS_CLI_UNAVAILABLE");
  const home = options.home ?? getDeepSeekHarnessHome();
  let configOptions: SessionConfigOption[];
  try {
    const cwd = await home.ensureDiscoveryDir();
    configOptions = await runAcpSessionOptionsDiscovery(options.launchProfile ?? deepSeekHarnessLaunchProfile,
      { cwd, relayBaseUrl }, { deadline: options.deadline });
  } catch (error) {
    throw new DeepSeekHarnessDiscoveryError(error instanceof AcpDiscoveryError && error.kind === "unavailable"
      ? "DEEPSEEK_HARNESS_CLI_UNAVAILABLE" : "DEEPSEEK_HARNESS_DISCOVERY_FAILED", { cause: error });
  }
  const models = normalizeDeepSeekHarnessModels(configOptions);
  if (models.length === 0) throw new DeepSeekHarnessDiscoveryError("DEEPSEEK_HARNESS_CATALOG_INVALID");
  return models;
};
