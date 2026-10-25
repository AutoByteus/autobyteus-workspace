import { RuntimeKind } from "../../runtime-kind-enum.js";
import {
  antigravityCommand, listAntigravityModels, toAgyDiscoveryDiagnostic,
} from "../../antigravity-cli-capability.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";
import { fetchRuntimeSource } from "../runtime-source-fetch.js";
import { commandTimeout } from "../../read-deadline.js";
import { runRuntimeCommand } from "../runtime-command-runner.js";
import { parseAntigravityUsageLimits } from "../usage-limits/antigravity-usage-limits.js";
import { readUsageLimitsSafely } from "../usage-limits/usage-limits-reading.js";

const MANIFEST_BASE_URL = "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests";
const MANIFEST_OS: Readonly<Partial<Record<NodeJS.Platform, string>>> = { darwin: "darwin", linux: "linux", win32: "windows" };
const MANIFEST_ARCH: Readonly<Partial<Record<string, string>>> = { x64: "amd64", arm64: "arm64" };
/** `agy -p "/usage"` asks Google's servers (2.7 s measured). */
const USAGE_TIMEOUT_MS = 15_000;

/** The updater manifest `agy` itself reads for this OS and CPU (E-R20, E-A08). */
export const antigravityManifestUrl = (platform: NodeJS.Platform, arch: string): string | null => {
  const osName = MANIFEST_OS[platform];
  const archName = MANIFEST_ARCH[arch];
  return osName && archName ? `${MANIFEST_BASE_URL}/${osName}_${archName}.json` : null;
};

export const createAntigravityAgentRuntimeStrategy = (): AgentRuntimeStrategy => ({
  runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
  // `agy` has no login command; the user signs in from its command line (UD-008).
  signInRoute: "commandLine",
  installInstructionsUrl: "https://antigravity.google/docs/getting-started?tab=cli",
  resolveExecutable: antigravityCommand,
  // Fresh each time; the execution-side `readAntigravityCliVersion()` caches for the server's life (AR-002).
  readVersion: readRuntimeVersion,
  async readLatestVersion() {
    const url = antigravityManifestUrl(process.platform, process.arch);
    if (!url) throw new Error(`No Antigravity manifest for ${process.platform}/${process.arch}.`);
    const manifest = JSON.parse(await fetchRuntimeSource(url)) as { version?: unknown };
    const version = typeof manifest.version === "string" ? extractRuntimeVersion(manifest.version) : null;
    if (!version) throw new Error("Antigravity manifest has no version.");
    return version;
  },
  /** `agy models` through model discovery, which already classifies the signed-out answer. */
  async readSignIn(_executable, _cwd, options = {}): Promise<SignInReading> {
    try {
      await listAntigravityModels(options);
      return { state: "signedIn" };
    } catch (error) {
      const diagnostic = toAgyDiscoveryDiagnostic(error);
      return diagnostic.code === "AGY_SIGN_IN_REQUIRED"
        ? { state: "signedOut", detail: diagnostic.message }
        : { state: "unknown", detail: diagnostic.message };
    }
  },
  /** `agy -p "/usage" --output-format json`: the CLI's own usage command, answered without a model turn (0 tokens). */
  readUsageLimits: (executable, _cwd, { deadline }) => readUsageLimitsSafely("Antigravity", deadline, async () => {
    const result = await runRuntimeCommand(
      executable, ["-p", "/usage", "--output-format", "json"], commandTimeout(deadline, USAGE_TIMEOUT_MS));
    if (result.error || result.exitCode !== 0) throw new Error("agy /usage failed.");
    return parseAntigravityUsageLimits(result.stdout);
  }),
  updateArgv: (executable) => [executable, "update"],
});
