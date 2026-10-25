import { spawn } from "node:child_process";
import { DeadlineExceededError, type CommandBound } from "../read-deadline.js";

export const SHORT_COMMAND_TIMEOUT_MS = 10_000;
const OUTPUT_LIMIT = 1024 * 1024;

export type RuntimeCommandResult = Readonly<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /**
   * Spawn failure (for example ENOENT) or the time-out; null when the command ran to its exit. A time-out set by a
   * read step's deadline is a `DeadlineExceededError`.
   */
  error: (Error & { code?: string }) | null;
}>;

/**
 * Runs one short runtime command (version, sign-in status, update check) with the server's
 * environment and a time-out. Never throws; its output stays with the caller and is never logged.
 */
export const runRuntimeCommand = (
  command: string,
  args: readonly string[],
  timeout: number | CommandBound = SHORT_COMMAND_TIMEOUT_MS,
): Promise<RuntimeCommandResult> => new Promise((resolve) => {
  const { timeoutMs, byDeadline } = typeof timeout === "number" ? { timeoutMs: timeout, byDeadline: false } : timeout;
  const timedOut = (): Error => byDeadline ? new DeadlineExceededError() : new Error(`Command timed out after ${timeoutMs}ms.`);
  // A read step whose deadline has passed starts nothing (its bound is 0).
  if (timeoutMs <= 0) {
    resolve({ exitCode: null, stdout: "", stderr: "", error: timedOut() });
    return;
  }
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
    finish({ exitCode: null, stdout, stderr, error: timedOut() });
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
