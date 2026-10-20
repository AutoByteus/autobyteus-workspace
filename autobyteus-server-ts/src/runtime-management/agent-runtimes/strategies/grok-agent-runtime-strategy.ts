import { RuntimeKind } from "../../runtime-kind-enum.js";
import { grokBuildCommand } from "../../grok/grok-build-launch-profile.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { runRuntimeCommand } from "../runtime-command-runner.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";

/** `grok models` and `grok update --check` ask xAI's servers, so they get longer than a local `--version`. */
const NETWORK_COMMAND_TIMEOUT_MS = 15_000;
const SIGNED_OUT_ANSWER = "You are not authenticated.";

export const createGrokAgentRuntimeStrategy = (): AgentRuntimeStrategy => ({
  runtimeKind: RuntimeKind.GROK_BUILD,
  signInRoute: "browser",
  installInstructionsUrl: "https://docs.x.ai/build/overview",
  resolveExecutable: grokBuildCommand,
  readVersion: readRuntimeVersion,
  /** Grok's own check-only answer: `grok update --check --json`. */
  async readLatestVersion(executable) {
    const result = await runRuntimeCommand(executable, ["update", "--check", "--json"], NETWORK_COMMAND_TIMEOUT_MS);
    if (result.exitCode !== 0) throw new Error("grok update --check failed.");
    const answer = JSON.parse(result.stdout) as { latestVersion?: unknown; error?: unknown };
    const version = answer.error == null && typeof answer.latestVersion === "string"
      ? extractRuntimeVersion(answer.latestVersion)
      : null;
    if (!version) throw new Error("grok update --check gave no latest version.");
    return version;
  },
  /** `grok models` prints "You are not authenticated." (exit 0) when signed out. */
  async readSignIn(executable): Promise<SignInReading> {
    const result = await runRuntimeCommand(executable, ["models"], NETWORK_COMMAND_TIMEOUT_MS);
    if (`${result.stdout}\n${result.stderr}`.includes(SIGNED_OUT_ANSWER)) {
      return { state: "signedOut", detail: SIGNED_OUT_ANSWER };
    }
    if (result.exitCode === 0) return { state: "signedIn" };
    return { state: "unknown", detail: result.error?.message ?? `grok models exited with ${String(result.exitCode)}.` };
  },
  updateArgv: (executable) => [executable, "update"],
  signInArgv: (executable) => [executable, "login", "--oauth"],
});
