import { spawn } from "node:child_process";

export const SHORT_COMMAND_TIMEOUT_MS = 10_000;
const OUTPUT_LIMIT = 1024 * 1024;

export type RuntimeCommandResult = Readonly<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /** Spawn failure (for example ENOENT) or the time-out; null when the command ran to its exit. */
  error: (Error & { code?: string }) | null;
}>;

/**
 * Runs one short runtime command (version, sign-in status, update check) with the server's
 * environment and a time-out. Never throws; its output stays with the caller and is never logged.
 */
export const runRuntimeCommand = (
  command: string,
  args: readonly string[],
  timeoutMs = SHORT_COMMAND_TIMEOUT_MS,
): Promise<RuntimeCommandResult> => new Promise((resolve) => {
  let stdout = "";
  let stderr = "";
  let settled = false;
  let child: ReturnType<typeof spawn>;
  const finish = (result: RuntimeCommandResult): void => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(result);
  };
  const timer = setTimeout(() => {
    child?.kill("SIGKILL");
    finish({ exitCode: null, stdout, stderr, error: new Error(`Command timed out after ${timeoutMs}ms.`) });
  }, timeoutMs);
  try {
    child = spawn(command, [...args], { env: process.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    finish({ exitCode: null, stdout, stderr, error: error as Error });
    return;
  }
  child.stdout!.on("data", (chunk: Buffer) => {
    if (stdout.length < OUTPUT_LIMIT) stdout += chunk.toString("utf8");
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    if (stderr.length < OUTPUT_LIMIT) stderr += chunk.toString("utf8");
  });
  child.once("error", (error) => finish({ exitCode: null, stdout, stderr, error }));
  child.once("close", (exitCode) => finish({ exitCode, stdout, stderr, error: null }));
});
