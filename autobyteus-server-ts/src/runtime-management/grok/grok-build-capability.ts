import { spawn } from "node:child_process";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { AcpDiscoveryError, runAcpDiscoveryHandshake } from "../acp/acp-discovery-handshake.js";
import { commandBound, deadlineCause, type CommandBound, type ReadDeadline } from "../read-deadline.js";
import { armProbeTimeBound } from "../probe-time-bound.js";
import { compareRuntimeVersions, extractRuntimeVersion } from "../agent-runtimes/runtime-version.js";
import { grokBuildCommand, grokBuildLaunchProfile, normalizeGrokBuildModels } from "./grok-build-launch-profile.js";

export const GROK_BUILD_MINIMUM_VERSION = "1.0.41";
const REQUIRED_AGENT_HELP_TOKENS = ["stdio", "--model", "--reasoning-effort", "--no-leader"];
/** Each CLI probe's bound (autobyteus-551): the probes start Grok's binary too, slow on a loaded machine. */
const PROBE_TIMEOUT_MS = 10_000;
const PROBE_OUTPUT_LIMIT = 64 * 1024;

/**
 * `timeoutMs`: the bound of each probed command (production callers pass nothing and get the default). `deadline`: the
 * end time of the whole read step the probes belong to; each probe gets its bound cut to the time left.
 */
export type GrokBuildProbeOptions = Readonly<{ timeoutMs?: number; deadline?: ReadDeadline }>;

export type GrokBuildDiagnosticCode =
  | "GROK_CLI_UNAVAILABLE"
  | "GROK_CLI_UNSUPPORTED"
  | "GROK_MODEL_DISCOVERY_TIMEOUT"
  | "GROK_MODEL_DISCOVERY_FAILED"
  | "GROK_MODEL_CATALOG_INVALID";

export type GrokBuildDiagnostic = Readonly<{ code: GrokBuildDiagnosticCode; message: string }>;

const DIAGNOSTICS: Readonly<Record<GrokBuildDiagnosticCode, GrokBuildDiagnostic>> = Object.freeze({
  GROK_CLI_UNAVAILABLE: { code: "GROK_CLI_UNAVAILABLE", message: "Grok CLI is unavailable; install it or set GROK_BUILD_COMMAND and retry." },
  GROK_CLI_UNSUPPORTED: { code: "GROK_CLI_UNSUPPORTED", message: `Grok CLI version or agent mode is unsupported; update to ${GROK_BUILD_MINIMUM_VERSION} or later and retry.` },
  GROK_MODEL_DISCOVERY_TIMEOUT: { code: "GROK_MODEL_DISCOVERY_TIMEOUT", message: "Grok Build model discovery timed out; check the CLI and retry." },
  GROK_MODEL_DISCOVERY_FAILED: { code: "GROK_MODEL_DISCOVERY_FAILED", message: "Grok Build model discovery failed; check Grok authentication or network and retry." },
  GROK_MODEL_CATALOG_INVALID: { code: "GROK_MODEL_CATALOG_INVALID", message: "Grok Build returned an invalid or empty model catalog; check Grok authentication and retry." },
});

/** Classified Grok failure; never carries provider output, paths or credentials. */
export class GrokBuildDiscoveryError extends Error {
  readonly diagnostic: GrokBuildDiagnostic;
  /** `cause`: carries a `DeadlineExceededError` when a read step's deadline ended the discovery. */
  constructor(code: GrokBuildDiagnosticCode, options?: { cause: unknown }) {
    const diagnostic = DIAGNOSTICS[code];
    super(diagnostic.message, options);
    this.name = "GrokBuildDiscoveryError";
    this.diagnostic = diagnostic;
  }
}

export const toGrokBuildDiagnostic = (error: unknown): GrokBuildDiagnostic =>
  error instanceof GrokBuildDiscoveryError ? error.diagnostic : DIAGNOSTICS.GROK_MODEL_DISCOVERY_FAILED;

