import fs from "node:fs";

export const EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL =
  "autobyteus.embedded-server.platform-fatal.v1";

export type EmbeddedServerPlatformFatalCode =
  | "APP_CONFIG_INITIALIZATION_FAILED"
  | "RUNTIME_LOGGING_INITIALIZATION_FAILED"
  | "DATABASE_MIGRATION_FAILED"
  | "APPLICATION_DATABASE_INITIALIZATION_FAILED"
  | "TOKEN_USAGE_CURRENT_SCHEMA_INVALID"
  | "SECRET_VAULT_INITIALIZATION_FAILED"
  | "APP_DATA_STARTUP_GATE_FAILED"
  | "BUILT_IN_AGENTS_BOOTSTRAP_FAILED"
  | "HTTP_SERVER_INITIALIZATION_FAILED"
  | "TEMP_WORKSPACE_INITIALIZATION_FAILED"
  | "APPLICATION_ORCHESTRATION_RECOVERY_FAILED"
  | "UNEXPECTED_SERVER_STARTUP_FAILURE";

export type EmbeddedServerPlatformFatal = Readonly<{
  protocol: typeof EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL;
  code: EmbeddedServerPlatformFatalCode;
  summary: string;
  logPath: string | null;
}>;

const oneLineSummary = (value: string): string => {
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || "The embedded server could not initialize.").slice(0, 2_000);
};

export const formatEmbeddedServerPlatformFatalLine = (input: {
  code: EmbeddedServerPlatformFatalCode;
  summary: string;
  logPath?: string | null;
}): string => JSON.stringify({
  protocol: EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL,
  code: input.code,
  summary: oneLineSummary(input.summary),
  logPath: input.logPath?.trim() || null,
} satisfies EmbeddedServerPlatformFatal);

/** Emits the fixed platform-startup fatal record before terminating the server process. */
export const exitWithEmbeddedServerPlatformFatal = (input: {
  code: EmbeddedServerPlatformFatalCode;
  summary: string;
  logPath?: string | null;
}): never => {
  const line = `${formatEmbeddedServerPlatformFatalLine(input)}\n`;
  try {
    fs.writeSync(process.stderr.fd, line, null, "utf8");
  } catch {
    // The ordinary logger already received the same summary. Preserve the nonzero exit.
  }
  process.exit(1);
};
