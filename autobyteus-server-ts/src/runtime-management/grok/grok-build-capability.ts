import { spawn } from "node:child_process";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { AcpDiscoveryError, runAcpDiscoveryHandshake } from "../acp/acp-discovery-handshake.js";
import { commandBound, deadlineCause, type CommandBound, type ReadDeadline } from "../read-deadline.js";
import { grokBuildCommand, grokBuildLaunchProfile } from "./grok-build-launch-profile.js";

export const GROK_BUILD_MINIMUM_VERSION = "1.0.41";
const REQUIRED_AGENT_HELP_TOKENS = ["stdio", "--model", "--reasoning-effort", "--no-leader"];
const PROBE_TIMEOUT_MS = 3_000;
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

const compareVersions = (left: string, right: string): number => {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0);
  }
  return 0;
};

/** Bounded, non-blocking command probe; provider output never leaves this function. */
const runProbe = (args: readonly string[], bound: CommandBound): Promise<string> => new Promise((resolve, reject) => {
  // A probe ended by its own bound reads as an unsupported CLI (as before); one ended by the step's deadline, as a time-out.
  const timedOut = () => bound.byDeadline
    ? new GrokBuildDiscoveryError("GROK_MODEL_DISCOVERY_TIMEOUT", deadlineCause(bound))
    : new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  // The step's deadline has passed: nothing starts.
  if (bound.timeoutMs <= 0) { reject(timedOut()); return; }
  let child: ReturnType<typeof spawn>;
  try { child = spawn(grokBuildCommand(), [...args], { shell: false, stdio: ["ignore", "pipe", "pipe"] }); }
  catch { reject(new GrokBuildDiscoveryError("GROK_CLI_UNAVAILABLE")); return; }
  let output = "";
  let settled = false;
  const finish = (value: string | null, error?: GrokBuildDiscoveryError) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (error) { child.kill("SIGKILL"); reject(error); } else resolve(value ?? "");
  };
  const timer = setTimeout(() => finish(null, timedOut()), bound.timeoutMs);
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
  const match = /\b(\d+\.\d+\.\d+)\b/.exec(await runProbe(["--version"], bound()));
  if (!match || compareVersions(match[1]!, GROK_BUILD_MINIMUM_VERSION) < 0) throw new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  const help = await runProbe(["agent", "--help"], bound());
  if (REQUIRED_AGENT_HELP_TOKENS.some((token) => !help.includes(token))) throw new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  return match[1]!;
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
 * Offered Grok Build models from a fresh `initialize` handshake (no session, no prompt). With a deadline, the probes
 * and the handshake share it.
 */
export const discoverGrokBuildModels = async (options: GrokBuildProbeOptions = {}): Promise<ModelInfo[]> => {
  await assertGrokBuildCliSupported(options);
  let models: ModelInfo[];
  try {
    models = grokBuildLaunchProfile.normalizeModels(
      await runAcpDiscoveryHandshake(grokBuildLaunchProfile, { deadline: options.deadline }));
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
