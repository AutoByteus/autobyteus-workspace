import { spawn } from "node:child_process";

const COMMAND = process.env.ANTIGRAVITY_CLI_COMMAND?.trim() || "agy";
const REQUIRED_FLAGS = ["--agent", "--new-project", "--add-dir", "--conversation", "--input-format", "--output-format", "--dangerously-skip-permissions"];
const SHORT_PROBE_TIMEOUT_MS = 3_000;
const MODELS_TIMEOUT_MS = 15_000;
const SHORT_OUTPUT_LIMIT = 64 * 1024;
const MODELS_OUTPUT_LIMIT = 1024 * 1024;

export type AgyDiscoveryDiagnosticCode =
  | "AGY_CLI_UNAVAILABLE"
  | "AGY_CLI_UNSUPPORTED"
  | "AGY_MODEL_DISCOVERY_TIMEOUT"
  | "AGY_MODEL_DISCOVERY_FAILED"
  | "AGY_MODEL_CATALOG_INVALID";

export type AgyDiscoveryDiagnostic = Readonly<{ code: AgyDiscoveryDiagnosticCode; message: string }>;

const DIAGNOSTICS: Readonly<Record<AgyDiscoveryDiagnosticCode, AgyDiscoveryDiagnostic>> = Object.freeze({
  AGY_CLI_UNAVAILABLE: { code: "AGY_CLI_UNAVAILABLE", message: "Antigravity CLI is unavailable; install or configure it and retry." },
  AGY_CLI_UNSUPPORTED: { code: "AGY_CLI_UNSUPPORTED", message: "Antigravity CLI version or required features are unsupported; update the CLI and retry." },
  AGY_MODEL_DISCOVERY_TIMEOUT: { code: "AGY_MODEL_DISCOVERY_TIMEOUT", message: "Antigravity model discovery timed out; check the CLI and retry." },
  AGY_MODEL_DISCOVERY_FAILED: { code: "AGY_MODEL_DISCOVERY_FAILED", message: "Antigravity model discovery failed; check authentication or network and retry." },
  AGY_MODEL_CATALOG_INVALID: { code: "AGY_MODEL_CATALOG_INVALID", message: "Antigravity CLI returned an invalid or empty model catalog; check authentication and network and retry." },
});

export class AgyDiscoveryError extends Error {
  readonly diagnostic: AgyDiscoveryDiagnostic;
  constructor(code: AgyDiscoveryDiagnosticCode) {
    const diagnostic = DIAGNOSTICS[code];
    super(diagnostic.message);
    this.name = "AgyDiscoveryError";
    this.diagnostic = diagnostic;
  }
}

export const toAgyDiscoveryDiagnostic = (error: unknown): AgyDiscoveryDiagnostic =>
  error instanceof AgyDiscoveryError ? error.diagnostic : DIAGNOSTICS.AGY_MODEL_DISCOVERY_FAILED;

export const antigravityCommand = (): string => COMMAND;

type CommandOutput = Readonly<{ stdout: string; stderr: string }>;

/** Child I/O is bounded and nonblocking; provider stderr never becomes a user-facing error. */
const runCommand = (args: readonly string[], timeoutMs: number, outputLimit: number): Promise<CommandOutput> =>
  new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try { child = spawn(COMMAND, [...args], { shell: false, stdio: ["ignore", "pipe", "pipe"] }); }
    catch { reject(new AgyDiscoveryError("AGY_MODEL_DISCOVERY_FAILED")); return; }
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    const finish = (output?: CommandOutput, error?: AgyDiscoveryError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        child.kill("SIGKILL");
        reject(error);
      } else resolve(output!);
    };
    const timer = setTimeout(() => finish(undefined, new AgyDiscoveryError("AGY_MODEL_DISCOVERY_TIMEOUT")), timeoutMs);
    child.stdout!.on("data", (chunk: Buffer) => {
      if (settled) return;
      if (stdout.length + chunk.length > outputLimit) return finish(undefined, new AgyDiscoveryError("AGY_MODEL_DISCOVERY_FAILED"));
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      if (settled) return;
      if (stderr.length + chunk.length > outputLimit) return finish(undefined, new AgyDiscoveryError("AGY_MODEL_DISCOVERY_FAILED"));
      stderr = Buffer.concat([stderr, chunk]);
    });
    child.once("error", (error: NodeJS.ErrnoException) => finish(undefined,
      new AgyDiscoveryError(error.code === "ENOENT" ? "AGY_CLI_UNAVAILABLE" : "AGY_MODEL_DISCOVERY_FAILED")));
    child.once("close", (code) => finish(code === 0
      ? { stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") }
      : undefined, code === 0 ? undefined : new AgyDiscoveryError("AGY_MODEL_DISCOVERY_FAILED")));
  });

export const probeAntigravityCli = async (): Promise<{
  available: boolean;
  reason: string | null;
  diagnostic: AgyDiscoveryDiagnostic | null;
}> => {
  try {
    const version = await runCommand(["--version"], SHORT_PROBE_TIMEOUT_MS, SHORT_OUTPUT_LIMIT);
    const match = /\b(\d+)\.(\d+)\.(\d+)\b/.exec(version.stdout);
    if (!match || Number(match[1]) !== 1 || Number(match[2]) !== 2 || Number(match[3]) < 10)
      throw new AgyDiscoveryError("AGY_CLI_UNSUPPORTED");
    const help = await runCommand(["--help"], SHORT_PROBE_TIMEOUT_MS, SHORT_OUTPUT_LIMIT);
    if (REQUIRED_FLAGS.some((flag) => !(help.stdout + help.stderr).includes(flag)))
      throw new AgyDiscoveryError("AGY_CLI_UNSUPPORTED");
    return { available: true, reason: null, diagnostic: null };
  } catch (error) {
    const diagnostic = toAgyDiscoveryDiagnostic(error);
    return { available: false, reason: diagnostic.message, diagnostic };
  }
};

export const listAntigravityModels = async (): Promise<{ id: string; name: string }[]> => {
  const capability = await probeAntigravityCli();
  if (!capability.available) throw new AgyDiscoveryError(capability.diagnostic?.code ?? "AGY_MODEL_DISCOVERY_FAILED");
  const result = await runCommand(["models"], MODELS_TIMEOUT_MS, MODELS_OUTPUT_LIMIT);
  const models = result.stdout.split(/\r?\n/).map((line) => {
    const [id, name] = line.split("\t", 2);
    return id && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) && name ? { id, name } : null;
  }).filter((model): model is { id: string; name: string } => model !== null);
  if (models.length === 0) throw new AgyDiscoveryError("AGY_MODEL_CATALOG_INVALID");
  return models;
};
