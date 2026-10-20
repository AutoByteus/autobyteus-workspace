import { RuntimeKind } from "../../runtime-kind-enum.js";
import type { CodexAppServerClientManager } from "../../codex/client/codex-app-server-client-manager.js";
import { resolveLaunchCommand } from "../../codex/client/codex-app-server-launch-config.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";
import { fetchRuntimeSource } from "../runtime-source-fetch.js";

const LATEST_RELEASE_URL = "https://api.github.com/repos/openai/codex/releases/latest";

export const createCodexAgentRuntimeStrategy = (dependencies: Readonly<{
  codexClientManager: Pick<CodexAppServerClientManager, "beginAcquire">;
}>): AgentRuntimeStrategy => ({
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  signInRoute: "browser",
  installInstructionsUrl: "https://learn.chatgpt.com/docs/codex/cli",
  resolveExecutable: resolveLaunchCommand,
  readVersion: readRuntimeVersion,
  async readLatestVersion() {
    const release = JSON.parse(await fetchRuntimeSource(LATEST_RELEASE_URL, {
      Accept: "application/vnd.github+json",
    })) as { tag_name?: unknown };
    // Tags look like "rust-v0.163.0".
    const version = typeof release.tag_name === "string" ? extractRuntimeVersion(release.tag_name) : null;
    if (!version) throw new Error("Codex release has no version.");
    return version;
  },
  /** Codex's own `account/read` through the app-server; the rule application launch readiness has always used. */
  async readSignIn(_executable, cwd): Promise<SignInReading> {
    try {
      const lease = dependencies.codexClientManager.beginAcquire(cwd);
      try {
        const client = await lease.acquire();
        const response = await client.request<{ account?: unknown; requiresOpenaiAuth?: unknown }>(
          "account/read",
          { refreshToken: false },
        );
        if (response.account != null) return { state: "signedIn" };
        if (response.requiresOpenaiAuth !== true) return { state: "notRequired" };
        return { state: "signedOut", detail: "no logged-in account." };
      } finally {
        await lease.release();
      }
    } catch (error) {
      return { state: "unknown", detail: error instanceof Error ? error.message : String(error) };
    }
  },
  updateArgv: (executable) => [executable, "update"],
  signInArgv: (executable) => [executable, "login"],
});
