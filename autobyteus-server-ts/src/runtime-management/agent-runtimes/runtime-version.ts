import { commandTimeout, type ReadDeadline } from "../read-deadline.js";
import { runRuntimeCommand, SHORT_COMMAND_TIMEOUT_MS } from "./runtime-command-runner.js";

/** `x.y.z` with an optional SemVer prerelease (`-rc.1`); build metadata (`+…`) is not part of a runtime version. */
const RUNTIME_VERSION = /(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?/;
const NUMERIC_IDENTIFIER = /^\d+$/;

/**
 * The first full runtime version in a runtime's version text: `x.y.z` and its prerelease, without build metadata, e.g.
 * "0.2.2-rc.1", "2.1.302" from "2.1.302 (Claude Code)", "0.163.0" from "codex-cli 0.163.0".
 */
export const extractRuntimeVersion = (text: string | null | undefined): string | null =>
  text ? RUNTIME_VERSION.exec(text)?.[0] ?? null : null;

const parseRuntimeVersion = (version: string): Readonly<{ core: number[]; prerelease: string[] }> => {
  const match = RUNTIME_VERSION.exec(version);
  if (!match) throw new Error(`Not a runtime version: ${JSON.stringify(version)}.`);
  return { core: match.slice(1, 4).map(Number), prerelease: match[4] ? match[4].split(".") : [] };
};

/** SemVer prerelease identifiers: numeric ones numerically and below alphanumeric ones, which compare in ASCII order. */
const compareIdentifiers = (left: string, right: string): number => {
  const leftNumeric = NUMERIC_IDENTIFIER.test(left);
  const rightNumeric = NUMERIC_IDENTIFIER.test(right);
  if (leftNumeric && rightNumeric) return Number(left) - Number(right);
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left < right ? -1 : left > right ? 1 : 0;
};

/**
 * Orders two runtime versions by SemVer 2.0.0 precedence: negative when `left` is older, 0 when equal (build metadata
 * ignored). The core numbers first; then a version without a prerelease is higher than one with; then the prerelease
 * identifiers left to right, a longer set being higher when all shared ones are equal.
 */
export const compareRuntimeVersions = (left: string, right: string): number => {
  const a = parseRuntimeVersion(left);
  const b = parseRuntimeVersion(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = a.core[index]! - b.core[index]!;
    if (difference !== 0) return difference;
  }
  const aReleased = a.prerelease.length === 0;
  const bReleased = b.prerelease.length === 0;
  if (aReleased || bReleased) return Number(aReleased) - Number(bReleased);
  for (let index = 0; index < Math.min(a.prerelease.length, b.prerelease.length); index += 1) {
    const difference = compareIdentifiers(a.prerelease[index]!, b.prerelease[index]!);
    if (difference !== 0) return difference;
  }
  return a.prerelease.length - b.prerelease.length;
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
