import { commandTimeout, type ReadDeadline } from "../read-deadline.js";
import { runRuntimeCommand, SHORT_COMMAND_TIMEOUT_MS } from "./runtime-command-runner.js";

/** The first `x.y.z` in a runtime's version text, e.g. "2.1.302 (Claude Code)" or "codex-cli 0.163.0". */
export const extractRuntimeVersion = (text: string | null | undefined): string | null =>
  text ? /(\d+)\.(\d+)\.(\d+)/.exec(text)?.[0] ?? null : null;

/** Compares two `x.y.z` versions numerically; negative when `left` is older. */
export const compareRuntimeVersions = (left: string, right: string): number => {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

/**
 * `<executable> --version`, read fresh each time; null when it does not run or prints no version. `deadline`: the end
 * time of the read step it belongs to; without it, the usual bound.
 */
export const readRuntimeVersion = async (
  executable: string,
  options: Readonly<{ deadline?: ReadDeadline }> = {},
): Promise<string | null> => {
  const result = await runRuntimeCommand(executable, ["--version"], commandTimeout(options.deadline, SHORT_COMMAND_TIMEOUT_MS));
  return result.exitCode === 0 ? extractRuntimeVersion(`${result.stdout}\n${result.stderr}`) : null;
};
