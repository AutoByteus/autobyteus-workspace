import { spawn } from "node:child_process";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { AcpDiscoveryError, runAcpDiscoveryHandshake } from "../acp/acp-discovery-handshake.js";
import { grokBuildCommand, grokBuildLaunchProfile } from "./grok-build-launch-profile.js";

export const GROK_BUILD_MINIMUM_VERSION = "1.0.41";
const REQUIRED_AGENT_HELP_TOKENS = ["stdio", "--model", "--reasoning-effort", "--no-leader"];
const PROBE_TIMEOUT_MS = 3_000;
const PROBE_OUTPUT_LIMIT = 64 * 1024;

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
  constructor(code: GrokBuildDiagnosticCode) {
    const diagnostic = DIAGNOSTICS[code];
    super(diagnostic.message);
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
const runProbe = (args: readonly string[]): Promise<string> => new Promise((resolve, reject) => {
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
  const timer = setTimeout(() => finish(null, new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED")), PROBE_TIMEOUT_MS);
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
export const assertGrokBuildCliSupported = async (): Promise<string> => {
  const match = /\b(\d+\.\d+\.\d+)\b/.exec(await runProbe(["--version"]));
  if (!match || compareVersions(match[1]!, GROK_BUILD_MINIMUM_VERSION) < 0) throw new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  const help = await runProbe(["agent", "--help"]);
  if (REQUIRED_AGENT_HELP_TOKENS.some((token) => !help.includes(token))) throw new GrokBuildDiscoveryError("GROK_CLI_UNSUPPORTED");
  return match[1]!;
};

export const probeGrokBuildCli = async (): Promise<{ available: boolean; diagnostic: GrokBuildDiagnostic | null }> => {
  try {
    await assertGrokBuildCliSupported();
    return { available: true, diagnostic: null };
  } catch (error) {
    return { available: false, diagnostic: toGrokBuildDiagnostic(error) };
  }
};

/** Offered Grok Build models from a fresh `initialize` handshake (no session, no prompt). */
export const discoverGrokBuildModels = async (): Promise<ModelInfo[]> => {
  await assertGrokBuildCliSupported();
  let models: ModelInfo[];
  try {
    models = grokBuildLaunchProfile.normalizeModels(await runAcpDiscoveryHandshake(grokBuildLaunchProfile));
  } catch (error) {
    if (error instanceof AcpDiscoveryError) {
      throw new GrokBuildDiscoveryError(error.kind === "timeout" ? "GROK_MODEL_DISCOVERY_TIMEOUT"
        : error.kind === "unavailable" ? "GROK_CLI_UNAVAILABLE" : "GROK_MODEL_DISCOVERY_FAILED");
    }
    throw new GrokBuildDiscoveryError("GROK_MODEL_DISCOVERY_FAILED");
  }
  if (models.length === 0) throw new GrokBuildDiscoveryError("GROK_MODEL_CATALOG_INVALID");
  return models;
};
