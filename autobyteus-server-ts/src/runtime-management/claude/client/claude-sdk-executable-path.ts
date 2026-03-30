import { spawnSync } from "node:child_process";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const CLAUDE_EXECUTABLE_ENV_KEYS = [
  "CLAUDE_CODE_EXECUTABLE_PATH",
  "CLAUDE_CODE_PATH",
  "CLAUDE_CLI_PATH",
] as const;

let cachedDiscoveredClaudeExecutablePath: string | null | undefined = undefined;
const cachedClaudeExecutableProbeByCandidate = new Map<string, boolean>();
const warnedInvalidClaudeExecutableCandidates = new Set<string>();

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const discoverExecutablePath = (binaryName: string): string | null => {
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [binaryName], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) {
    return null;
  }

  const line = result.stdout
    .split(/\r?\n/u)
    .map((row) => row.trim())
    .find((row) => row.length > 0);
  return line ?? null;
};

const isUsableClaudeExecutablePath = (candidate: string): boolean => {
  const cached = cachedClaudeExecutableProbeByCandidate.get(candidate);
  if (cached !== undefined) {
    return cached;
  }

  let isUsable = false;
  try {
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      timeout: 3_000,
    });
    isUsable = result.status === 0;
  } catch {
    isUsable = false;
  }

  cachedClaudeExecutableProbeByCandidate.set(candidate, isUsable);
  return isUsable;
};

const resolveUsableClaudeExecutableCandidate = (candidate: string | null): string | null => {
  if (!candidate) {
    return null;
  }
  if (isUsableClaudeExecutablePath(candidate)) {
    return candidate;
  }
  if (!warnedInvalidClaudeExecutableCandidates.has(candidate)) {
    warnedInvalidClaudeExecutableCandidates.add(candidate);
    logger.warn(
      `Ignoring unusable Claude executable path '${candidate}'. Falling back to auto-discovery/default.`,
    );
  }
  return null;
};

const resolveDefaultClaudeExecutablePath = (): string => {
  if (cachedDiscoveredClaudeExecutablePath === undefined) {
    cachedDiscoveredClaudeExecutablePath = discoverExecutablePath("claude");
  }
  const discovered = resolveUsableClaudeExecutableCandidate(cachedDiscoveredClaudeExecutablePath);
  if (discovered) {
    return discovered;
  }
  return "claude";
};

export const resolveClaudeCodeExecutablePath = (): string => {
  for (const key of CLAUDE_EXECUTABLE_ENV_KEYS) {
    const value = resolveUsableClaudeExecutableCandidate(asString(process.env[key]));
    if (value) {
      return value;
    }
  }

  return resolveDefaultClaudeExecutablePath();
};
