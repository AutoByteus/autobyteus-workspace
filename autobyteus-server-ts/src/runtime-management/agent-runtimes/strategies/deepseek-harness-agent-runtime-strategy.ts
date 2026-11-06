import { RuntimeKind } from "../../runtime-kind-enum.js";
import {
  DEEPSEEK_HARNESS_INSTALL_URL,
  DEEPSEEK_HARNESS_NPM_PACKAGE,
  deepSeekHarnessCommand,
} from "../../deepseek-harness/deepseek-harness-identity.js";
import { createDeepSeekProviderRelay, providerRelayKeyMissingText } from "../../../credential-proxy/provider-relays/provider-relays.js";
import { getSecretVaultRuntime } from "../../../secret-management/secret-vault-runtime.js";
import type { SecretManagementService } from "../../../secret-management/services/secret-management-service.js";
import type { AgentRuntimeStrategy } from "../agent-runtime-strategy.js";
import type { SignInReading } from "../agent-runtime-sign-in-reader.js";
import { runRuntimeCommand } from "../runtime-command-runner.js";
import { extractRuntimeVersion, readRuntimeVersion } from "../runtime-version.js";

/** `npm view` asks the npm registry, so it gets longer than a local `--version`. */
const NETWORK_COMMAND_TIMEOUT_MS = 15_000;

/**
 * DeepSeek Harness: installed and updated with npm; "signed in" means the AutoByteus vault holds the DeepSeek key that
 * the credential proxy adds to dsh's model calls (DEC-018), set in Settings → API Keys. dsh reports no usage limits.
 */
export const createDeepSeekHarnessAgentRuntimeStrategy = (dependencies: Readonly<{
  management?: () => Pick<SecretManagementService, "getStatusForConsumer">;
}> = {}): AgentRuntimeStrategy => {
  const relay = createDeepSeekProviderRelay();
  const management = dependencies.management ?? (() => getSecretVaultRuntime().requireService());
  return {
    runtimeKind: RuntimeKind.DEEPSEEK_HARNESS,
    signInRoute: "apiKeySetting",
    installInstructionsUrl: DEEPSEEK_HARNESS_INSTALL_URL,
    resolveExecutable: deepSeekHarnessCommand,
    readVersion: readRuntimeVersion,
    /** The npm registry's current version of the package. */
    async readLatestVersion() {
      const result = await runRuntimeCommand("npm", ["view", DEEPSEEK_HARNESS_NPM_PACKAGE, "version"], NETWORK_COMMAND_TIMEOUT_MS);
      const version = result.exitCode === 0 ? extractRuntimeVersion(result.stdout) : null;
      if (!version) throw new Error(`npm view ${DEEPSEEK_HARNESS_NPM_PACKAGE} gave no version.`);
      return version;
    },
    /** The vault's value-free status of the DeepSeek key. */
    async readSignIn(): Promise<SignInReading> {
      try {
        return await management().getStatusForConsumer(relay.consumer) === "CONFIGURED"
          ? { state: "signedIn" }
          : { state: "signedOut", detail: providerRelayKeyMissingText(relay) };
      } catch (error) {
        return { state: "unknown", detail: error instanceof Error ? error.message : String(error) };
      }
    },
    readUsageLimits: async () => Object.freeze({ state: "not_reported" as const }),
    updateArgv: () => ["npm", "install", "-g", `${DEEPSEEK_HARNESS_NPM_PACKAGE}@latest`],
  };
};