/** Bounded, non-blocking command probe; provider output never leaves this function. */
const runProbe = (args: readonly string[], bound: CommandBound): Promise<string> => new Promise((resolve, reject) => {
  // A probe that runs past its bound, its own or the step's deadline, is a time-out, never an unsupported CLI (FU-008).
  const timedOut = () => new GrokBuildDiscoveryError("GROK_MODEL_DISCOVERY_TIMEOUT", deadlineCause(bound));
  // The step's deadline has passed: nothing starts.
  if (bound.timeoutMs <= 0) { reject(timedOut()); return; }
  let child: ReturnType<typeof spawn>;
  const command = grokBuildCommand();
  try { child = spawn(command, [...args], { shell: false, stdio: ["ignore", "pipe", "pipe"] }); }
  catch { reject(new GrokBuildDiscoveryError("GROK_CLI_UNAVAILABLE")); return; }
  let output = "";
  let settled = false;
  const finish = (value: string | null, error?: GrokBuildDiscoveryError) => {
    if (settled) return;
    settled = true;
    disarm();
    if (error) { child.kill("SIGKILL"); reject(error); } else resolve(value ?? "");
  };
  // A child that has already exited when the bound fires finishes with its real result.
  const disarm = armProbeTimeBound({
    child, bound, runtime: "grok", command: [command, ...args].join(" "), onTimedOut: () => finish(null, timedOut()),
  });
  const collect = (chunk: Buffer) => {
    output += chunk.toString("utf8");
    if (output.length > PROBE_OUTPUT_LIMIT) finish(null, new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED"));
  };
  child.stdout!.on("data", collect);
  child.stderr!.on("data", collect);
  child.once("error", (error: NodeJS.ErrnoException) => finish(null,
    new GrokBuildDiscoveryError(error.code === "ENOENT" ? "GROK_CLI_UNAVAILABLE" : "GROK_CLI_UNSUPPORTED")));
  child.once("close", (code) => code === 0 ? finish(output) : finish(null, new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED")));
});

/** Version gate plus ACP agent-mode flags; starts no ACP session and no inference. */
export const assertGrokBuildCliSupported = async (options: GrokBuildProbeOptions = {}): Promise<string> => {
  const bound = () => commandBound(options.deadline, options.timeoutMs ?? PROBE_TIMEOUT_MS);
  const version = extractRuntimeVersion(await runProbe(["--version"], bound()));
  if (!version || compareRuntimeVersions(version, GROK_BUILD_MINIMUM_VERSION) < 0) throw new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  const help = await runProbe(["agent", "--help"], bound());
  if (REQUIRED_AGENT_HELP_TOKENS.some((token) => !help.includes(token))) throw new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  return version;
};

export const probeGrokBuildCli = async (
  options: GrokBuildProbeOptions = {},
): Promise<{ available: boolean; diagnostic: GrokBuildDiagnostic | null }> => {
  try {
    await assertGrokBuildCliSupported(options);
    return { available: true, diagnostic: null };
  } catch (error) {
    return { available: false, diagnostic: toGrokBuildDiagnostic(error) };
  }
};

/**
 * Grok announces the catalog it fetched during start-up with this connection-wide notification, the same model state
 * shape as `initialize._meta.modelState` (Grok Build 1.0.92, autobyteus-551 probe P16).
 */
const GROK_MODELS_UPDATE_METHOD = "_x.ai/models/update";
/**
 * How long after `initialize` discovery waits for that announcement. Grok answers `initialize` with its cached or
 * built-in list while its sign-in is expired and announces xAI's list about 0.2-0.5 s later (P15, P16); it gives no sign
 * that no refresh is coming, so a fresh cache costs the whole wait.
 */
const GROK_MODELS_UPDATE_WAIT_MS = 3_000;

const modelStateOf = (initialize: InitializeResponse): unknown =>
  initialize._meta && typeof initialize._meta === "object" ? (initialize._meta as Record<string, unknown>).modelState : undefined;

/**
 * Offered Grok Build models from a fresh `initialize` handshake (no session, no prompt): the catalog Grok announces after
 * its own refresh when it comes within the wait, otherwise the one in its answer. With a deadline, the probes and the
 * handshake share it.
 */
export const discoverGrokBuildModels = async (options: GrokBuildProbeOptions = {}): Promise<ModelInfo[]> => {
  await assertGrokBuildCliSupported(options);
  let models: ModelInfo[];
  try {
    const { initialize, followUp } = await runAcpDiscoveryHandshake(grokBuildLaunchProfile,
      { method: GROK_MODELS_UPDATE_METHOD, withinMs: GROK_MODELS_UPDATE_WAIT_MS }, { deadline: options.deadline });
    models = normalizeGrokBuildModels(followUp ?? modelStateOf(initialize));
  } catch (error) {
    if (error instanceof AcpDiscoveryError) {
      throw new GrokBuildDiscoveryError(error.kind === "timeout" ? "GROK_MODEL_DISCOVERY_TIMEOUT"
        : error.kind === "unavailable" ? "GROK_CLI_UNAVAILABLE" : "GROK_MODEL_DISCOVERY_FAILED", { cause: error });
    }
    throw new GrokBuildDiscoveryError("GROK_MODEL_DISCOVERY_FAILED");
  }
  if (models.length === 0) throw new GrokBuildDiscoveryError("GROK_MODEL_CATALOG_INVALID");
  return models;
};
