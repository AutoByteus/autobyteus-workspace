import { spawn } from "node:child_process";
import { commandTimeout, type ReadDeadline } from "./read-deadline.js";

const COMMAND = process.env.ANTIGRAVITY_CLI_COMMAND?.trim() || "agy";
const REQUIRED_FLAGS = ["--agent", "--new-project", "--add-dir", "--conversation", "--input-format", "--output-format", "--dangerously-skip-permissions"];
const SHORT_PROBE_TIMEOUT_MS = 3_000;
const MODELS_TIMEOUT_MS = 15_000;
const SHORT_OUTPUT_LIMIT = 64 * 1024;
const MODELS_OUTPUT_LIMIT = 1024 * 1024;

export type AgyDiscoveryDiagnosticCode =
  | "AGY_CLI_UNAVAILABLE"
  | "AGY_CLI_UNSUPPORTED"
  | "AGY_SIGN_IN_REQUIRED"
  | "AGY_MODEL_DISCOVERY_TIMEOUT"
  | "AGY_MODEL_DISCOVERY_FAILED"
  | "AGY_MODEL_CATALOG_INVALID";

export type AgyDiscoveryDiagnostic = Readonly<{ code: AgyDiscoveryDiagnosticCode; message: string }>;

const DIAGNOSTICS: Readonly<Record<AgyDiscoveryDiagnosticCode, AgyDiscoveryDiagnostic>> = Object.freeze({
  AGY_CLI_UNAVAILABLE: { code: "AGY_CLI_UNAVAILABLE", message: "Antigravity CLI is not installed or not on this node's PATH. Install it, or set ANTIGRAVITY_CLI_COMMAND, then try again." },
  AGY_CLI_UNSUPPORTED: { code: "AGY_CLI_UNSUPPORTED", message: "Antigravity CLI is too old for AutoByteus (required options are missing). Run `agy update`, then try again." },
  AGY_SIGN_IN_REQUIRED: { code: "AGY_SIGN_IN_REQUIRED", message: "Not signed in on this node. Run `agy` to sign in." },
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

/**
 * Known `agy` sign-in phrasings in a failed command's output, e.g. 1.3.3 `agy models`:
 * "Please sign in to view available models. Launch the CLI without arguments to sign in."
 * Unrecognised wording stays the generic discovery failure.
 */
const AGY_SIGN_IN_PATTERN = /\b(?:please (?:sign|log) ?in|not (?:signed|logged) ?in(?:to)?|(?:sign|log)[- ]?in required)\b/i;

/**
 * Child I/O is bounded and nonblocking; provider output never becomes a user-facing error.
 * A failed command's bounded output only selects a fixed diagnostic code.
 */
const runCommand = (args: readonly string[], timeoutMs: number, outputLimit: number): Promise<CommandOutput> =>
  new Promise((resolve, reject) => {
    // The step's deadline has passed: nothing starts.
    if (timeoutMs <= 0) { reject(new AgyDiscoveryError("AGY_MODEL_DISCOVERY_TIMEOUT")); return; }
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
    child.once("close", (code) => {
      const output = { stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") };
      if (code === 0) return finish(output);
      finish(undefined, new AgyDiscoveryError(AGY_SIGN_IN_PATTERN.test(output.stdout + "\n" + output.stderr)
        ? "AGY_SIGN_IN_REQUIRED" : "AGY_MODEL_DISCOVERY_FAILED"));
    });
  });

/**
 * `agy --help` (required options), then `agy models`. `deadline`: the end time of the whole read step; both commands
 * share it (each gets its usual bound cut to the time left). Without it, the usual bounds.
 */
export const listAntigravityModels = async (
  options: Readonly<{ deadline?: ReadDeadline }> = {},
): Promise<{ id: string; name: string }[]> => {
  const help = await runCommand(["--help"], commandTimeout(options.deadline, SHORT_PROBE_TIMEOUT_MS), SHORT_OUTPUT_LIMIT);
  if (REQUIRED_FLAGS.some((flag) => !(help.stdout + help.stderr).includes(flag)))
    throw new AgyDiscoveryError("AGY_CLI_UNSUPPORTED");
  const result = await runCommand(["models"], commandTimeout(options.deadline, MODELS_TIMEOUT_MS), MODELS_OUTPUT_LIMIT);
  const models = result.stdout.split(/\r?\n/).map((line) => {
    const [id, name] = line.split("\t", 2);
    return id && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) && name ? { id, name } : null;
  }).filter((model): model is { id: string; name: string } => model !== null);
  if (models.length === 0) throw new AgyDiscoveryError("AGY_MODEL_CATALOG_INVALID");
  return models;
};

/** First AGY CLI version proven to stream one `checkpoint` DONE step per automatic compaction. */
export const AGY_COMPACTION_DETECTION_MIN_VERSION = "1.2.16";

const parseVersion = (version: string | null): number[] | null => {
  const match = version ? /(\d+)\.(\d+)\.(\d+)/.exec(version) : null;
  return match ? match.slice(1, 4).map(Number) : null;
};

export const isAgyCompactionDetectionSupported = (version: string | null): boolean => {
  const actual = parseVersion(version);
  const minimum = parseVersion(AGY_COMPACTION_DETECTION_MIN_VERSION)!;
  if (!actual) return false;
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index]! !== minimum[index]!) return actual[index]! > minimum[index]!;
  }
  return true;
};

let cachedVersion: string | null = null;

/**
 * `agy --version` (bounded). A read version is cached for the server process; a failed read
 * returns null without caching, so the next run probes again. Never throws.
 */
export const readAntigravityCliVersion = async (): Promise<string | null> => {
  if (cachedVersion) return cachedVersion;
  try {
    const output = await runCommand(["--version"], SHORT_PROBE_TIMEOUT_MS, SHORT_OUTPUT_LIMIT);
    cachedVersion = output.stdout.trim() || null;
  } catch {
    return null;
  }
  return cachedVersion;
};
