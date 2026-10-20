import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RuntimeKind } from "../../runtime-kind-enum.js";
import { resolveClaudeCodeExecutablePath } from "../../claude/client/claude-sdk-executable-path.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { runRuntimeCommand, type RuntimeCommandResult } from "../runtime-command-runner.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";
import { fetchRuntimeSource } from "../runtime-source-fetch.js";

const RELEASES_URL = "https://downloads.claude.ai/claude-code-releases";

/** The failure text application launch readiness has always shown after "Claude authentication is unavailable: ". */
const describeFailure = (result: RuntimeCommandResult): string =>
  result.error?.message
  ?? result.stderr.trim()
  ?? result.stdout.trim()
  ?? `exit code ${String(result.exitCode)}`;

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

export const createClaudeAgentRuntimeStrategy = (): AgentRuntimeStrategy => ({
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
  /** `claude auth status --json`, with the plain-text "logged in" fallback application readiness has always accepted. */
  async readSignIn(executable): Promise<SignInReading> {
    const result = await runRuntimeCommand(executable, ["auth", "status", "--json"]);
    if (result.exitCode !== 0) return { state: "unknown", detail: describeFailure(result) };
    try {
      const payload = JSON.parse(result.stdout) as { loggedIn?: unknown };
      return payload.loggedIn === true
        ? { state: "signedIn" }
        : { state: "signedOut", detail: describeFailure(result) };
    } catch {
      return /\blogged\s+in\b/i.test(`${result.stdout}\n${result.stderr}`)
        ? { state: "signedIn" }
        : { state: "unknown", detail: describeFailure(result) };
    }
  },
  updateArgv: (executable) => [executable, "update"],
});
