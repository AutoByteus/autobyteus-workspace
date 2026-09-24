import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

export type ClaudeCliExecutableCandidate = {
  label: "path-claude" | "sdk-bundled-claude";
  executablePath: string;
  version: string;
};

const readVersion = (executablePath: string): string | null => {
  const result = spawnSync(executablePath, ["--version"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
  });
  return result.status === 0 ? result.stdout.trim() : null;
};

const resolvePathClaude = (): string | null => {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.split(/\r?\n/u).map((line) => line.trim()).find(Boolean) ?? null;
};

const resolveSdkBundledClaude = (): string | null => {
  try {
    const requireFromTest = createRequire(import.meta.url);
    const sdkEntry = requireFromTest.resolve("@anthropic-ai/claude-agent-sdk");
    const requireFromSdk = createRequire(sdkEntry);
    const platformPackageJson = requireFromSdk.resolve(
      `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}/package.json`,
    );
    return path.join(
      path.dirname(platformPackageJson),
      process.platform === "win32" ? "claude.exe" : "claude",
    );
  } catch {
    return null;
  }
};

/**
 * Claude CLI executables AutoByteus can launch: the operator's PATH `claude` and the
 * native CLI bundled with the pinned Claude Agent SDK. Unusable candidates are omitted.
 */
export const resolveClaudeCliExecutableCandidates = (): ClaudeCliExecutableCandidate[] => {
  const candidates: ClaudeCliExecutableCandidate[] = [];
  for (const [label, executablePath] of [
    ["path-claude", resolvePathClaude()],
    ["sdk-bundled-claude", resolveSdkBundledClaude()],
  ] as const) {
    if (!executablePath) {
      continue;
    }
    const version = readVersion(executablePath);
    if (version) {
      candidates.push({ label, executablePath, version });
    }
  }
  return candidates;
};

const INHERITED_CLAUDE_SESSION_ENV_PATTERN =
  /^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID$|CLAUDE_EFFORT$|CLAUDE_AGENT_SDK_VERSION$)/u;

/**
 * Process env without variables a parent Claude Code session injects into its children,
 * so a live test launched from inside Claude Code behaves like a standalone server process.
 */
export const buildStandaloneClaudeProcessEnv = (
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string | undefined> =>
  Object.fromEntries(
    Object.entries(env).filter(([key]) => !INHERITED_CLAUDE_SESSION_ENV_PATTERN.test(key)),
  );
