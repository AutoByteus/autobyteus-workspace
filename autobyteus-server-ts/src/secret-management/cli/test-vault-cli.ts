import path from "node:path";
import { pathToFileURL } from "node:url";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { LocalEnvironmentSecretImportError } from "../provisioning/local-environment-secret-import.js";
import {
  TestVaultCommands,
  type TestVaultCommandContext,
  type TestVaultRemoveResult,
  type TestVaultSetupResult,
  type TestVaultStatus,
} from "../test-vault/test-vault-commands.js";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";

export type TestVaultCliCommand =
  | Readonly<{ command: "setup"; sourcePath: string; replace: boolean }>
  | Readonly<{ command: "status" }>
  | Readonly<{ command: "remove" }>;

export class TestVaultCliUsageError extends Error {
  constructor() {
    super("TEST_VAULT_USAGE: pnpm test-vault setup --source <absolute file> [--replace] | status | remove");
    this.name = "TestVaultCliUsageError";
  }
}

export const parseTestVaultArguments = (args: readonly string[]): TestVaultCliCommand => {
  const normalized = args[0] === "--" ? args.slice(1) : [...args];
  const [command, ...options] = normalized;
  if ((command === "status" || command === "remove") && options.length === 0) return { command };
  if (command !== "setup") throw new TestVaultCliUsageError();
  let sourcePath: string | null = null;
  let replace = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--replace" && !replace) {
      replace = true;
    } else if (option === "--source" && sourcePath === null) {
      const value = options[index + 1];
      if (!value || value.startsWith("--")) throw new TestVaultCliUsageError();
      sourcePath = value;
      index += 1;
    } else {
      throw new TestVaultCliUsageError();
    }
  }
  if (!sourcePath || !path.isAbsolute(sourcePath)) throw new TestVaultCliUsageError();
  return { command, sourcePath, replace };
};

const settingLine = (directory: string): string => `SETTING ${TEST_VAULT_SETTING_NAME}=${directory}`;

export const formatTestVaultSetup = (result: TestVaultSetupResult): string => [
  `TEST_VAULT ${result.location.directory}`,
  ...result.import.secretIds.map((id) => `SECRET ${String(id)}`),
  `CONFIGURED ${result.import.configuredCount}`,
  `SKIPPED ${result.import.skippedCount}`,
  `REPLACED ${result.import.replacedCount}`,
  settingLine(result.location.directory),
].join("\n") + "\n";

export const formatTestVaultStatus = (
  status: TestVaultStatus,
  context: TestVaultCommandContext,
): string => [
  `TEST_VAULT ${status.location.directory}`,
  `STATE ${status.state}`,
  ...(status.reason ? [`REASON ${status.reason}`] : []),
  ...status.configured.map((id) => `CONFIGURED ${String(id)}`),
  ...status.missing.map((id) => `MISSING ${String(id)}`),
  context.setting?.trim()
    ? `SELECTED ${TEST_VAULT_SETTING_NAME} is set`
    : `NOT_SELECTED set ${TEST_VAULT_SETTING_NAME}=${status.location.directory} for live tests`,
].join("\n") + "\n";

export const formatTestVaultRemove = (result: TestVaultRemoveResult): string => [
  `TEST_VAULT ${result.location.directory}`,
  ...(result.removed.length > 0 ? result.removed.map((file) => `REMOVED ${file}`) : ["REMOVED NONE"]),
].join("\n") + "\n";

/** Value-free failure line: error codes and locations only. */
export const formatTestVaultFailure = (error: unknown): string => {
  if (error instanceof TestVaultCliUsageError || error instanceof SecretVaultError) {
    return `TEST_VAULT_FAILED ${error.message}\n`;
  }
  if (error instanceof LocalEnvironmentSecretImportError) {
    return `TEST_VAULT_FAILED ${error.code}\n`;
  }
  return "TEST_VAULT_FAILED TEST_VAULT_COMMAND_FAILED\n";
};

export const runTestVaultCli = async (
  args: readonly string[],
  context: TestVaultCommandContext,
  commands = new TestVaultCommands(),
): Promise<string> => {
  const parsed = parseTestVaultArguments(args);
  switch (parsed.command) {
    case "setup":
      return formatTestVaultSetup(
        await commands.setup({ sourcePath: parsed.sourcePath, replace: parsed.replace }, context),
      );
    case "status":
      return formatTestVaultStatus(await commands.status(context), context);
    case "remove":
      return formatTestVaultRemove(await commands.remove(context));
  }
};

const main = async (): Promise<void> => {
  try {
    process.stdout.write(await runTestVaultCli(process.argv.slice(2), {
      setting: process.env[TEST_VAULT_SETTING_NAME],
    }));
  } catch (error) {
    process.stderr.write(formatTestVaultFailure(error));
    process.exitCode = 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();
