import { RuntimeKind } from "../../runtime-kind-enum.js";
import type { CodexAppServerClientManager } from "../../codex/client/codex-app-server-client-manager.js";
import type { CodexAppServerClient } from "../../codex/client/codex-app-server-client.js";
import { raceDeadline, type ReadDeadline } from "../../read-deadline.js";
import { resolveLaunchCommand } from "../../codex/client/codex-app-server-launch-config.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";
import { GitHubRepositoryClient } from "../../../integrations/github/github-repository-client.js";
import { parseCodexUsageLimits } from "../usage-limits/codex-usage-limits.js";

type CodexClientLeases = Pick<CodexAppServerClientManager, "beginAcquire">;

/**
 * One request on the app-server for `cwd`, under a lease released as soon as the request settles or the deadline
 * passes (an abandoned request's late answer is ignored).
 */
const withCodexClient = async <T>(
  leases: CodexClientLeases,
  cwd: string,
  deadline: ReadDeadline | undefined,
  use: (client: CodexAppServerClient) => Promise<T>,
): Promise<T> => {
  const lease = leases.beginAcquire(cwd);
  try {
    const client = await raceDeadline(lease.acquire(), deadline);
    return await raceDeadline(use(client), deadline);
  } finally {
    await lease.release();
  }
};

export const createCodexAgentRuntimeStrategy = (dependencies: Readonly<{
  codexClientManager: Pick<CodexAppServerClientManager, "beginAcquire">;
  /** Codex's releases on GitHub, read through the GitHub transport and its gate (no REST quota). */
  githubClient?: Pick<GitHubRepositoryClient, "fetchLatestReleaseTag">;
}>): AgentRuntimeStrategy => ({
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  signInRoute: "browser",
  installInstructionsUrl: "https://learn.chatgpt.com/docs/codex/cli",
  resolveExecutable: resolveLaunchCommand,
  readVersion: readRuntimeVersion,
  async readLatestVersion() {
    const tag = await (dependencies.githubClient ?? new GitHubRepositoryClient()).fetchLatestReleaseTag("openai", "codex");
    // Tags look like "rust-v0.163.0".
    const version = extractRuntimeVersion(tag);
    if (!version) throw new Error("Codex release has no version.");
    return version;
  },
  /** Codex's own `account/read` through the app-server; the rule application launch readiness has always used. */
  async readSignIn(_executable, cwd, options = {}): Promise<SignInReading> {
    try {
      const response = await withCodexClient(dependencies.codexClientManager, cwd, options.deadline, (client) =>
        client.request<{ account?: unknown; requiresOpenaiAuth?: unknown }>("account/read", { refreshToken: false }));
      if (response.account != null) return { state: "signedIn" };
      if (response.requiresOpenaiAuth !== true) return { state: "notRequired" };
      return { state: "signedOut", detail: "no logged-in account." };
    } catch (error) {
      return { state: "unknown", detail: error instanceof Error ? error.message : String(error) };
    }
  },
  /** Codex's own `account/rateLimits/read` through the app-server (0 tokens). */
  readUsageLimits: async (_executable, cwd, { deadline }) =>
    parseCodexUsageLimits(await withCodexClient(dependencies.codexClientManager, cwd, deadline, (client) =>
      client.request<unknown>("account/rateLimits/read", {}))),
  /**
   * A lease taken without `acquire()`: the app-server generation for `cwd` stays open while the steps' own leases come
   * and go, and closes when the hold is released. Null when that generation is closing now (`beginAcquire` refuses).
   */
  holdClient(cwd) {
    try {
      const lease = dependencies.codexClientManager.beginAcquire(cwd);
      return { release: () => lease.release() };
    } catch {
      return null;
    }
  },
  updateArgv: (executable) => [executable, "update"],
  signInArgv: (executable) => [executable, "login"],
});
