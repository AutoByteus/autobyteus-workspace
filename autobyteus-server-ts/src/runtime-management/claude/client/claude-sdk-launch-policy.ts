import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import {
  ClaudeRuntimeAuthenticationError,
  type ClaudeRuntimeAuthentication,
} from "./claude-runtime-authentication-service.js";
import type { ClaudeSdkStderrCallback } from "./claude-sdk-client.js";

export type ClaudeSdkPreparedEnvironment = {
  env: Record<string, string>;
  redactionValues: string[];
};

export const buildClaudeSdkSpawnEnvironment = (
  authentication: ClaudeRuntimeAuthentication,
): ClaudeSdkPreparedEnvironment => {
  const appDataDir = appConfigProvider.config.getAppDataDir();
  const configuredCliHome = appConfigProvider.config.get("AUTOBYTEUS_CLAUDE_ACCOUNT_HOME")?.trim();
  if (authentication.kind === "cli" && configuredCliHome && !path.isAbsolute(configuredCliHome)) {
    throw new ClaudeRuntimeAuthenticationError("CLAUDE_CLI_ACCOUNT_HOME_INVALID");
  }
  const accountHome = authentication.kind === "cli"
    ? path.resolve(configuredCliHome || os.homedir())
    : path.join(appDataDir, "runtime", "claude-managed");
  if (authentication.kind === "cli") {
    try {
      if (!fs.statSync(accountHome).isDirectory()) throw new Error("not a directory");
    } catch {
      throw new ClaudeRuntimeAuthenticationError("CLAUDE_CLI_ACCOUNT_HOME_INVALID");
    }
  } else {
    fs.mkdirSync(accountHome, { recursive: true, mode: 0o700 });
  }
  const tempDirectory = authentication.kind === "cli"
    ? path.join(appDataDir, "runtime", "claude-cli-tmp")
    : path.join(accountHome, "tmp");
  fs.mkdirSync(tempDirectory, { recursive: true, mode: 0o700 });
  const env: Record<string, string> = {
    HOME: accountHome,
    CLAUDE_CONFIG_DIR: authentication.kind === "cli" ? path.join(accountHome, ".claude") : accountHome,
    TMPDIR: tempDirectory,
    PATH: [path.dirname(process.execPath), "/usr/local/bin", "/usr/bin", "/bin"].join(path.delimiter),
    LANG: "C.UTF-8",
  };
  if (authentication.kind === "cli") return { env, redactionValues: [] };

  const rawValue = authentication.apiKey.revealToTrustedConsumer();
  env.ANTHROPIC_API_KEY = rawValue;
  return {
    env,
    redactionValues: [rawValue, Buffer.from(rawValue).toString("base64")],
  };
};

export const wrapClaudeSdkStderr = (
  target: ClaudeSdkStderrCallback,
  redactionValues: string[],
): ClaudeSdkStderrCallback => (data) => {
  let redacted = data;
  for (const value of redactionValues) {
    if (value) redacted = redacted.split(value).join("[redacted]");
  }
  target(redacted);
};

export const requireExplicitAutoByteusMcpServers = (
  servers: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  if (!servers) return {};
  const entries = Object.entries(servers);
  if (entries.some(([name]) => name !== "autobyteus_agent_tools")) {
    throw new ClaudeRuntimeAuthenticationError("CLAUDE_RUNTIME_MCP_CONFIG_INVALID");
  }
  return Object.fromEntries(entries);
};
