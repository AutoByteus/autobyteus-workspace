import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RuntimeKind } from "../../runtime-kind-enum.js";
import { resolveClaudeCodeExecutablePath } from "../../claude/client/claude-sdk-executable-path.js";
import { getClaudeSdkClient, type ClaudeSdkClient } from "../../claude/client/claude-sdk-client.js";
import { commandTimeout } from "../../read-deadline.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { runRuntimeCommand, SHORT_COMMAND_TIMEOUT_MS, type RuntimeCommandResult } from "../runtime-command-runner.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";
import { fetchRuntimeSource } from "../runtime-source-fetch.js";
import { parseClaudeUsageLimits } from "../usage-limits/claude-usage-limits.js";

const RELEASES_URL = "https://downloads.claude.ai/claude-code-releases";

/** The failure text application launch readiness has always shown after "Claude authentication is unavailable: ". */
const describeFailure = (result: RuntimeCommandResult): string =>
  result.error?.message
  ?? result.stderr.trim()
  ?? result.stdout.trim()
  ?? `exit code ${String(result.exitCode)}`;

/**
 * `loggedIn` from the status JSON: true/false when it says so; "absent" for a JSON object without a boolean
 * `loggedIn`; null when the output is not a JSON object.
 */
const readLoggedIn = (stdout: string): boolean | "absent" | null => {
  try {
    const payload = JSON.parse(stdout) as unknown;
    if (!payload || typeof payload !== "object") return null;
    const loggedIn = (payload as { loggedIn?: unknown }).loggedIn;
    return typeof loggedIn === "boolean" ? loggedIn : "absent";
  } catch {
    return null;
  }
};

/** The user's Claude update channel (`autoUpdatesChannel` in Claude's settings.json); `latest` by default. */
const readUpdateChannel = async (): Promise<"latest" | "stable"> => {
  const configDir = process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(os.homedir(), ".claude");
  try {
    const settings = JSON.parse(await readFile(path.join(configDir, "settings.json"), "utf8")) as {
      autoUpdatesChannel?: unknown;
    };
    return settings.autoUpdatesChannel === "stable" ? "stable" : "latest";
  } catch {
    return "latest";
  }
};

export const createClaudeAgentRuntimeStrategy = (dependencies: Readonly<{
  /** The Agent SDK client whose control query reads usage; the process-wide client by default. */
  claudeSdkClient?: Pick<ClaudeSdkClient, "readUsage">;
}> = {}): AgentRuntimeStrategy => ({
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  // Anthropic does not allow third-party products to offer claude.ai login without approval (UD-006).
  signInRoute: "commandLine",
  installInstructionsUrl: "https://code.claude.com/docs/en/setup",
  resolveExecutable: resolveClaudeCodeExecutablePath,
  readVersion: readRuntimeVersion,
  async readLatestVersion() {
    const version = extractRuntimeVersion(await fetchRuntimeSource(`${RELEASES_URL}/${await readUpdateChannel()}`));
    if (!version) throw new Error("Claude release source has no version.");
    return version;
  },
  /**
   * `claude auth status --json`. Signed out prints `{"loggedIn": false, …}` and exits 1, so the JSON is read whatever
   * the exit code. Without JSON, the plain-text "logged in" fallback application readiness has always accepted.
   */
  async readSignIn(executable, _cwd, options = {}): Promise<SignInReading> {
    const result = await runRuntimeCommand(
      executable, ["auth", "status", "--json"], commandTimeout(options.deadline, SHORT_COMMAND_TIMEOUT_MS));
    const loggedIn = readLoggedIn(result.stdout);
    if (loggedIn === true) return { state: "signedIn" };
    if (loggedIn === false || (loggedIn === "absent" && result.exitCode === 0)) {
      return { state: "signedOut", detail: describeFailure(result) };
    }
    return result.exitCode === 0 && /\blogged\s+in\b/i.test(`${result.stdout}\n${result.stderr}`)
      ? { state: "signedIn" }
      : { state: "unknown", detail: describeFailure(result) };
  },
  /** The Agent SDK's `get_usage` control request on a query that sends no message (0 tokens). */
  readUsageLimits: async (_executable, _cwd, { deadline }) =>
    parseClaudeUsageLimits(await (dependencies.claudeSdkClient ?? getClaudeSdkClient()).readUsage({ deadline })),
  updateArgv: (executable) => [executable, "update"],
});
